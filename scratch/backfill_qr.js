import { db } from '../backend/src/db/index.js';
import { qrCodes, tasks } from '../backend/src/db/schema.js';
import { eq } from 'drizzle-orm';

async function backfill() {
  console.log('Backfilling locationId for existing QR codes...');
  
  const allQrs = await db.select({
    id: qrCodes.id,
    taskId: qrCodes.taskId,
  }).from(qrCodes);
  
  let count = 0;
  for (const qr of allQrs) {
    if (!qr.taskId) continue;
    
    const [task] = await db.select({ locationId: tasks.locationId }).from(tasks).where(eq(tasks.id, qr.taskId));
    if (task && task.locationId) {
      await db.update(qrCodes)
        .set({ locationId: task.locationId })
        .where(eq(qrCodes.id, qr.id));
      count++;
    }
  }
  
  console.log(`Updated ${count} QR codes with locationId.`);
  process.exit(0);
}

backfill().catch(console.error);
