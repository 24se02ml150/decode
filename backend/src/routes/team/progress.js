import { Router } from 'express';
import { db } from '../../db/index.js';
import { teamRounds, teamTasks, taskAttempts, rounds, tasks, events } from '../../db/schema.js';
import { eq, and, desc, sql } from 'drizzle-orm';

const router = Router();

// GET /api/team/progress
router.get('/', async (req, res, next) => {
  try {
    const teamId = req.user.id;

    // Get current event
    const eventList = await db.select().from(events).orderBy(desc(events.createdAt)).limit(1);
    const currentEvent = eventList[0];
    if (!currentEvent) {
      return res.json({ success: true, data: { rounds: [] } });
    }

    // Get all rounds
    const roundList = await db.select().from(rounds)
      .where(eq(rounds.eventId, currentEvent.id))
      .orderBy(rounds.roundNumber);

    // For each round, get progress
    const roundsWithProgress = await Promise.all(roundList.map(async (round) => {
      const [teamRound] = await db.select().from(teamRounds)
        .where(and(eq(teamRounds.teamId, teamId), eq(teamRounds.roundId, round.id)));

      const [totalTasks] = await db.select({ count: sql`count(*)` })
        .from(tasks)
        .where(and(eq(tasks.roundId, round.id), eq(tasks.isActive, true)));

      // Get tasks with status
      const taskList = await db.select({
        id: tasks.id,
        title: tasks.title,
        taskOrder: tasks.taskOrder,
        points: tasks.points,
      }).from(tasks)
        .where(and(eq(tasks.roundId, round.id), eq(tasks.isActive, true)))
        .orderBy(tasks.taskOrder);

      const tasksWithStatus = await Promise.all(taskList.map(async (task) => {
        const [tt] = await db.select().from(teamTasks)
          .where(and(eq(teamTasks.teamId, teamId), eq(teamTasks.taskId, task.id)));
        return {
          ...task,
          title: task.title || `Task ${task.taskOrder}`,
          isCompleted: tt?.isCompleted || false,
          isUnlocked: task.taskOrder === 1 || tt?.isUnlocked || false,
          attempts: tt?.attempts || 0,
          completedAt: tt?.completedAt,
        };
      }));

      return {
        id: round.id,
        name: round.name,
        roundNumber: round.roundNumber,
        status: round.status,
        score: teamRound?.score || 0,
        tasksCompleted: teamRound?.tasksCompleted || 0,
        totalTasks: parseInt(totalTasks.count),
        isQualified: teamRound?.isQualified,
        completedAt: teamRound?.completedAt,
        tasks: tasksWithStatus,
      };
    }));

    res.json({ success: true, data: { rounds: roundsWithProgress } });
  } catch (err) {
    next(err);
  }
});

export default router;
