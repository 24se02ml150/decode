import { Router } from 'express';
import { db } from '../../db/index.js';
import { users, events, rounds, tasks, teamRounds, teamTasks, qrCodes } from '../../db/schema.js';
import { eq, and, sql, desc, asc } from 'drizzle-orm';

const router = Router();

// GET /api/team/dashboard
router.get('/', async (req, res, next) => {
  try {
    const teamId = req.user.id;

    // Get team info
    const [team] = await db.select({
      id: users.id,
      teamId: users.teamId,
      teamName: users.teamName,
    }).from(users).where(eq(users.id, teamId));

    // Get current event
    const eventList = await db.select().from(events).orderBy(desc(events.createdAt)).limit(1);
    const currentEvent = eventList[0] || null;

    if (!currentEvent) {
      return res.json({
        success: true,
        data: { team, event: null, currentRound: null, rounds: [], progress: null },
      });
    }

    // Get all rounds for event
    const roundList = await db.select().from(rounds)
      .where(eq(rounds.eventId, currentEvent.id))
      .orderBy(rounds.roundNumber);

    // Find current active round (or latest)
    const activeRound = roundList.find(r => r.status === 'active') || roundList.find(r => r.status === 'completed') || roundList[0];

    // Get team's round progress
    const teamRoundProgress = await db.select().from(teamRounds)
      .where(eq(teamRounds.teamId, teamId))
      .orderBy(teamRounds.roundId);

    // Build round data with qualification
    const roundsWithProgress = roundList.map(round => {
      const progress = teamRoundProgress.find(tr => tr.roundId === round.id);
      return {
        ...round,
        teamScore: progress?.score || 0,
        teamTasksCompleted: progress?.tasksCompleted || 0,
        isQualified: progress?.isQualified,
        completedAt: progress?.completedAt,
      };
    });

    // Get tasks for current active round
    let currentTasks = [];
    let totalTasks = 0;
    if (activeRound) {
      const taskList = await db.select({
        id: tasks.id,
        title: tasks.title,
        taskOrder: tasks.taskOrder,
        points: tasks.points,
        roundId: tasks.roundId,
      }).from(tasks)
        .where(and(eq(tasks.roundId, activeRound.id), eq(tasks.isActive, true)))
        .orderBy(tasks.taskOrder);

      totalTasks = taskList.length;

      // Get team's task status for each
      currentTasks = await Promise.all(taskList.map(async (task) => {
        const [teamTask] = await db.select().from(teamTasks)
          .where(and(eq(teamTasks.teamId, teamId), eq(teamTasks.taskId, task.id)));

        // First task is always unlocked
        const isFirstTask = task.taskOrder === 1;
        const isUnlocked = isFirstTask || teamTask?.isUnlocked || false;

        return {
          id: task.id,
          title: task.title || `Task ${task.taskOrder}`,
          taskOrder: task.taskOrder,
          points: task.points,
          isCompleted: teamTask?.isCompleted || false,
          isUnlocked,
          attempts: teamTask?.attempts || 0,
        };
      }));
    }

    const currentProgress = teamRoundProgress.find(tr => tr.roundId === activeRound?.id);

    res.json({
      success: true,
      data: {
        team,
        event: {
          id: currentEvent.id,
          name: currentEvent.name,
          status: currentEvent.status,
        },
        currentRound: activeRound ? {
          ...activeRound,
          teamScore: currentProgress?.score || 0,
          teamTasksCompleted: currentProgress?.tasksCompleted || 0,
          totalTasks,
        } : null,
        rounds: roundsWithProgress,
        tasks: currentTasks,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
