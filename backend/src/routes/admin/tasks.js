import { Router } from 'express';
import { db } from '../../db/index.js';
import { tasks, qrCodes, locations, rounds } from '../../db/schema.js';
import { eq, and, sql } from 'drizzle-orm';
import { validate } from '../../middleware/validate.js';
import { NotFoundError, BadRequestError } from '../../utils/errors.js';
import { generateSecureToken } from '../../utils/helpers.js';
import QRCode from 'qrcode';
import { z } from 'zod';

const router = Router();

const createTaskSchema = z.object({
  roundId: z.number().int().positive(),
  locationId: z.number().int().positive().nullable().optional(),
  title: z.string().max(255).optional(),
  taskOrder: z.number().int().positive(),
  question: z.string().min(1, 'Question is required'),
  correctAnswer: z.string().min(1, 'Correct answer is required'),
  caseSensitive: z.boolean().optional().default(false),
  locationHint: z.string().optional(),
  points: z.number().int().positive().optional().default(10),
  maxAttempts: z.number().int().positive().nullable().optional(),
  isActive: z.boolean().optional().default(true),
});

const updateTaskSchema = z.object({
  locationId: z.number().int().positive().nullable().optional(),
  title: z.string().max(255).optional(),
  taskOrder: z.number().int().positive().optional(),
  question: z.string().min(1).optional(),
  correctAnswer: z.string().min(1).optional(),
  caseSensitive: z.boolean().optional(),
  locationHint: z.string().nullable().optional(),
  points: z.number().int().positive().optional(),
  maxAttempts: z.number().int().positive().nullable().optional(),
  isActive: z.boolean().optional(),
});

// GET /api/admin/tasks
router.get('/', async (req, res, next) => {
  try {
    const roundId = req.query.roundId ? parseInt(req.query.roundId) : null;

    let taskList;
    if (roundId) {
      taskList = await db.select({
        id: tasks.id,
        roundId: tasks.roundId,
        locationId: tasks.locationId,
        title: tasks.title,
        taskOrder: tasks.taskOrder,
        question: tasks.question,
        correctAnswer: tasks.correctAnswer,
        caseSensitive: tasks.caseSensitive,
        locationHint: tasks.locationHint,
        points: tasks.points,
        maxAttempts: tasks.maxAttempts,
        isActive: tasks.isActive,
        createdAt: tasks.createdAt,
        roundName: rounds.name,
        roundNumber: rounds.roundNumber,
      }).from(tasks)
        .innerJoin(rounds, eq(tasks.roundId, rounds.id))
        .where(eq(tasks.roundId, roundId))
        .orderBy(tasks.taskOrder);
    } else {
      taskList = await db.select({
        id: tasks.id,
        roundId: tasks.roundId,
        locationId: tasks.locationId,
        title: tasks.title,
        taskOrder: tasks.taskOrder,
        question: tasks.question,
        correctAnswer: tasks.correctAnswer,
        caseSensitive: tasks.caseSensitive,
        locationHint: tasks.locationHint,
        points: tasks.points,
        maxAttempts: tasks.maxAttempts,
        isActive: tasks.isActive,
        createdAt: tasks.createdAt,
        roundName: rounds.name,
        roundNumber: rounds.roundNumber,
      }).from(tasks)
        .innerJoin(rounds, eq(tasks.roundId, rounds.id))
        .orderBy(rounds.roundNumber, tasks.taskOrder);
    }

    // Get QR codes for all tasks
    const enriched = await Promise.all(taskList.map(async (task) => {
      const [qr] = await db.select({ secureToken: qrCodes.secureToken }).from(qrCodes).where(eq(qrCodes.taskId, task.id));
      // Get location name
      let locationName = null;
      if (task.locationId) {
        const [loc] = await db.select({ name: locations.name }).from(locations).where(eq(locations.id, task.locationId));
        locationName = loc?.name;
      }
      return { ...task, hasQR: !!qr, secureToken: qr?.secureToken, locationName };
    }));

    res.json({ success: true, data: enriched });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/tasks/:id
router.get('/:id', async (req, res, next) => {
  try {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, parseInt(req.params.id)));
    if (!task) throw new NotFoundError('Task not found.');

    const [qr] = await db.select().from(qrCodes).where(eq(qrCodes.taskId, task.id));

    let locationName = null;
    if (task.locationId) {
      const [loc] = await db.select({ name: locations.name }).from(locations).where(eq(locations.id, task.locationId));
      locationName = loc?.name;
    }

    res.json({ success: true, data: { ...task, qrCode: qr, locationName } });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/tasks
router.post('/', validate(createTaskSchema), async (req, res, next) => {
  try {
    const data = req.validatedBody;

    // Check duplicate task order in round
    const [existing] = await db.select().from(tasks)
      .where(and(eq(tasks.roundId, data.roundId), eq(tasks.taskOrder, data.taskOrder)));
    if (existing) throw new BadRequestError(`Task order ${data.taskOrder} already exists in this round.`);

    const [newTask] = await db.insert(tasks).values(data).returning();

    // Auto-generate QR code
    const secureToken = generateSecureToken();
    const frontendUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.CORS_ORIGIN || 'http://localhost:3000';
    const qrUrl = `${frontendUrl}/task/${secureToken}`;
    const qrDataUrl = await QRCode.toDataURL(qrUrl, {
      width: 400,
      margin: 2,
      color: { dark: '#1A1D21', light: '#FFFFFF' },
    });

    const [qr] = await db.insert(qrCodes).values({
      taskId: newTask.id,
      secureToken,
      qrDataUrl,
    }).returning();

    res.status(201).json({ success: true, data: { ...newTask, qrCode: qr } });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/tasks/:id
router.patch('/:id', validate(updateTaskSchema), async (req, res, next) => {
  try {
    const updates = { ...req.validatedBody, updatedAt: new Date() };

    const [updated] = await db.update(tasks)
      .set(updates)
      .where(eq(tasks.id, parseInt(req.params.id)))
      .returning();

    if (!updated) throw new NotFoundError('Task not found.');

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/admin/tasks/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const [deleted] = await db.delete(tasks)
      .where(eq(tasks.id, parseInt(req.params.id)))
      .returning({ id: tasks.id });

    if (!deleted) throw new NotFoundError('Task not found.');
    res.json({ success: true, message: 'Task deleted.' });
  } catch (err) {
    next(err);
  }
});

export default router;
