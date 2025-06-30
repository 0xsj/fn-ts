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

  describe('createSession', () => {
    it('should create a session with minimal parameters', async () => {
      // Arrange
      const tokenHash = 'test-token-hash-' + Date.now();
      const refreshTokenHash = 'test-refresh-hash-' + Date.now();

      // Act
      const result = await authRepository.createSession(testUserId, tokenHash, refreshTokenHash);

      // Assert
      expect(result.success).toBe(true);
      if (isSuccessResponse(result)) {
        const session = result.body().data;

        // Basic fields
        expect(session.id).toBeDefined();
        expect(session.userId).toBe(testUserId);
        expect(session.tokenHash).toBe(tokenHash);
        expect(session.refreshTokenHash).toBe(refreshTokenHash);

        // Default device info
        expect(session.deviceType).toBe('web');
        expect(session.deviceId).toBeNull();
        expect(session.deviceName).toBeNull();
        expect(session.userAgent).toBeNull();
        expect(session.ipAddress).toBeNull();

        // Expiration times
        expect(session.expiresAt).toBeInstanceOf(Date);
        expect(session.refreshExpiresAt).toBeInstanceOf(Date);
        expect(session.idleTimeoutAt).toBeInstanceOf(Date);
        expect(session.absoluteTimeoutAt).toBeInstanceOf(Date);

        // Default expiration should be 1 hour for token
        const now = new Date();
        const tokenExpiry = session.expiresAt.getTime() - now.getTime();
        expect(tokenExpiry).toBeGreaterThan(3500000); // ~1 hour minus some test execution time
        expect(tokenExpiry).toBeLessThan(3610000); // ~1 hour plus some buffer

        // Other fields
        expect(session.isActive).toBe(true);
        expect(session.isMfaVerified).toBe(false);
        expect(session.securityStamp).toBeNull();
        expect(session.revokedAt).toBeNull();
        expect(session.revokedBy).toBeNull();
        expect(session.revokeReason).toBeNull();

        // Cleanup
        await db.deleteFrom('sessions').where('id', '=', session.id).execute();
      }
    });

    it('should create a session with full device info', async () => {
      // Arrange
      const tokenHash = 'test-token-hash-' + Date.now();
      const refreshTokenHash = 'test-refresh-hash-' + Date.now();
      const deviceInfo = {
        deviceId: 'device-123',
        deviceName: 'iPhone 12',
        deviceType: 'mobile' as const,
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X)',
        ipAddress: '192.168.1.100',
      };

      // Act
      const result = await authRepository.createSession(
        testUserId,
        tokenHash,
        refreshTokenHash,
        deviceInfo,
      );

      // Assert
      expect(result.success).toBe(true);
      if (isSuccessResponse(result)) {
        const session = result.body().data;

        expect(session.deviceId).toBe(deviceInfo.deviceId);
        expect(session.deviceName).toBe(deviceInfo.deviceName);
        expect(session.deviceType).toBe(deviceInfo.deviceType);
        expect(session.userAgent).toBe(deviceInfo.userAgent);
        expect(session.ipAddress).toBe(deviceInfo.ipAddress);

        // Cleanup
        await db.deleteFrom('sessions').where('id', '=', session.id).execute();
      }
    });

    it('should create a session with custom expiration time', async () => {
      // Arrange
      const tokenHash = 'test-token-hash-' + Date.now();
      const refreshTokenHash = 'test-refresh-hash-' + Date.now();
      const customExpiresIn = 7200; // 2 hours in seconds

      // Act
      const result = await authRepository.createSession(
        testUserId,
        tokenHash,
        refreshTokenHash,
        undefined,
        customExpiresIn,
      );

      // Assert
      expect(result.success).toBe(true);
      if (isSuccessResponse(result)) {
        const session = result.body().data;

        // Check custom expiration
        const now = new Date();
        const tokenExpiry = session.expiresAt.getTime() - now.getTime();
        expect(tokenExpiry).toBeGreaterThan(7190000); // ~2 hours minus some test execution time
        expect(tokenExpiry).toBeLessThan(7210000); // ~2 hours plus some buffer

        // Cleanup
        await db.deleteFrom('sessions').where('id', '=', session.id).execute();
      }
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      const invalidUserId = 'non-existent-user-id';
      const tokenHash = 'test-token-hash-' + Date.now();
      const refreshTokenHash = 'test-refresh-hash-' + Date.now();

      // Act
      const result = await authRepository.createSession(invalidUserId, tokenHash, refreshTokenHash);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.body().error.code).toBe('DATABASE_ERROR');

        // Type-check the details field
        const details = result.body().error.details;
        expect(details).toBeDefined();
        expect(details).toHaveProperty('operation', 'createSession');

        // Or alternatively, if you want to be more explicit:
        if (details && typeof details === 'object' && 'operation' in details) {
          expect(details.operation).toBe('createSession');
        }
      }
    });

    it('should verify session data is correctly stored in database', async () => {
      // Arrange
      const tokenHash = 'test-token-hash-' + Date.now();
      const refreshTokenHash = 'test-refresh-hash-' + Date.now();
      const deviceInfo = {
        deviceId: 'test-device',
        deviceName: 'Test Browser',
        deviceType: 'desktop' as const,
        userAgent: 'Test User Agent',
        ipAddress: '127.0.0.1',
      };

      // Act
      const result = await authRepository.createSession(
        testUserId,
        tokenHash,
        refreshTokenHash,
        deviceInfo,
        3600,
      );

      expect(result.success).toBe(true);
      if (isSuccessResponse(result)) {
        const session = result.body().data;

        // Verify in database
        const dbSession = await db
          .selectFrom('sessions')
          .selectAll()
          .where('id', '=', session.id)
          .executeTakeFirst();

        expect(dbSession).toBeDefined();
        expect(dbSession?.user_id).toBe(testUserId);
        expect(dbSession?.token_hash).toBe(tokenHash);
        expect(dbSession?.refresh_token_hash).toBe(refreshTokenHash);
        expect(dbSession?.device_id).toBe(deviceInfo.deviceId);
        expect(dbSession?.device_name).toBe(deviceInfo.deviceName);
        expect(dbSession?.device_type).toBe(deviceInfo.deviceType);
        expect(dbSession?.user_agent).toBe(deviceInfo.userAgent);
        expect(dbSession?.ip_address).toBe(deviceInfo.ipAddress);
        expect(dbSession?.is_mfa_verified).toBe(0); // MySQL boolean stored as 0/1
        expect(dbSession?.revoked_at).toBeNull();

        // Cleanup
        await db.deleteFrom('sessions').where('id', '=', session.id).execute();
      }
    });

    it('should create multiple sessions for the same user', async () => {
      // Arrange
      const sessions: string[] = [];

      // Act - Create 3 sessions
      for (let i = 0; i < 3; i++) {
        const result = await authRepository.createSession(
          testUserId,
          `token-hash-${i}-${Date.now()}`,
          `refresh-hash-${i}-${Date.now()}`,
          { deviceType: 'web' },
        );

        expect(result.success).toBe(true);
        if (isSuccessResponse(result)) {
          sessions.push(result.body().data.id);
        }
      }

      // Assert - Verify all sessions exist
      const dbSessions = await db
        .selectFrom('sessions')
        .select(['id'])
        .where('user_id', '=', testUserId)
        .where('id', 'in', sessions)
        .execute();

      expect(dbSessions).toHaveLength(3);

      // Cleanup
      await db.deleteFrom('sessions').where('id', 'in', sessions).execute();
    });
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

  describe('findSessionByTokenHash', () => {
    it('should return null when session does not exist', async () => {
      const result = await authRepository.findSessionByTokenHash('non-existent-token-hash');

      expect(result.success).toBe(true);
      if (isSuccessResponse(result)) {
        expect(result.body().data).toBeNull();
      }
    });

    it('should return session when found by token hash', async () => {
      // Create test session
      const sessionId = uuidv4();
      const tokenHash = `token-hash-${Date.now()}`;
      const now = new Date();

      await db
        .insertInto('sessions')
        .values({
          id: sessionId,
          user_id: testUserId,
          token_hash: tokenHash,
          refresh_token_hash: 'refresh-hash',
          device_type: 'web',
          expires_at: new Date(now.getTime() + 3600000),
          refresh_expires_at: new Date(now.getTime() + 86400000),
          last_activity_at: now,
        } as any)
        .execute();

      // Test finding by token hash
      const result = await authRepository.findSessionByTokenHash(tokenHash);

      expect(result.success).toBe(true);
      if (isSuccessResponse(result)) {
        const session = result.body().data;
        expect(session).toBeDefined();
        expect(session?.id).toBe(sessionId);
        expect(session?.tokenHash).toBe(tokenHash);
        expect(session?.userId).toBe(testUserId);
      }

      // Cleanup
      await db.deleteFrom('sessions').where('id', '=', sessionId).execute();
    });

    it('should handle database errors', async () => {
      // Create a mock that throws an error
      const mockDb = {
        selectFrom: jest.fn().mockReturnThis(),
        selectAll: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        executeTakeFirst: jest.fn().mockRejectedValue(new Error('Database connection lost')),
      };

      const repoWithMockDb = new AuthRepository(mockDb as any);
      const result = await repoWithMockDb.findSessionByTokenHash('any-token');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.body().error.code).toBe('DATABASE_ERROR');
        const details = result.body().error.details as { operation: string } | undefined;
        expect(details?.operation).toBe('findSessionByTokenHash');
      }
    });
  });

  describe('findSessionByRefreshTokenHash', () => {
    it('should return null when session does not exist', async () => {
      const result = await authRepository.findSessionByRefreshTokenHash(
        'non-existent-refresh-hash',
      );

      expect(result.success).toBe(true);
      if (isSuccessResponse(result)) {
        expect(result.body().data).toBeNull();
      }
    });

    it('should return session when found by refresh token hash', async () => {
      // Create test session
      const sessionId = uuidv4();
      const refreshTokenHash = `refresh-hash-${Date.now()}`;
      const now = new Date();

      await db
        .insertInto('sessions')
        .values({
          id: sessionId,
          user_id: testUserId,
          token_hash: 'token-hash',
          refresh_token_hash: refreshTokenHash,
          device_type: 'mobile',
          expires_at: new Date(now.getTime() + 3600000),
          refresh_expires_at: new Date(now.getTime() + 86400000),
          last_activity_at: now,
        } as any)
        .execute();

      // Test finding by refresh token hash
      const result = await authRepository.findSessionByRefreshTokenHash(refreshTokenHash);

      expect(result.success).toBe(true);
      if (isSuccessResponse(result)) {
        const session = result.body().data;
        expect(session).toBeDefined();
        expect(session?.id).toBe(sessionId);
        expect(session?.refreshTokenHash).toBe(refreshTokenHash);
        expect(session?.deviceType).toBe('mobile');
      }

      // Cleanup
      await db.deleteFrom('sessions').where('id', '=', sessionId).execute();
    });
  });

  describe('findActiveSessionsByUserId', () => {
    let activeSessionIds: string[] = [];
    let expiredSessionId: string;
    let revokedSessionId: string;

    beforeEach(async () => {
      const now = new Date();

      // Create active sessions
      for (let i = 0; i < 3; i++) {
        const sessionId = uuidv4();
        activeSessionIds.push(sessionId);

        await db
          .insertInto('sessions')
          .values({
            id: sessionId,
            user_id: testUserId,
            token_hash: `active-token-${i}-${Date.now()}`,
            refresh_token_hash: `active-refresh-${i}-${Date.now()}`,
            device_type: 'web',
            device_name: `Device ${i}`,
            expires_at: new Date(now.getTime() + 3600000), // 1 hour future
            refresh_expires_at: new Date(now.getTime() + 86400000),
            last_activity_at: now,
            revoked_at: null,
          } as any)
          .execute();
      }

      // Create expired session
      expiredSessionId = uuidv4();
      await db
        .insertInto('sessions')
        .values({
          id: expiredSessionId,
          user_id: testUserId,
          token_hash: `expired-token-${Date.now()}`,
          refresh_token_hash: `expired-refresh-${Date.now()}`,
          device_type: 'web',
          expires_at: new Date(now.getTime() - 3600000), // 1 hour past
          refresh_expires_at: new Date(now.getTime() - 86400000),
          last_activity_at: now,
          revoked_at: null,
        } as any)
        .execute();

      // Create revoked session
      revokedSessionId = uuidv4();
      await db
        .insertInto('sessions')
        .values({
          id: revokedSessionId,
          user_id: testUserId,
          token_hash: `revoked-token-${Date.now()}`,
          refresh_token_hash: `revoked-refresh-${Date.now()}`,
          device_type: 'web',
          expires_at: new Date(now.getTime() + 3600000), // Not expired
          refresh_expires_at: new Date(now.getTime() + 86400000),
          last_activity_at: now,
          revoked_at: now,
          revoked_by: testUserId,
          revoke_reason: 'User logged out',
        } as any)
        .execute();
    });

    afterEach(async () => {
      // Cleanup all test sessions
      const allSessionIds = [...activeSessionIds, expiredSessionId, revokedSessionId];
      await db.deleteFrom('sessions').where('id', 'in', allSessionIds).execute();
      activeSessionIds = [];
    });

    it('should return only active sessions for user', async () => {
      const result = await authRepository.findActiveSessionsByUserId(testUserId);

      expect(result.success).toBe(true);
      if (isSuccessResponse(result)) {
        const sessions = result.body().data;
        expect(sessions).toHaveLength(3);

        // All returned sessions should be active
        sessions.forEach((session) => {
          expect(session.isActive).toBe(true);
          expect(session.userId).toBe(testUserId);
          expect(session.expiresAt.getTime()).toBeGreaterThan(new Date().getTime());
          expect(activeSessionIds).toContain(session.id);
        });

        // Should not include expired or revoked sessions
        const sessionIds = sessions.map((s) => s.id);
        expect(sessionIds).not.toContain(expiredSessionId);
        expect(sessionIds).not.toContain(revokedSessionId);
      }
    });

    it('should return empty array when user has no active sessions', async () => {
      const nonExistentUserId = uuidv4();
      const result = await authRepository.findActiveSessionsByUserId(nonExistentUserId);

      expect(result.success).toBe(true);
      if (isSuccessResponse(result)) {
        expect(result.body().data).toEqual([]);
      }
    });
  });

  describe('findActiveSessionsByDeviceId', () => {
    it('should return null when no active session exists for device', async () => {
      const result = await authRepository.findActiveSessionsByDeviceId(
        testUserId,
        'non-existent-device',
      );

      expect(result.success).toBe(true);
      if (isSuccessResponse(result)) {
        expect(result.body().data).toBeNull();
      }
    });

    it('should return the most recent active session for a device', async () => {
      const deviceId = 'test-device-123';
      const now = new Date();

      // Create older session
      const olderSessionId = uuidv4();
      await db
        .insertInto('sessions')
        .values({
          id: olderSessionId,
          user_id: testUserId,
          token_hash: `old-token-${Date.now()}`,
          refresh_token_hash: `old-refresh-${Date.now()}`,
          device_id: deviceId,
          device_type: 'mobile',
          expires_at: new Date(now.getTime() + 3600000),
          refresh_expires_at: new Date(now.getTime() + 86400000),
          last_activity_at: now,
          created_at: new Date(now.getTime() - 7200000), // 2 hours ago
        } as any)
        .execute();

      // Create newer session
      const newerSessionId = uuidv4();
      await db
        .insertInto('sessions')
        .values({
          id: newerSessionId,
          user_id: testUserId,
          token_hash: `new-token-${Date.now()}`,
          refresh_token_hash: `new-refresh-${Date.now()}`,
          device_id: deviceId,
          device_type: 'mobile',
          expires_at: new Date(now.getTime() + 3600000),
          refresh_expires_at: new Date(now.getTime() + 86400000),
          last_activity_at: now,
          created_at: new Date(now.getTime() - 3600000), // 1 hour ago
        } as any)
        .execute();

      // Test
      const result = await authRepository.findActiveSessionsByDeviceId(testUserId, deviceId);

      expect(result.success).toBe(true);
      if (isSuccessResponse(result)) {
        const session = result.body().data;
        expect(session).toBeDefined();
        expect(session?.id).toBe(newerSessionId); // Should return the newer one
        expect(session?.deviceId).toBe(deviceId);
      }

      // Cleanup
      await db.deleteFrom('sessions').where('id', 'in', [olderSessionId, newerSessionId]).execute();
    });

    it('should not return expired or revoked sessions', async () => {
      const deviceId = 'test-device-456';
      const now = new Date();

      // Create expired session
      const expiredSessionId = uuidv4();
      await db
        .insertInto('sessions')
        .values({
          id: expiredSessionId,
          user_id: testUserId,
          token_hash: `expired-device-token-${Date.now()}`,
          refresh_token_hash: `expired-device-refresh-${Date.now()}`,
          device_id: deviceId,
          device_type: 'desktop',
          expires_at: new Date(now.getTime() - 3600000), // Expired
          refresh_expires_at: new Date(now.getTime() - 86400000),
          last_activity_at: now,
        } as any)
        .execute();

      // Create revoked session
      const revokedSessionId = uuidv4();
      await db
        .insertInto('sessions')
        .values({
          id: revokedSessionId,
          user_id: testUserId,
          token_hash: `revoked-device-token-${Date.now()}`,
          refresh_token_hash: `revoked-device-refresh-${Date.now()}`,
          device_id: deviceId,
          device_type: 'desktop',
          expires_at: new Date(now.getTime() + 3600000),
          refresh_expires_at: new Date(now.getTime() + 86400000),
          last_activity_at: now,
          revoked_at: now,
        } as any)
        .execute();

      // Test
      const result = await authRepository.findActiveSessionsByDeviceId(testUserId, deviceId);

      expect(result.success).toBe(true);
      if (isSuccessResponse(result)) {
        expect(result.body().data).toBeNull();
      }

      // Cleanup
      await db
        .deleteFrom('sessions')
        .where('id', 'in', [expiredSessionId, revokedSessionId])
        .execute();
    });

    it('should return session only for the specified user and device combination', async () => {
      const deviceId = 'shared-device-789';
      const otherUserId = uuidv4();
      const now = new Date();

      // Create session for test user
      const testUserSessionId = uuidv4();
      await db
        .insertInto('sessions')
        .values({
          id: testUserSessionId,
          user_id: testUserId,
          token_hash: `test-user-token-${Date.now()}`,
          refresh_token_hash: `test-user-refresh-${Date.now()}`,
          device_id: deviceId,
          device_type: 'web',
          expires_at: new Date(now.getTime() + 3600000),
          refresh_expires_at: new Date(now.getTime() + 86400000),
          last_activity_at: now,
        } as any)
        .execute();

      // Create another user first
      await db
        .insertInto('users')
        .values(createTestUser({ id: otherUserId }))
        .execute();

      // Create session for other user on same device
      const otherUserSessionId = uuidv4();
      await db
        .insertInto('sessions')
        .values({
          id: otherUserSessionId,
          user_id: otherUserId,
          token_hash: `other-user-token-${Date.now()}`,
          refresh_token_hash: `other-user-refresh-${Date.now()}`,
          device_id: deviceId,
          device_type: 'web',
          expires_at: new Date(now.getTime() + 3600000),
          refresh_expires_at: new Date(now.getTime() + 86400000),
          last_activity_at: now,
        } as any)
        .execute();

      // Test - should only return session for test user
      const result = await authRepository.findActiveSessionsByDeviceId(testUserId, deviceId);

      expect(result.success).toBe(true);
      if (isSuccessResponse(result)) {
        const session = result.body().data;
        expect(session).toBeDefined();
        expect(session?.id).toBe(testUserSessionId);
        expect(session?.userId).toBe(testUserId);
      }

      // Cleanup
      await db
        .deleteFrom('sessions')
        .where('id', 'in', [testUserSessionId, otherUserSessionId])
        .execute();
      await db.deleteFrom('users').where('id', '=', otherUserId).execute();
    });
  });
});
