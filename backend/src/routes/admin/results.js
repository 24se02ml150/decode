import { Router } from 'express';
import { db } from '../../db/index.js';
import { users, events, rounds, tasks, teamRounds, teamTasks, taskAttempts } from '../../db/schema.js';
import { eq, and, sql, desc, asc } from 'drizzle-orm';

const router = Router();

// GET /api/admin/results/overview — dashboard overview stats
router.get('/overview', async (req, res, next) => {
  try {
    const [totalTeams] = await db.select({ count: sql`count(*)` }).from(users).where(eq(users.role, 'team'));
    const [activeTeams] = await db.select({ count: sql`count(*)` }).from(users).where(and(eq(users.role, 'team'), eq(users.isActive, true)));
    
    const eventList = await db.select().from(events).orderBy(desc(events.createdAt)).limit(1);
    const currentEvent = eventList[0] || null;

    let currentRound = null;
    let totalTasks = 0;
    let completedTasks = 0;
    let teamsCompleted = 0;
    let teamsQualified = 0;

    if (currentEvent) {
      const roundList = await db.select().from(rounds)
        .where(eq(rounds.eventId, currentEvent.id))
        .orderBy(rounds.roundNumber);

      currentRound = roundList.find(r => r.status === 'active') || roundList[roundList.length - 1];

      if (currentRound) {
        const [tc] = await db.select({ count: sql`count(*)` }).from(tasks).where(eq(tasks.roundId, currentRound.id));
        totalTasks = parseInt(tc.count);

        const [cc] = await db.select({ count: sql`count(*)` }).from(teamTasks)
          .innerJoin(tasks, eq(teamTasks.taskId, tasks.id))
          .where(and(eq(tasks.roundId, currentRound.id), eq(teamTasks.isCompleted, true)));
        completedTasks = parseInt(cc.count);

        const [tcomp] = await db.select({ count: sql`count(*)` }).from(teamRounds)
          .where(and(eq(teamRounds.roundId, currentRound.id), sql`${teamRounds.completedAt} IS NOT NULL`));
        teamsCompleted = parseInt(tcomp.count);

        const [tq] = await db.select({ count: sql`count(*)` }).from(teamRounds)
          .where(and(eq(teamRounds.roundId, currentRound.id), eq(teamRounds.isQualified, true)));
        teamsQualified = parseInt(tq.count);
      }
    }

    res.json({
      success: true,
      data: {
        totalTeams: parseInt(totalTeams.count),
        activeTeams: parseInt(activeTeams.count),
        currentEvent,
        currentRound,
        totalTasks,
        completedTasks,
        teamsCompleted,
        teamsQualified,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/results/live-leaderboard — real-time overall leaderboard
router.get('/live-leaderboard', async (req, res, next) => {
  try {
    const leaderboardRaw = await db.select({
      teamId: users.id,
      teamIdCode: users.teamId,
      teamName: users.teamName,
      isActive: users.isActive,
      score: sql`CAST(COALESCE(SUM(${tasks.points}), 0) AS INTEGER)`,
      tasksCompleted: sql`CAST(COUNT(${teamTasks.id}) AS INTEGER)`,
      lastActivity: sql`MAX(${teamTasks.updatedAt})`,
    }).from(users)
      .leftJoin(teamTasks, and(eq(teamTasks.teamId, users.id), eq(teamTasks.isCompleted, true)))
      .leftJoin(tasks, eq(teamTasks.taskId, tasks.id))
      .where(eq(users.role, 'team'))
      .groupBy(users.id, users.teamId, users.teamName, users.isActive)
      .orderBy(desc(sql`COALESCE(SUM(${tasks.points}), 0)`), asc(sql`MAX(${teamTasks.updatedAt})`));

    // Get current round info (the highest round started by each team)
    const teamRoundContext = await db.select({
      teamId: teamRounds.teamId,
      roundId: teamRounds.roundId,
      roundName: rounds.name
    }).from(teamRounds)
      .innerJoin(rounds, eq(teamRounds.roundId, rounds.id))
      .orderBy(desc(teamRounds.roundId));

    const roundMap = new Map();
    for (const tr of teamRoundContext) {
      if (!roundMap.has(tr.teamId)) {
        roundMap.set(tr.teamId, tr.roundName); // gets the highest roundId since it's ordered by desc
      }
    }

    const leaderboard = leaderboardRaw.map(t => ({
      ...t,
      currentRoundName: roundMap.get(t.teamId) || 'Not Started'
    }));

    res.json({
      success: true,
      data: { teamProgress: leaderboard },
    });
  } catch (err) {
    next(err);
  }
});


// GET /api/admin/results/round/:roundId — round results
router.get('/round/:roundId', async (req, res, next) => {
  try {
    const roundId = parseInt(req.params.roundId);

    const [round] = await db.select().from(rounds).where(eq(rounds.id, roundId));
    if (!round) return res.status(404).json({ success: false, error: { message: 'Round not found.' } });

    const resultsRaw = await db.select({
      teamId: users.id,
      teamIdCode: users.teamId,
      teamName: users.teamName,
      score: teamRounds.score,
      tasksCompleted: teamRounds.tasksCompleted,
      isQualified: teamRounds.isQualified,
      startedAt: teamRounds.startedAt,
      completedAt: teamRounds.completedAt,
    }).from(teamRounds)
      .innerJoin(users, eq(teamRounds.teamId, users.id))
      .where(eq(teamRounds.roundId, roundId))
      .orderBy(desc(teamRounds.score));

    // Fetch assignment counts for each team
    const assignmentCounts = await db.select({
      teamId: teamTaskAssignments.teamId,
      count: sql`count(*)`
    }).from(teamTaskAssignments)
      .where(eq(teamTaskAssignments.roundId, roundId))
      .groupBy(teamTaskAssignments.teamId);

    const countMap = new Map(assignmentCounts.map(a => [a.teamId, parseInt(a.count)]));

    const results = resultsRaw.map(t => ({
      ...t,
      totalTasks: countMap.get(t.teamId) || 0
    }));

    const [totalTasks] = await db.select({ count: sql`count(*)` }).from(tasks).where(eq(tasks.roundId, roundId));

    res.json({
      success: true,
      data: { round, results, totalTasks: parseInt(totalTasks.count) },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/results/recent-activity
router.get('/recent-activity', async (req, res, next) => {
  try {
    const recent = await db.select({
      id: taskAttempts.id,
      teamName: users.teamName,
      teamIdCode: users.teamId,
      taskTitle: tasks.title,
      taskOrder: tasks.taskOrder,
      isCorrect: taskAttempts.isCorrect,
      createdAt: taskAttempts.createdAt,
      roundName: rounds.name,
    }).from(taskAttempts)
      .innerJoin(users, eq(taskAttempts.teamId, users.id))
      .innerJoin(tasks, eq(taskAttempts.taskId, tasks.id))
      .innerJoin(rounds, eq(tasks.roundId, rounds.id))
      .orderBy(desc(taskAttempts.createdAt))
      .limit(50);

    res.json({ success: true, data: recent });
  } catch (err) {
    next(err);
  }
});

export default router;
