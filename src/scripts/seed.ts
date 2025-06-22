// src/scripts/seed.ts
import 'dotenv/config';
import { createDatabase } from '../infrastructure/database/connection';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';

async function seed() {
  console.log('🌱 Starting database seeding...');
  
  const db = await createDatabase();
  
  try {
    // Check if data already exists
    const existingUsers = await db
      .selectFrom('users')
      .select('id')
      .limit(1)
      .execute();
    
    if (existingUsers.length > 0) {
      console.log('⚠️  Database already has data. Skipping seed.');
      return;
    }
    
    // Seed users
    console.log('Creating users...');
    const passwordHash = await bcrypt.hash('password123', 10);
    
    await db
      .insertInto('users')
      .values([
        {
          id: uuidv4(),
          first_name: 'Admin',
          last_name: 'User',
          email: 'admin@example.com',
          phone: '1234567890',
          password_hash: passwordHash,
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: uuidv4(),
          first_name: 'Test',
          last_name: 'User',
          email: 'test@example.com',
          phone: '0987654321',
          password_hash: passwordHash,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ])
      .execute();
    
    console.log('✅ Database seeded successfully!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

seed();