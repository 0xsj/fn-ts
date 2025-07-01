// In src/scripts/create-test-user.ts
import { Kysely, sql } from 'kysely';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { Database } from '../../infrastructure/database/types';
import { createDatabase } from '../../infrastructure/database/connection';

async function createTestUser() {
  const db: Kysely<Database> = await createDatabase();

  try {
    // User data
    const userId = uuidv4();
    const email = 'test@example.com';
    const password = 'Test123!@#';
    const now = new Date();

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // 1. Create user
    await db
      .insertInto('users')
      .values({
        id: userId,
        first_name: 'Test',
        last_name: 'User',
        display_name: 'Test User',
        email: email.toLowerCase(),
        status: 'active',
        type: 'internal',
        email_verified: true,
        email_verified_at: now,
        phone_verified: false,
        timezone: 'UTC',
        locale: 'en',
        preferences: sql`${JSON.stringify({
          theme: 'system',
          language: 'en',
          dateFormat: 'YYYY-MM-DD',
          timeFormat: '24h',
          profileVisibility: 'organization',
          showOnlineStatus: true,
        })}`,
        cached_permissions: sql`'[]'`,
        custom_fields: sql`'{}'`,
        tags: sql`'[]'`,
        total_login_count: 0,
        created_at: now,
        updated_at: now,
      })
      .execute();

    // 2. Create password
    await db
      .insertInto('user_passwords')
      .values({
        id: uuidv4(),
        user_id: userId,
        password_hash: passwordHash,
        must_change: false,
        expires_at: null,
        created_at: now,
      })
      .execute();

    // 3. Create security record
    await db
      .insertInto('user_security')
      .values({
        user_id: userId,
        failed_login_attempts: 0,
        locked_until: null,
        last_login_at: null,
        last_login_ip: null,
        two_factor_enabled: false,
        two_factor_secret_id: null,
        last_password_change_at: now,
        password_history: sql`'[]'`,
        security_questions: sql`'[]'`,
        created_at: now,
        updated_at: now,
      })
      .execute();

    console.log('✅ Test user created successfully!');
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('User ID:', userId);
  } catch (error) {
    console.error('❌ Error creating test user:', error);
  } finally {
    await db.destroy();
  }
}

// Run the script
createTestUser();
