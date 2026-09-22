import { Router } from 'express';
import { db } from '../../db/index.js';
import { users, rounds, tasks, teamRounds, teamTasks, taskAttempts, teamTaskAssignments } from '../../db/schema.js';
import { eq, and, sql, desc, asc } from 'drizzle-orm';

const router = Router();

function toCSV(headers, rows) {
  const headerLine = headers.join(',');
  const dataLines = rows.map(row => 
    headers.map(h => {
      const val = row[h];
      if (val === null || val === undefined) return '';
      const str = String(val);
      return str.includes(',') || str.includes('"') || str.includes('\n')
        ? `"${str.replace(/"/g, '""')}"`
        : str;
    }).join(',')
  );
  return [headerLine, ...dataLines].join('\n');
}

// GET /api/admin/reports/teams
router.get('/teams', async (req, res, next) => {
  try {
    const teamList = await db.select({
      id: users.id,
      teamId: users.teamId,
      teamName: users.teamName,
      isActive: users.isActive,
      createdAt: users.createdAt,
    }).from(users).where(eq(users.role, 'team')).orderBy(users.teamName);

    if (req.query.format === 'csv') {
      const csv = toCSV(['teamId', 'teamName', 'isActive', 'createdAt'], teamList);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="teams.csv"');
      return res.send(csv);
    }

    res.json({ success: true, data: teamList });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/reports/live-leaderboard
router.get('/live-leaderboard', async (req, res, next) => {
  try {
    const leaderboardRaw = await db.select({
      teamId: users.id,
      teamIdCode: users.teamId,
      teamName: users.teamName,
      score: sql`CAST(COALESCE(SUM(${tasks.points}), 0) AS INTEGER)`,
      tasksCompleted: sql`CAST(COUNT(${teamTasks.id}) AS INTEGER)`,
      lastActivity: sql`MAX(${teamTasks.updatedAt})`,
    }).from(users)
      .leftJoin(teamTasks, and(eq(teamTasks.teamId, users.id), eq(teamTasks.isCompleted, true)))
      .leftJoin(tasks, eq(teamTasks.taskId, tasks.id))
      .where(eq(users.role, 'team'))
      .groupBy(users.id, users.teamId, users.teamName)
      .orderBy(desc(sql`COALESCE(SUM(${tasks.points}), 0)`), asc(sql`MAX(${teamTasks.updatedAt})`));

    const teamRoundContext = await db.select({
      teamId: teamRounds.teamId,
      roundName: rounds.name
    }).from(teamRounds)
      .innerJoin(rounds, eq(teamRounds.roundId, rounds.id))
      .orderBy(desc(teamRounds.roundId));

    const roundMap = new Map();
    for (const tr of teamRoundContext) {
      if (!roundMap.has(tr.teamId)) roundMap.set(tr.teamId, tr.roundName);
    }

    const leaderboard = leaderboardRaw.map(t => ({
      ...t,
      currentRoundName: roundMap.get(t.teamId) || 'Not Started'
    }));

    if (req.query.format === 'csv') {
      const csv = toCSV(['teamIdCode', 'teamName', 'currentRoundName', 'score', 'tasksCompleted', 'lastActivity'], leaderboard);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="live_leaderboard.csv"');
      return res.send(csv);
    }

    res.json({ success: true, data: leaderboard });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/reports/round-results/:roundId
router.get('/round-results/:roundId', async (req, res, next) => {
  try {
    const roundId = parseInt(req.params.roundId);

    const results = await db.select({
      teamId: users.teamId,
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

    if (req.query.format === 'csv') {
      const csv = toCSV(['teamId', 'teamName', 'score', 'tasksCompleted', 'isQualified', 'startedAt', 'completedAt'], results);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="round_${roundId}_results.csv"`);
      return res.send(csv);
    }

    res.json({ success: true, data: results });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/reports/task-results/:roundId
router.get('/task-results/:roundId', async (req, res, next) => {
  try {
    const roundId = parseInt(req.params.roundId);

    const taskResults = await db.select({
      teamId: users.teamId,
      teamName: users.teamName,
      taskOrder: tasks.taskOrder,
      taskTitle: tasks.title,
      isCompleted: teamTasks.isCompleted,
      attempts: teamTasks.attempts,
      correctAttempts: teamTasks.correctAttempts,
      wrongAttempts: teamTasks.wrongAttempts,
      completedAt: teamTasks.completedAt,
      scanOffsetSeconds: teamTaskAssignments.scanOffsetSeconds,
      responseTimeSeconds: teamTaskAssignments.responseTimeSeconds,
    }).from(teamTasks)
      .innerJoin(users, eq(teamTasks.teamId, users.id))
      .innerJoin(tasks, eq(teamTasks.taskId, tasks.id))
      .leftJoin(teamTaskAssignments, and(
        eq(teamTaskAssignments.teamId, teamTasks.teamId),
        eq(teamTaskAssignments.taskId, teamTasks.taskId),
        eq(teamTaskAssignments.roundId, tasks.roundId)
      ))
      .where(eq(tasks.roundId, roundId))
      .orderBy(users.teamName, tasks.taskOrder);

    if (req.query.format === 'csv') {
      const csv = toCSV(['teamId', 'teamName', 'taskOrder', 'taskTitle', 'isCompleted', 'attempts', 'correctAttempts', 'wrongAttempts', 'completedAt', 'scanOffsetSeconds', 'responseTimeSeconds'], taskResults);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="round_${roundId}_task_results.csv"`);
      return res.send(csv);
    }

    res.json({ success: true, data: taskResults });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/reports/full
router.get('/full', async (req, res, next) => {
  try {
    // Complete event report
    const teamList = await db.select({
      teamId: users.teamId,
      teamName: users.teamName,
      isActive: users.isActive,
    }).from(users).where(eq(users.role, 'team'));

    const allRoundProgress = await db.select({
      teamId: users.teamId,
      teamName: users.teamName,
      roundNumber: rounds.roundNumber,
      roundName: rounds.name,
      score: teamRounds.score,
      tasksCompleted: teamRounds.tasksCompleted,
      isQualified: teamRounds.isQualified,
      completedAt: teamRounds.completedAt,
    }).from(teamRounds)
      .innerJoin(users, eq(teamRounds.teamId, users.id))
      .innerJoin(rounds, eq(teamRounds.roundId, rounds.id))
      .orderBy(users.teamName, rounds.roundNumber);

    if (req.query.format === 'csv') {
      const csv = toCSV(['teamId', 'teamName', 'roundNumber', 'roundName', 'score', 'tasksCompleted', 'isQualified', 'completedAt'], allRoundProgress);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="full_event_report.csv"');
      return res.send(csv);
    }

    res.json({ success: true, data: { teams: teamList, roundProgress: allRoundProgress } });
  } catch (err) {
    next(err);
  }
});

export default router;
