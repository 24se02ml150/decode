import { Router } from 'express';
import { db } from '../../db/index.js';
import { events, rounds, tasks, users, teamRounds, teamTasks, locations, qrCodes } from '../../db/schema.js';
import { eq, and, sql } from 'drizzle-orm';
import { validate } from '../../middleware/validate.js';
import { BadRequestError, NotFoundError } from '../../utils/errors.js';
import { z } from 'zod';

const router = Router();

const createEventSchema = z.object({
  name: z.string().min(1, 'Event name is required').max(255),
  description: z.string().optional(),
});

const updateEventSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  status: z.enum(['draft', 'active', 'paused', 'completed']).optional(),
});

// GET /api/admin/events
router.get('/', async (req, res, next) => {
  try {
    const eventList = await db.select().from(events).orderBy(events.createdAt);
    res.json({ success: true, data: eventList });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/events/:id
router.get('/:id', async (req, res, next) => {
  try {
    const [event] = await db.select().from(events).where(eq(events.id, parseInt(req.params.id)));
    if (!event) throw new NotFoundError('Event not found.');

    // Get rounds
    const roundList = await db.select().from(rounds).where(eq(rounds.eventId, event.id)).orderBy(rounds.roundNumber);

    res.json({ success: true, data: { event, rounds: roundList } });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/events
router.post('/', validate(createEventSchema), async (req, res, next) => {
  try {
    const { name, description } = req.validatedBody;

    const [newEvent] = await db.insert(events).values({
      name,
      description,
    }).returning();

    res.status(201).json({ success: true, data: newEvent });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/events/:id
router.patch('/:id', validate(updateEventSchema), async (req, res, next) => {
  try {
    const updates = { ...req.validatedBody, updatedAt: new Date() };
    
    if (updates.status === 'active') {
      updates.startedAt = new Date();
    } else if (updates.status === 'completed') {
      updates.endedAt = new Date();
    }

    const [updated] = await db.update(events)
      .set(updates)
      .where(eq(events.id, parseInt(req.params.id)))
      .returning();

    if (!updated) throw new NotFoundError('Event not found.');

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/events/:id/start
router.post('/:id/start', async (req, res, next) => {
  try {
    const [updated] = await db.update(events)
      .set({ status: 'active', startedAt: new Date(), updatedAt: new Date() })
      .where(eq(events.id, parseInt(req.params.id)))
      .returning();

    if (!updated) throw new NotFoundError('Event not found.');
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/events/:id/pause
router.post('/:id/pause', async (req, res, next) => {
  try {
    const [updated] = await db.update(events)
      .set({ status: 'paused', updatedAt: new Date() })
      .where(eq(events.id, parseInt(req.params.id)))
      .returning();

    if (!updated) throw new NotFoundError('Event not found.');
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/events/:id/resume
router.post('/:id/resume', async (req, res, next) => {
  try {
    const [updated] = await db.update(events)
      .set({ status: 'active', updatedAt: new Date() })
      .where(eq(events.id, parseInt(req.params.id)))
      .returning();

    if (!updated) throw new NotFoundError('Event not found.');
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/events/:id/end
router.post('/:id/end', async (req, res, next) => {
  try {
    const [updated] = await db.update(events)
      .set({ status: 'completed', endedAt: new Date(), updatedAt: new Date() })
      .where(eq(events.id, parseInt(req.params.id)))
      .returning();

    if (!updated) throw new NotFoundError('Event not found.');
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/events/:id/validate - Pre-event validation
router.get('/:id/validate', async (req, res, next) => {
  try {
    const eventId = parseInt(req.params.id);
    const issues = [];

    // Check rounds exist
    const roundList = await db.select().from(rounds).where(eq(rounds.eventId, eventId));
    if (roundList.length === 0) issues.push('No rounds created.');

    for (const round of roundList) {
      // Check tasks in each round
      const taskList = await db.select().from(tasks).where(eq(tasks.roundId, round.id));
      if (taskList.length === 0) {
        issues.push(`Round ${round.roundNumber} (${round.name}) has no tasks.`);
      }

      for (const task of taskList) {
        if (!task.question) issues.push(`Round ${round.roundNumber}, Task ${task.taskOrder}: missing question.`);
        if (!task.correctAnswer) issues.push(`Round ${round.roundNumber}, Task ${task.taskOrder}: missing answer.`);
        
        // Check QR code
        const [qr] = await db.select().from(qrCodes).where(eq(qrCodes.taskId, task.id));
        if (!qr) issues.push(`Round ${round.roundNumber}, Task ${task.taskOrder}: missing QR code.`);
      }

      // Check qualification rule
      if (!round.qualifyCount && round.roundNumber < roundList.length) {
        issues.push(`Round ${round.roundNumber} (${round.name}): no qualification count set.`);
      }
    }

    // Check teams exist
    const [teamCount] = await db.select({ count: sql`count(*)` }).from(users).where(eq(users.role, 'team'));
    if (parseInt(teamCount.count) === 0) issues.push('No teams created.');

    // Check locations
    const [locCount] = await db.select({ count: sql`count(*)` }).from(locations).where(eq(locations.eventId, eventId));
    if (parseInt(locCount.count) === 0) issues.push('No locations created.');

    res.json({
      success: true,
      data: {
        isValid: issues.length === 0,
        issues,
        summary: {
          rounds: roundList.length,
          teams: parseInt(teamCount.count),
          locations: parseInt(locCount.count),
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
