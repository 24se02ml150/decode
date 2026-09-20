import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { neon } from '@neondatabase/serverless';

async function seed() {
  const sql = neon(process.env.DATABASE_URL);

  const email = process.env.ADMIN_EMAIL || 'admin@qrcampushunt.com';
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  const hashedPassword = await bcrypt.hash(password, 12);

  // Check if admin exists
  const existing = await sql`SELECT id FROM users WHERE role = 'admin' AND email = ${email}`;
  
  if (existing.length > 0) {
    console.log('⚠️  Admin account already exists. Skipping seed.');
    return;
  }

  await sql`
    INSERT INTO users (team_id, team_name, email, password, role, is_active)
    VALUES ('ADMIN', 'Administrator', ${email}, ${hashedPassword}, 'admin', true)
  `;

  console.log('✅ Admin account created!');
  console.log(`   Email: ${email}`);
  console.log(`   Password: ${password}`);
  console.log('   ⚠️  Change the password after first login!');
}

seed().catch(console.error);
