// src/infrastructure/database/repositories/__tests__/auth.repository.test.ts
import { Kysely } from 'kysely';
import { v4 as uuidv4 } from 'uuid';
import { AuthRepository } from '../auth.repository';
import { Database } from '../../types';
import { createDatabase } from '../../connection';
import { isSuccessResponse } from '../../../../shared/response';

// Test helper that matches your actual database schema
export function createTestUser(overrides?: Partial<any>) {
  const baseUser = {
    id: uuidv4(),
    first_name: 'Test',
    last_name: 'User',
    email: `test-${Date.now()}@example.com`,
    email_verified: false,
    phone: '1234567890',
    phone_verified: false,
    status: 'active' as const,
    type: 'internal' as const,
    timezone: 'UTC',
    locale: 'en',

    // JSON columns as strings (required fields)
    preferences: JSON.stringify({
      theme: 'system',
      language: 'en',
      date_format: 'YYYY-MM-DD',
      time_format: '24h',
      profile_visibility: 'organization',
      show_online_status: true,
    }),
    cached_permissions: JSON.stringify([]),
    custom_fields: JSON.stringify({}),
    tags: JSON.stringify([]),

    // Nullable fields
    display_name: null,
    username: null,
    email_verified_at: null,
    phone_verified_at: null,
    avatar_url: null,
    title: null,
    department: null,
    employee_id: null,
    organization_id: null,
    location_id: null,
    emergency_contact: null,
    permissions_updated_at: null,
    last_activity_at: null,
    total_login_count: 0,
    deleted_at: null,
    deleted_by: null,
    deactivated_reason: null,
  };

  return { ...baseUser, ...overrides } as any;
}

describe('AuthRepository Integration Tests', () => {
  let db: Kysely<Database>;
  let authRepository: AuthRepository;
  let testUserId: string;

  beforeAll(async () => {
    db = await createDatabase();
    authRepository = new AuthRepository(db);

    // Create a test user using the helper
    testUserId = uuidv4();
    await db
      .insertInto('users')
      .values(createTestUser({ id: testUserId }))
      .execute();
  });

  afterAll(async () => {
    // Cleanup test data
    await db.deleteFrom('sessions').where('user_id', '=', testUserId).execute();
    await db.deleteFrom('users').where('id', '=', testUserId).execute();
    await db.destroy();
  });

  describe('findSessionById', () => {
    it('should return null when session does not exist', async () => {
      const result = await authRepository.findSessionById('non-existent-id');

      expect(result.success).toBe(true);
      if (isSuccessResponse(result)) {
        expect(result.body().data).toBeNull();
      }
    });

    it('should return session when it exists', async () => {
      // Create test session
      const sessionId = uuidv4();
      const now = new Date();

      await db
        .insertInto('sessions')
        .values({
          id: sessionId,
          user_id: testUserId,
          token_hash: 'test-token-hash',
          refresh_token_hash: 'test-refresh-hash',
          device_type: 'web' as const,
          expires_at: new Date(now.getTime() + 3600000), // 1 hour
          refresh_expires_at: new Date(now.getTime() + 86400000), // 24 hours
          last_activity_at: now,
          // Use type assertion for fields not in TypeScript types
        } as any)
        .execute();

      // Test finding the session
      const result = await authRepository.findSessionById(sessionId);

      expect(result.success).toBe(true);
      if (isSuccessResponse(result)) {
        const session = result.body().data;
        expect(session).toBeDefined();
        expect(session?.id).toBe(sessionId);
        expect(session?.userId).toBe(testUserId);
        expect(session?.tokenHash).toBe('test-token-hash');
        expect(session?.deviceType).toBe('web');
        expect(session?.isActive).toBe(true);
      }

      // Cleanup
      await db.deleteFrom('sessions').where('id', '=', sessionId).execute();
    });

    it('should map all session fields correctly', async () => {
      const sessionId = uuidv4();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 3600000);

      await db
        .insertInto('sessions')
        .values({
          id: sessionId,
          user_id: testUserId,
          token_hash: 'hash-123',
          refresh_token_hash: 'refresh-123',
          device_id: 'device-123',
          device_name: 'Chrome on Mac',
          device_type: 'web' as const,
          user_agent: 'Mozilla/5.0...',
          ip_address: '192.168.1.1',
          expires_at: expiresAt,
          refresh_expires_at: new Date(now.getTime() + 86400000),
          idle_timeout_at: new Date(now.getTime() + 1800000),
          last_activity_at: now,
          revoked_at: null,
          revoked_by: null,
          revoke_reason: null,
          // Additional fields that exist in DB but not in types
          absolute_timeout_at: new Date(now.getTime() + 7200000),
          is_mfa_verified: true,
          security_stamp: 'stamp-123',
        } as any)
        .execute();

      const result = await authRepository.findSessionById(sessionId);

      expect(result.success).toBe(true);
      if (isSuccessResponse(result)) {
        const session = result.body().data;
        expect(session).toMatchObject({
          id: sessionId,
          userId: testUserId,
          tokenHash: 'hash-123',
          refreshTokenHash: 'refresh-123',
          deviceId: 'device-123',
          deviceName: 'Chrome on Mac',
          deviceType: 'web',
          userAgent: 'Mozilla/5.0...',
          ipAddress: '192.168.1.1',
          isActive: true,
          revokedAt: null,
          revokedBy: null,
          // Don't check fields that might not be in the Session type
        });
      }

      // Cleanup
      await db.deleteFrom('sessions').where('id', '=', sessionId).execute();
    });
  });
});
