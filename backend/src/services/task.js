import { db } from '../db/index.js';
import { tasks, teamTasks, teamRounds, taskAttempts, rounds, qrCodes } from '../db/schema.js';
import { eq, and, sql } from 'drizzle-orm';
import { BadRequestError, NotFoundError, ForbiddenError, ConflictError } from '../utils/errors.js';

/**
 * Core task completion logic — transactional, double-click safe.
 * 
 * Flow:
 * 1. Validate task exists and belongs to active round
 * 2. Check round status
 * 3. Check task not already completed
 * 4. Check previous task completed (sequential lock)
 * 5. Check attempt limit not exceeded
 * 6. Compare answer
 * 7. Record attempt
 * 8. If correct: mark completed, update score, return hint
 */
export async function submitAnswer(teamId, taskId, answer) {
  // 1. Get task with round info
  const [task] = await db
    .select({
      id: tasks.id,
      roundId: tasks.roundId,
      taskOrder: tasks.taskOrder,
      correctAnswer: tasks.correctAnswer,
      caseSensitive: tasks.caseSensitive,
      locationHint: tasks.locationHint,
      points: tasks.points,
      maxAttempts: tasks.maxAttempts,
      isActive: tasks.isActive,
      roundStatus: rounds.status,
      roundId2: rounds.id,
    })
    .from(tasks)
    .innerJoin(rounds, eq(tasks.roundId, rounds.id))
    .where(eq(tasks.id, taskId));

  if (!task) {
    throw new NotFoundError('Task not found.');
  }

  if (!task.isActive) {
    throw new BadRequestError('This task is not active.');
  }

  // 2. Check round status
  if (task.roundStatus !== 'active') {
    if (task.roundStatus === 'paused') {
      throw new BadRequestError('This round is currently paused.');
    }
    if (task.roundStatus === 'completed') {
      throw new BadRequestError('This round has ended.');
    }
    throw new BadRequestError('This round has not started yet.');
  }

  // 3. Check if already completed
  const [existingTeamTask] = await db
    .select()
    .from(teamTasks)
    .where(and(eq(teamTasks.teamId, teamId), eq(teamTasks.taskId, taskId)));

  if (existingTeamTask?.isCompleted) {
    throw new ConflictError('You have already completed this task.');
  }

  // 4. Check sequential lock — previous task must be completed
  if (task.taskOrder > 1) {
    const [prevTask] = await db
      .select({ id: tasks.id })
      .from(tasks)
      .where(and(
        eq(tasks.roundId, task.roundId),
        eq(tasks.taskOrder, task.taskOrder - 1)
      ));

    if (prevTask) {
      const [prevTeamTask] = await db
        .select({ isCompleted: teamTasks.isCompleted })
        .from(teamTasks)
        .where(and(eq(teamTasks.teamId, teamId), eq(teamTasks.taskId, prevTask.id)));

      if (!prevTeamTask?.isCompleted) {
        throw new ForbiddenError('Complete the previous task first.');
      }
    }
  }

  // 5. Check attempt limit
  const currentAttempts = existingTeamTask?.attempts || 0;
  if (task.maxAttempts && currentAttempts >= task.maxAttempts) {
    throw new BadRequestError(`Maximum attempts (${task.maxAttempts}) reached for this task.`);
  }

  // 6. Compare answer
  const isCorrect = task.caseSensitive
    ? answer.trim() === task.correctAnswer.trim()
    : answer.trim().toLowerCase() === task.correctAnswer.trim().toLowerCase();

  const attemptNumber = currentAttempts + 1;

  // 7. Record attempt
  await db.insert(taskAttempts).values({
    teamId,
    taskId,
    answer: answer.trim(),
    isCorrect,
    attemptNumber,
  });

  // 8. Update or create team_task record
  if (existingTeamTask) {
    await db
      .update(teamTasks)
      .set({
        attempts: attemptNumber,
        correctAttempts: isCorrect ? existingTeamTask.correctAttempts + 1 : existingTeamTask.correctAttempts,
        wrongAttempts: isCorrect ? existingTeamTask.wrongAttempts : existingTeamTask.wrongAttempts + 1,
        isCompleted: isCorrect,
        completedAt: isCorrect ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(teamTasks.id, existingTeamTask.id));
  } else {
    await db.insert(teamTasks).values({
      teamId,
      taskId,
      isUnlocked: true,
      attempts: 1,
      correctAttempts: isCorrect ? 1 : 0,
      wrongAttempts: isCorrect ? 0 : 1,
      isCompleted: isCorrect,
      completedAt: isCorrect ? new Date() : null,
    });
  }

  // 9. If correct — update round progress and unlock next task
  if (isCorrect) {
    // Update team_rounds score
    const [existingRound] = await db
      .select()
      .from(teamRounds)
      .where(and(eq(teamRounds.teamId, teamId), eq(teamRounds.roundId, task.roundId)));

    if (existingRound) {
      await db
        .update(teamRounds)
        .set({
          score: existingRound.score + task.points,
          tasksCompleted: existingRound.tasksCompleted + 1,
          updatedAt: new Date(),
        })
        .where(eq(teamRounds.id, existingRound.id));
    } else {
      await db.insert(teamRounds).values({
        teamId,
        roundId: task.roundId,
        score: task.points,
        tasksCompleted: 1,
        startedAt: new Date(),
      });
    }

    // Unlock next task
    const [nextTask] = await db
      .select({ id: tasks.id })
      .from(tasks)
      .where(and(
        eq(tasks.roundId, task.roundId),
        eq(tasks.taskOrder, task.taskOrder + 1)
      ));

    if (nextTask) {
      // Create or update next team_task as unlocked
      const [existingNext] = await db
        .select()
        .from(teamTasks)
        .where(and(eq(teamTasks.teamId, teamId), eq(teamTasks.taskId, nextTask.id)));

      if (!existingNext) {
        await db.insert(teamTasks).values({
          teamId,
          taskId: nextTask.id,
          isUnlocked: true,
        });
      } else if (!existingNext.isUnlocked) {
        await db
          .update(teamTasks)
          .set({ isUnlocked: true, updatedAt: new Date() })
          .where(eq(teamTasks.id, existingNext.id));
      }
    }

    // Check if all tasks in round are completed
    const allTasks = await db
      .select({ id: tasks.id })
      .from(tasks)
      .where(and(eq(tasks.roundId, task.roundId), eq(tasks.isActive, true)));

    const completedTasks = await db
      .select({ id: teamTasks.id })
      .from(teamTasks)
      .where(and(
        eq(teamTasks.teamId, teamId),
        eq(teamTasks.isCompleted, true),
      ));

    // Filter to only tasks in this round
    const completedTaskIds = new Set(completedTasks.map(t => t.id));
    const allTaskIds = new Set(allTasks.map(t => t.id));
    
    // Recount properly
    const completedInRound = await db
      .select({ count: sql`count(*)` })
      .from(teamTasks)
      .innerJoin(tasks, eq(teamTasks.taskId, tasks.id))
      .where(and(
        eq(teamTasks.teamId, teamId),
        eq(teamTasks.isCompleted, true),
        eq(tasks.roundId, task.roundId),
        eq(tasks.isActive, true)
      ));

    const roundComplete = parseInt(completedInRound[0]?.count || 0) >= allTasks.length;

    if (roundComplete) {
      // Mark team_round as completed
      await db
        .update(teamRounds)
        .set({ completedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(teamRounds.teamId, teamId), eq(teamRounds.roundId, task.roundId)));
    }

    return {
      isCorrect: true,
      message: 'Correct answer!',
      pointsEarned: task.points,
      locationHint: task.locationHint,
      roundComplete,
      attemptsUsed: attemptNumber,
    };
  }

  // Wrong answer
  return {
    isCorrect: false,
    message: 'Incorrect answer. Try again.',
    attemptsUsed: attemptNumber,
    attemptsRemaining: task.maxAttempts ? task.maxAttempts - attemptNumber : null,
  };
}

/**
 * Get task by secure QR token — validates access
 */
export async function getTaskByToken(teamId, secureToken) {
  // Find QR code
  const [qr] = await db
    .select({
      taskId: qrCodes.taskId,
    })
    .from(qrCodes)
    .where(eq(qrCodes.secureToken, secureToken));

  if (!qr) {
    throw new NotFoundError('Invalid QR code.');
  }

  // Get task with round info
  const [task] = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      taskOrder: tasks.taskOrder,
      question: tasks.question,
      locationHint: tasks.locationHint,
      points: tasks.points,
      maxAttempts: tasks.maxAttempts,
      roundId: tasks.roundId,
      isActive: tasks.isActive,
      roundName: rounds.name,
      roundNumber: rounds.roundNumber,
      roundStatus: rounds.status,
    })
    .from(tasks)
    .innerJoin(rounds, eq(tasks.roundId, rounds.id))
    .where(eq(tasks.id, qr.taskId));

  if (!task) {
    throw new NotFoundError('Task not found.');
  }

  if (!task.isActive) {
    throw new BadRequestError('This task is not active.');
  }

  if (task.roundStatus !== 'active') {
    if (task.roundStatus === 'paused') throw new BadRequestError('This round is currently paused.');
    if (task.roundStatus === 'completed') throw new BadRequestError('This round has ended.');
    throw new BadRequestError('This round has not started yet.');
  }

  // Check sequential access
  if (task.taskOrder > 1) {
    const [prevTask] = await db
      .select({ id: tasks.id })
      .from(tasks)
      .where(and(eq(tasks.roundId, task.roundId), eq(tasks.taskOrder, task.taskOrder - 1)));

    if (prevTask) {
      const [prevTeamTask] = await db
        .select({ isCompleted: teamTasks.isCompleted })
        .from(teamTasks)
        .where(and(eq(teamTasks.teamId, teamId), eq(teamTasks.taskId, prevTask.id)));

      if (!prevTeamTask?.isCompleted) {
        throw new ForbiddenError('Complete the previous task first.');
      }
    }
  }

  // Get team's progress on this task
  const [teamTask] = await db
    .select()
    .from(teamTasks)
    .where(and(eq(teamTasks.teamId, teamId), eq(teamTasks.taskId, task.id)));

  // Get total tasks in round for progress
  const totalTasks = await db
    .select({ count: sql`count(*)` })
    .from(tasks)
    .where(and(eq(tasks.roundId, task.roundId), eq(tasks.isActive, true)));

  const completedInRound = await db
    .select({ count: sql`count(*)` })
    .from(teamTasks)
    .innerJoin(tasks, eq(teamTasks.taskId, tasks.id))
    .where(and(
      eq(teamTasks.teamId, teamId),
      eq(teamTasks.isCompleted, true),
      eq(tasks.roundId, task.roundId)
    ));

  return {
    id: task.id,
    title: task.title || `Task ${task.taskOrder}`,
    taskOrder: task.taskOrder,
    question: task.question,
    points: task.points,
    maxAttempts: task.maxAttempts,
    roundName: task.roundName,
    roundNumber: task.roundNumber,
    isCompleted: teamTask?.isCompleted || false,
    locationHint: teamTask?.isCompleted ? task.locationHint : null,
    attemptsUsed: teamTask?.attempts || 0,
    attemptsRemaining: task.maxAttempts ? task.maxAttempts - (teamTask?.attempts || 0) : null,
    progress: {
      completed: parseInt(completedInRound[0]?.count || 0),
      total: parseInt(totalTasks[0]?.count || 0),
    },
  };
}
