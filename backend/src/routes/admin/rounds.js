import { Router } from 'express';
import { db } from '../../db/index.js';
import { rounds, tasks, teamRounds } from '../../db/schema.js';
import { eq, and, sql } from 'drizzle-orm';
import { validate } from '../../middleware/validate.js';
import { NotFoundError, BadRequestError } from '../../utils/errors.js';
import { calculateQualification } from '../../services/qualification.js';
import { z } from 'zod';

const router = Router();

const createRoundSchema = z.object({
  eventId: z.number().int().positive(),
  name: z.string().min(1, 'Round name is required').max(255),
  roundNumber: z.number().int().positive(),
  description: z.string().optional(),
  qualifyCount: z.number().int().positive().optional(),
  qualifyBy: z.enum(['score', 'tasks_completed', 'time', 'combined']).optional().default('score'),
  timeLimit: z.number().int().positive().optional(),
});

const updateRoundSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  qualifyCount: z.number().int().positive().nullable().optional(),
  qualifyBy: z.enum(['score', 'tasks_completed', 'time', 'combined']).optional(),
  timeLimit: z.number().int().positive().nullable().optional(),
  status: z.enum(['pending', 'active', 'paused', 'completed']).optional(),
});

// GET /api/admin/rounds
router.get('/', async (req, res, next) => {
  try {
    const eventId = req.query.eventId ? parseInt(req.query.eventId) : null;
    
    let roundList;
    if (eventId) {
      roundList = await db.select().from(rounds).where(eq(rounds.eventId, eventId)).orderBy(rounds.roundNumber);
    } else {
      roundList = await db.select().from(rounds).orderBy(rounds.roundNumber);
    }

    // Add task count for each round
    const enriched = await Promise.all(roundList.map(async (round) => {
      const [taskCount] = await db.select({ count: sql`count(*)` }).from(tasks).where(eq(tasks.roundId, round.id));
      return { ...round, taskCount: parseInt(taskCount.count) };
    }));

    res.json({ success: true, data: enriched });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/rounds/:id
router.get('/:id', async (req, res, next) => {
  try {
    const [round] = await db.select().from(rounds).where(eq(rounds.id, parseInt(req.params.id)));
    if (!round) throw new NotFoundError('Round not found.');

    const taskList = await db.select().from(tasks).where(eq(tasks.roundId, round.id)).orderBy(tasks.taskOrder);

    res.json({ success: true, data: { round, tasks: taskList } });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/rounds
router.post('/', validate(createRoundSchema), async (req, res, next) => {
  try {
    const data = req.validatedBody;

    // Check duplicate round number
    const [existing] = await db.select().from(rounds)
      .where(and(eq(rounds.eventId, data.eventId), eq(rounds.roundNumber, data.roundNumber)));
    if (existing) throw new BadRequestError(`Round ${data.roundNumber} already exists for this event.`);

    const [newRound] = await db.insert(rounds).values(data).returning();
    res.status(201).json({ success: true, data: newRound });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/rounds/:id
router.patch('/:id', validate(updateRoundSchema), async (req, res, next) => {
  try {
    const updates = { ...req.validatedBody, updatedAt: new Date() };

    if (updates.status === 'active') {
      updates.startedAt = new Date();
    } else if (updates.status === 'completed') {
      updates.endedAt = new Date();
    }

    const [updated] = await db.update(rounds)
      .set(updates)
      .where(eq(rounds.id, parseInt(req.params.id)))
      .returning();

    if (!updated) throw new NotFoundError('Round not found.');

    // If round completed, calculate qualification
    if (updates.status === 'completed') {
      await calculateQualification(updated.id);
    }

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/rounds/:id/start
router.post('/:id/start', async (req, res, next) => {
  try {
    const [updated] = await db.update(rounds)
      .set({ status: 'active', startedAt: new Date(), updatedAt: new Date() })
      .where(eq(rounds.id, parseInt(req.params.id)))
      .returning();

    if (!updated) throw new NotFoundError('Round not found.');
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/rounds/:id/pause
router.post('/:id/pause', async (req, res, next) => {
  try {
    const [updated] = await db.update(rounds)
      .set({ status: 'paused', updatedAt: new Date() })
      .where(eq(rounds.id, parseInt(req.params.id)))
      .returning();

    if (!updated) throw new NotFoundError('Round not found.');
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/rounds/:id/end
router.post('/:id/end', async (req, res, next) => {
  try {
    const [updated] = await db.update(rounds)
      .set({ status: 'completed', endedAt: new Date(), updatedAt: new Date() })
      .where(eq(rounds.id, parseInt(req.params.id)))
      .returning();

    if (!updated) throw new NotFoundError('Round not found.');

    // Calculate qualification
    const qualificationResults = await calculateQualification(updated.id);

    res.json({ success: true, data: { round: updated, qualification: qualificationResults } });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/admin/rounds/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const [deleted] = await db.delete(rounds)
      .where(eq(rounds.id, parseInt(req.params.id)))
      .returning({ id: rounds.id });

    if (!deleted) throw new NotFoundError('Round not found.');
    res.json({ success: true, message: 'Round deleted.' });
  } catch (err) {
    next(err);
  }
});

export default router;
