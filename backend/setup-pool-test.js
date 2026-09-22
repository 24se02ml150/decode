import { db } from './src/db/index.js';
import { events, rounds, locations, tasks, qrCodes, locationTaskPool, users } from './src/db/schema.js';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

async function setup() {
  try {
    // 1. Get first active event & round
    const [event] = await db.select().from(events).where(eq(events.status, 'active'));
    if (!event) throw new Error('No active event');

    const [round] = await db.select().from(rounds).where(eq(rounds.eventId, event.id)).where(eq(rounds.status, 'active'));
    if (!round) throw new Error('No active round');

    // 2. Create pool location
    const [location] = await db.insert(locations).values({
      eventId: event.id,
      name: 'Test Pool Location',
      taskPoolMode: 'pool'
    }).returning();

    // 3. Create 3 tasks
    const newTasks = [];
    for (let i = 1; i <= 3; i++) {
      const [t] = await db.insert(tasks).values({
        roundId: round.id,
        title: `Pool Task ${i}`,
        taskOrder: 100 + i, // dummy order
        question: `Question for pool task ${i}`,
        correctAnswer: `Answer ${i}`,
      }).returning();
      newTasks.push(t);
    }

    // 4. Map tasks to location pool
    for (const t of newTasks) {
      await db.insert(locationTaskPool).values({
        locationId: location.id,
        taskId: t.id
      });
    }

    // 5. Create Location QR Code
    const secureToken = crypto.randomBytes(32).toString('hex');
    await db.insert(qrCodes).values({
      locationId: location.id,
      secureToken,
    });

    console.log(`Pool Location created: ${location.id}`);
    console.log(`Tasks: ${newTasks.map(t => t.id).join(', ')}`);
    console.log(`QR Token: ${secureToken}`);
    console.log(`Round ID: ${round.id}`);
    
    // 6. Get a team
    const [team] = await db.select().from(users).where(eq(users.role, 'team')).limit(1);
    console.log(`Test Team ID: ${team.id} (${team.teamName})`);
    
    // 7. Make API request to simulate QR scan
    const token = secureToken; // The token to use in curl
    console.log(`Test with curl -X GET http://localhost:5000/api/team/tasks/${token}`);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

setup();
