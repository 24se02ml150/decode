import { Router } from 'express';
import { db } from '../../db/index.js';
import { rounds, tasks, teamRounds, users, teamTaskAssignments, events } from '../../db/schema.js';
import { eq, and, sql } from 'drizzle-orm';
import { validate } from '../../middleware/validate.js';
import { NotFoundError, BadRequestError } from '../../utils/errors.js';
import { calculateQualification, isTeamQualified } from '../../services/qualification.js';
import { z } from 'zod';

const router = Router();

const createRoundSchema = z.object({
  eventId: z.number().int().positive(),
  name: z.string().min(1, 'Round name is required').max(255),
  roundNumber: z.number().int().positive(),
  description: z.string().optional(),
  roundType: z.enum(['qr_hunt', 'questions']).optional().default('qr_hunt'),
  assignCount: z.number().int().positive().nullable().optional(),
  qualifyCount: z.number().int().positive().optional(),
  qualifyBy: z.enum(['score', 'tasks_completed', 'time', 'combined']).optional().default('score'),
  timeLimit: z.number().int().positive().optional(),
});

const updateRoundSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  roundType: z.enum(['qr_hunt', 'questions']).optional(),
  assignCount: z.number().int().positive().nullable().optional(),
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
    const roundId = parseInt(req.params.id);
    const [updated] = await db.update(rounds)
      .set({ status: 'active', startedAt: new Date(), updatedAt: new Date() })
      .where(eq(rounds.id, roundId))
      .returning();

    if (!updated) throw new NotFoundError('Round not found.');

    // Auto-activate the parent event if it's not already active
    await db.update(events)
      .set({ status: 'active', updatedAt: new Date() })
      .where(eq(events.id, updated.eventId));

    // Pre-assign the first task (taskOrder = 1) for all active teams
    await preassignStartingTasks(updated);

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// Helper: Pre-assign a RANDOM starting task for each team (load-balanced)
async function preassignStartingTasks(round) {
  const { id: roundId, startedAt: roundStartedAt, totalPausedSeconds: roundPausedSnapshot, roundNumber, eventId } = round;

  // Get all active teams
  const teamList = await db.select({ id: users.id })
    .from(users)
    .where(and(eq(users.role, 'team'), eq(users.isActive, true)));

  if (teamList.length === 0) return;

  // Get ALL active tasks for this round (not just taskOrder=1)
  const allRoundTasks = await db.select({
    id: tasks.id,
    locationId: tasks.locationId,
  })
    .from(tasks)
    .where(and(eq(tasks.roundId, roundId), eq(tasks.isActive, true)));

  if (allRoundTasks.length === 0) return;

  // Shuffle teams randomly (Fisher-Yates)
  const shuffledTeams = [...teamList];
  for (let i = shuffledTeams.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledTeams[i], shuffledTeams[j]] = [shuffledTeams[j], shuffledTeams[i]];
  }

  // Track assignment counts locally for load balancing within this batch
  const localCounts = new Map(); // taskId -> count
  for (const t of allRoundTasks) {
    localCounts.set(t.id, 0);
  }

  // Pre-assign for each team
  for (const team of shuffledTeams) {
    // Check if team is qualified for this round
    if (!(await isTeamQualified(team.id, roundNumber, eventId))) {
      continue; // Skip if not qualified
    }

    // Check if team already has an assignment for this round
    const existing = await db.select({ id: teamTaskAssignments.id })
      .from(teamTaskAssignments)
      .where(and(
        eq(teamTaskAssignments.teamId, team.id),
        eq(teamTaskAssignments.roundId, roundId),
        eq(teamTaskAssignments.assignmentOrder, 1)
      ))
      .limit(1);

    if (existing.length > 0) continue; // Already assigned

    // Pick the least-assigned task (load balanced random distribution)
    let selectedTask = allRoundTasks[0];
    let minCount = Infinity;

    // Shuffle candidates with same count for randomness
    const shuffledTasks = [...allRoundTasks];
    for (let i = shuffledTasks.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledTasks[i], shuffledTasks[j]] = [shuffledTasks[j], shuffledTasks[i]];
    }

    for (const t of shuffledTasks) {
      const count = localCounts.get(t.id) || 0;
      if (count < minCount) {
        minCount = count;
        selectedTask = t;
      }
    }

    // Update local count
    localCounts.set(selectedTask.id, (localCounts.get(selectedTask.id) || 0) + 1);

    // Insert assignment
    await db.insert(teamTaskAssignments).values({
      teamId: team.id,
      roundId,
      taskId: selectedTask.id,
      locationId: selectedTask.locationId,
      assignmentOrder: 1,
      assignedAt: roundStartedAt,
      assignedAtPausedSnapshot: roundPausedSnapshot,
    });
  }
}

// Helper: Generate random task assignments for all active teams
// (Removed old generateAssignments as it was replaced by preassignStartingTasks)

// GET /api/admin/rounds/:id/assignments
router.get('/:id/assignments', async (req, res, next) => {
  try {
    const roundId = parseInt(req.params.id);

    const assignments = await db.select({
      teamId: users.id,
      teamIdCode: users.teamId,
      teamName: users.teamName,
      taskId: teamTaskAssignments.taskId,
      assignmentOrder: teamTaskAssignments.assignmentOrder,
      taskTitle: tasks.title,
      taskOrder: tasks.taskOrder,
    }).from(teamTaskAssignments)
      .innerJoin(users, eq(teamTaskAssignments.teamId, users.id))
      .innerJoin(tasks, eq(teamTaskAssignments.taskId, tasks.id))
      .where(eq(teamTaskAssignments.roundId, roundId))
      .orderBy(users.teamName, teamTaskAssignments.assignmentOrder);

    // Group by team
    const grouped = {};
    for (const row of assignments) {
      if (!grouped[row.teamId]) {
        grouped[row.teamId] = {
          teamId: row.teamId,
          teamIdCode: row.teamIdCode,
          teamName: row.teamName,
          tasks: [],
        };
      }
      grouped[row.teamId].tasks.push({
        taskId: row.taskId,
        taskTitle: row.taskTitle || `Task ${row.taskOrder}`,
        taskOrder: row.taskOrder,
        assignmentOrder: row.assignmentOrder,
      });
    }

    res.json({ success: true, data: Object.values(grouped) });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/rounds/:id/pause
router.post('/:id/pause', async (req, res, next) => {
  try {
    const [updated] = await db.update(rounds)
      .set({ status: 'paused', lastPausedAt: new Date(), updatedAt: new Date() })
      .where(eq(rounds.id, parseInt(req.params.id)))
      .returning();

    if (!updated) throw new NotFoundError('Round not found.');
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/rounds/:id/resume
router.post('/:id/resume', async (req, res, next) => {
  try {
    const roundId = parseInt(req.params.id);
    const [round] = await db.select().from(rounds).where(eq(rounds.id, roundId));
    if (!round) throw new NotFoundError('Round not found.');

    const updates = { status: 'active', updatedAt: new Date() };

    if (round.lastPausedAt) {
      const pausedDurationSeconds = Math.floor((new Date().getTime() - round.lastPausedAt.getTime()) / 1000);
      updates.totalPausedSeconds = round.totalPausedSeconds + pausedDurationSeconds;
      updates.lastPausedAt = null;
    }

    const [updated] = await db.update(rounds)
      .set(updates)
      .where(eq(rounds.id, roundId))
      .returning();

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
