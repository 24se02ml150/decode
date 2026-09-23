import { Router } from 'express';
import { db } from '../../db/index.js';
import { users, events, rounds, tasks, teamRounds, teamTasks, qrCodes, teamTaskAssignments, round2Config, locations } from '../../db/schema.js';
import { eq, and, sql, desc, asc, inArray } from 'drizzle-orm';

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
    let round2State = null;

    if (activeRound) {
      if (activeRound.roundType === 'questions') {
        // Round 2: Get question completion state
        const taskList = await db.select({
          id: tasks.id,
          title: tasks.title,
          taskOrder: tasks.taskOrder,
          points: tasks.points,
        }).from(tasks)
          .where(and(eq(tasks.roundId, activeRound.id), eq(tasks.isActive, true)))
          .orderBy(tasks.taskOrder);

        totalTasks = taskList.length;

        // Get completion status
        const completedCount = await db.select({ count: sql`count(*)` })
          .from(teamTasks)
          .innerJoin(tasks, eq(teamTasks.taskId, tasks.id))
          .where(and(
            eq(teamTasks.teamId, teamId),
            eq(teamTasks.isCompleted, true),
            eq(tasks.roundId, activeRound.id)
          ));

        const completedQuestionsCount = parseInt(completedCount[0]?.count || 0);
        const allCompleted = totalTasks > 0 && completedQuestionsCount >= totalTasks;

        let config = null;
        if (allCompleted) {
          const [cfg] = await db.select().from(round2Config).where(eq(round2Config.roundId, activeRound.id));
          config = cfg || null;
        }

        round2State = {
          totalQuestions: totalTasks,
          completedQuestions: completedQuestionsCount,
          allCompleted,
          config,
        };
      } else {
        // Round 1 (qr_hunt): Get tasks, filtered by assignments if assignCount is set
        let taskList;

        if (activeRound.assignCount) {
          // Get assigned task IDs for this team
          const assignments = await db.select({
            taskId: teamTaskAssignments.taskId,
            assignmentOrder: teamTaskAssignments.assignmentOrder,
          }).from(teamTaskAssignments)
            .where(and(
              eq(teamTaskAssignments.teamId, teamId),
              eq(teamTaskAssignments.roundId, activeRound.id)
            ))
            .orderBy(teamTaskAssignments.assignmentOrder);

          const assignedTaskIds = assignments.map(a => a.taskId);

          if (assignedTaskIds.length > 0) {
            taskList = await db.select({
              id: tasks.id,
              title: tasks.title,
              taskOrder: tasks.taskOrder,
              points: tasks.points,
              roundId: tasks.roundId,
              locationId: tasks.locationId,
            }).from(tasks)
              .where(and(
                eq(tasks.roundId, activeRound.id),
                eq(tasks.isActive, true),
                inArray(tasks.id, assignedTaskIds)
              ))
              .orderBy(tasks.taskOrder);
          } else {
            taskList = [];
          }
        } else {
          taskList = await db.select({
            id: tasks.id,
            title: tasks.title,
            taskOrder: tasks.taskOrder,
            points: tasks.points,
            roundId: tasks.roundId,
            locationId: tasks.locationId,
          }).from(tasks)
            .where(and(eq(tasks.roundId, activeRound.id), eq(tasks.isActive, true)))
            .orderBy(tasks.taskOrder);
        }

        // Fetch startingClue for the first task's location (if it has one)
        for (const task of taskList) {
          task.startingClue = null;
          if (task.locationId) {
            const [loc] = await db.select({ startingClue: locations.startingClue })
              .from(locations)
              .where(eq(locations.id, task.locationId));
            task.startingClue = loc?.startingClue || null;
          }
        }

        totalTasks = activeRound.assignCount || taskList.length;

        // Get team's task status for each
        currentTasks = await Promise.all(taskList.map(async (task) => {
          const [teamTask] = await db.select().from(teamTasks)
            .where(and(eq(teamTasks.teamId, teamId), eq(teamTasks.taskId, task.id)));

          // First task in the assigned set is always unlocked
          const isFirstTask = task.taskOrder === Math.min(...taskList.map(t => t.taskOrder));
          const isUnlocked = isFirstTask || teamTask?.isUnlocked || false;

          return {
            id: task.id,
            title: task.title || `Task ${task.taskOrder}`,
            taskOrder: task.taskOrder,
            points: task.points,
            isCompleted: teamTask?.isCompleted || false,
            isUnlocked,
            attempts: teamTask?.attempts || 0,
            startingClue: isFirstTask && !teamTask?.isCompleted ? task.startingClue : null,
          };
        }));
      }
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
        round2State,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
