import { db } from '../db/index.js';
import { teamRounds, rounds, tasks, teamTasks } from '../db/schema.js';
import { eq, and, sql, desc, asc } from 'drizzle-orm';

/**
 * Calculate qualification for a round based on configured rules.
 * Returns list of teams with qualification status.
 */
export async function calculateQualification(roundId) {
  const [round] = await db
    .select()
    .from(rounds)
    .where(eq(rounds.id, roundId));

  if (!round) return [];

  const qualifyCount = round.qualifyCount;
  const qualifyBy = round.qualifyBy || 'score';

  // Get all team rounds for this round
  let orderClause;
  switch (qualifyBy) {
    case 'tasks_completed':
      orderClause = [desc(teamRounds.tasksCompleted), asc(teamRounds.completedAt)];
      break;
    case 'time':
      orderClause = [asc(teamRounds.completedAt)];
      break;
    case 'combined':
      orderClause = [desc(teamRounds.score), asc(teamRounds.completedAt)];
      break;
    case 'score':
    default:
      orderClause = [desc(teamRounds.score), asc(teamRounds.completedAt)];
      break;
  }

  const results = await db
    .select()
    .from(teamRounds)
    .where(eq(teamRounds.roundId, roundId))
    .orderBy(...orderClause);

  // Mark qualified teams
  const qualified = [];
  for (let i = 0; i < results.length; i++) {
    const isQualified = qualifyCount ? i < qualifyCount : true;
    qualified.push({
      ...results[i],
      isQualified,
      rank: i + 1,
    });

    // Update qualification status in DB
    await db
      .update(teamRounds)
      .set({ isQualified, updatedAt: new Date() })
      .where(eq(teamRounds.id, results[i].id));
  }

  return qualified;
}

/**
 * Check if a team is qualified for a specific round.
 */
export async function isTeamQualified(teamId, roundNumber, eventId) {
  if (roundNumber <= 1) return true; // First round, everyone participates

  // Check previous round qualification
  const [prevRound] = await db
    .select()
    .from(rounds)
    .where(and(
      eq(rounds.eventId, eventId),
      eq(rounds.roundNumber, roundNumber - 1)
    ));

  if (!prevRound) return true;

  const [teamRound] = await db
    .select()
    .from(teamRounds)
    .where(and(
      eq(teamRounds.teamId, teamId),
      eq(teamRounds.roundId, prevRound.id)
    ));

  return teamRound?.isQualified === true;
}
