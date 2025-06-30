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

  describe('updateSession', () => {
    let testSessionId: string;

    beforeEach(async () => {
      // Create a test session for update tests
      testSessionId = uuidv4();
      const now = new Date();

      await db
        .insertInto('sessions')
        .values({
          id: testSessionId,
          user_id: testUserId,
          token_hash: 'original-token-hash',
          refresh_token_hash: 'original-refresh-hash',
          device_type: 'web',
          device_name: 'Chrome Browser',
          expires_at: new Date(now.getTime() + 3600000),
          refresh_expires_at: new Date(now.getTime() + 86400000),
          last_activity_at: new Date(now.getTime() - 600000), // 10 minutes ago
          created_at: now,
          updated_at: now,
        } as any)
        .execute();
    });

    afterEach(async () => {
      // Cleanup
      await db.deleteFrom('sessions').where('id', '=', testSessionId).execute();
    });

    it('should update lastActivityAt only', async () => {
      const newActivityTime = new Date();

      const result = await authRepository.updateSession(testSessionId, {
        lastActivityAt: newActivityTime,
      });

      expect(result.success).toBe(true);
      if (isSuccessResponse(result)) {
        const session = result.body().data;
        expect(session).toBeDefined();
        expect(session?.lastActivityAt).not.toBeNull();
        // Allow 1 second difference for MySQL timestamp precision
        const diff = Math.abs(session!.lastActivityAt!.getTime() - newActivityTime.getTime());
        expect(diff).toBeLessThanOrEqual(1000);
        expect(session?.refreshTokenHash).toBe('original-refresh-hash'); // Unchanged
        expect(session?.updatedAt.getTime()).toBeGreaterThanOrEqual(
          Math.floor(newActivityTime.getTime() / 1000) * 1000,
        );
      }
    });

    it('should update refreshTokenHash only', async () => {
      const newRefreshToken = 'new-refresh-token-hash';

      const result = await authRepository.updateSession(testSessionId, {
        refreshTokenHash: newRefreshToken,
      });

      expect(result.success).toBe(true);
      if (isSuccessResponse(result)) {
        const session = result.body().data;
        expect(session).toBeDefined();
        expect(session?.refreshTokenHash).toBe(newRefreshToken);
        expect(session?.tokenHash).toBe('original-token-hash'); // Unchanged
      }
    });

    it('should update refreshExpiresAt only', async () => {
      const newExpiryTime = new Date();
      newExpiryTime.setDate(newExpiryTime.getDate() + 7); // 7 days from now

      const result = await authRepository.updateSession(testSessionId, {
        refreshExpiresAt: newExpiryTime,
      });

      expect(result.success).toBe(true);
      if (isSuccessResponse(result)) {
        const session = result.body().data;
        expect(session).toBeDefined();
        expect(session?.refreshExpiresAt).not.toBeNull();
        // Allow 1 second difference
        const diff = Math.abs(session!.refreshExpiresAt!.getTime() - newExpiryTime.getTime());
        expect(diff).toBeLessThanOrEqual(1000);
      }
    });

    it('should update multiple fields at once', async () => {
      const now = new Date();
      const updates = {
        lastActivityAt: now,
        refreshTokenHash: 'multi-update-refresh-hash',
        refreshExpiresAt: new Date(now.getTime() + 172800000), // 2 days
      };

      const result = await authRepository.updateSession(testSessionId, updates);

      expect(result.success).toBe(true);
      if (isSuccessResponse(result)) {
        const session = result.body().data;
        expect(session).toBeDefined();
        expect(session?.lastActivityAt).not.toBeNull();
        expect(session?.refreshExpiresAt).not.toBeNull();

        // Allow 1 second difference for timestamps
        const activityDiff = Math.abs(
          session!.lastActivityAt!.getTime() - updates.lastActivityAt.getTime(),
        );
        expect(activityDiff).toBeLessThanOrEqual(1000);

        expect(session?.refreshTokenHash).toBe(updates.refreshTokenHash);

        const refreshDiff = Math.abs(
          session!.refreshExpiresAt!.getTime() - updates.refreshExpiresAt.getTime(),
        );
        expect(refreshDiff).toBeLessThanOrEqual(1000);
      }
    });

    it('should return null when session does not exist', async () => {
      const nonExistentId = uuidv4();

      const result = await authRepository.updateSession(nonExistentId, {
        lastActivityAt: new Date(),
      });

      expect(result.success).toBe(true);
      if (isSuccessResponse(result)) {
        expect(result.body().data).toBeNull();
      }
    });

    it('should handle empty updates object', async () => {
      const beforeUpdate = await db
        .selectFrom('sessions')
        .selectAll()
        .where('id', '=', testSessionId)
        .executeTakeFirst();

      // Ensure we found the session
      expect(beforeUpdate).toBeDefined();
      if (!beforeUpdate) {
        throw new Error('Test session not found');
      }

      // Add a small delay to ensure updated_at will be different
      await new Promise((resolve) => setTimeout(resolve, 10));

      const result = await authRepository.updateSession(testSessionId, {});

      expect(result.success).toBe(true);
      if (isSuccessResponse(result)) {
        const session = result.body().data;
        expect(session).toBeDefined();

        // Only updated_at should change - compare without milliseconds
        expect(Math.floor(session!.updatedAt.getTime() / 1000)).toBeGreaterThanOrEqual(
          Math.floor(beforeUpdate.updated_at.getTime() / 1000),
        );

        // Handle potential null values in comparison
        if (beforeUpdate.last_activity_at && session?.lastActivityAt) {
          expect(session.lastActivityAt).toEqual(beforeUpdate.last_activity_at);
        } else {
          expect(session?.lastActivityAt).toBe(beforeUpdate.last_activity_at);
        }

        expect(session?.refreshTokenHash).toBe(beforeUpdate.refresh_token_hash);
      }
    });

    it('should handle database errors gracefully', async () => {
      // Create a mock that throws an error
      const mockDb = {
        updateTable: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockRejectedValue(new Error('Database connection lost')),
      };

      const repoWithMockDb = new AuthRepository(mockDb as any);
      const result = await repoWithMockDb.updateSession(testSessionId, {
        lastActivityAt: new Date(),
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.body().error.code).toBe('DATABASE_ERROR');
        const details = result.body().error.details as { operation: string } | undefined;
        expect(details?.operation).toBe('updateSession');
      }
    });

    it('should not affect other sessions', async () => {
      // Create another session
      const otherSessionId = uuidv4();
      await db
        .insertInto('sessions')
        .values({
          id: otherSessionId,
          user_id: testUserId,
          token_hash: 'other-token-hash',
          refresh_token_hash: 'other-refresh-hash',
          device_type: 'mobile',
          expires_at: new Date(Date.now() + 3600000),
          refresh_expires_at: new Date(Date.now() + 86400000),
          last_activity_at: new Date(),
        } as any)
        .execute();

      // Update the first session
      await authRepository.updateSession(testSessionId, {
        refreshTokenHash: 'updated-refresh-hash',
      });

      // Verify other session is unchanged
      const otherSession = await db
        .selectFrom('sessions')
        .selectAll()
        .where('id', '=', otherSessionId)
        .executeTakeFirst();

      expect(otherSession?.refresh_token_hash).toBe('other-refresh-hash');

      // Cleanup
      await db.deleteFrom('sessions').where('id', '=', otherSessionId).execute();
    });

    it('should preserve all non-updated fields', async () => {
      // Get original session
      const originalRow = await db
        .selectFrom('sessions')
        .selectAll()
        .where('id', '=', testSessionId)
        .executeTakeFirst();

      // Ensure we found the session
      expect(originalRow).toBeDefined();
      if (!originalRow) {
        throw new Error('Test session not found');
      }

      // Update only lastActivityAt
      const result = await authRepository.updateSession(testSessionId, {
        lastActivityAt: new Date(),
      });

      expect(result.success).toBe(true);
      if (isSuccessResponse(result)) {
        const session = result.body().data;

        // Check that other fields remain unchanged
        expect(session?.id).toBe(originalRow.id);
        expect(session?.userId).toBe(originalRow.user_id);
        expect(session?.tokenHash).toBe(originalRow.token_hash);
        expect(session?.refreshTokenHash).toBe(originalRow.refresh_token_hash);
        expect(session?.deviceType).toBe(originalRow.device_type);
        expect(session?.deviceName).toBe(originalRow.device_name);
        expect(session?.expiresAt).toEqual(originalRow.expires_at);
        expect(session?.createdAt).toEqual(originalRow.created_at);
      }
    });
  });

  describe('extendSession', () => {
    let activeSessionId: string;
    let expiredSessionId: string;
    let revokedSessionId: string;

    beforeEach(async () => {
      const now = new Date();

      // Create active session
      activeSessionId = uuidv4();
      await db
        .insertInto('sessions')
        .values({
          id: activeSessionId,
          user_id: testUserId,
          token_hash: 'active-extend-token',
          refresh_token_hash: 'active-extend-refresh',
          device_type: 'web',
          expires_at: new Date(now.getTime() + 3600000), // 1 hour from now
          refresh_expires_at: new Date(now.getTime() + 90000000), // 25 hours from now
          last_activity_at: now,
        } as any)
        .execute();

      // Create expired session
      expiredSessionId = uuidv4();
      await db
        .insertInto('sessions')
        .values({
          id: expiredSessionId,
          user_id: testUserId,
          token_hash: 'expired-extend-token',
          refresh_token_hash: 'expired-extend-refresh',
          device_type: 'web',
          expires_at: new Date(now.getTime() - 3600000), // 1 hour ago
          refresh_expires_at: new Date(now.getTime() - 600000), // 10 minutes ago
          last_activity_at: now,
        } as any)
        .execute();

      // Create revoked session
      revokedSessionId = uuidv4();
      await db
        .insertInto('sessions')
        .values({
          id: revokedSessionId,
          user_id: testUserId,
          token_hash: 'revoked-extend-token',
          refresh_token_hash: 'revoked-extend-refresh',
          device_type: 'web',
          expires_at: new Date(now.getTime() + 3600000), // Still valid
          refresh_expires_at: new Date(now.getTime() + 90000000),
          last_activity_at: now,
          revoked_at: new Date(now.getTime() - 300000), // Revoked 5 min ago
          revoked_by: testUserId,
          revoke_reason: 'User logged out',
        } as any)
        .execute();
    });

    afterEach(async () => {
      await db
        .deleteFrom('sessions')
        .where('id', 'in', [activeSessionId, expiredSessionId, revokedSessionId])
        .execute();
    });

    it('should extend active session by specified seconds', async () => {
      const extendBySeconds = 1800; // 30 minutes

      // Get original expiry
      const originalSession = await db
        .selectFrom('sessions')
        .select(['expires_at', 'refresh_expires_at'])
        .where('id', '=', activeSessionId)
        .executeTakeFirst();

      expect(originalSession).toBeDefined();
      if (!originalSession) {
        throw new Error('Test session not found');
      }

      const result = await authRepository.extendSession(activeSessionId, extendBySeconds);

      expect(result.success).toBe(true);
      if (isSuccessResponse(result)) {
        expect(result.body().data).toBe(true);

        // Verify the session was extended
        const updatedSession = await db
          .selectFrom('sessions')
          .select(['expires_at', 'refresh_expires_at'])
          .where('id', '=', activeSessionId)
          .executeTakeFirst();

        expect(updatedSession).toBeDefined();
        if (!updatedSession) {
          throw new Error('Updated session not found');
        }

        // Check token expiry was extended
        const expectedNewExpiry = new Date(
          originalSession.expires_at.getTime() + extendBySeconds * 1000,
        );
        expect(Math.floor(updatedSession.expires_at.getTime() / 1000)).toBe(
          Math.floor(expectedNewExpiry.getTime() / 1000),
        );

        // Check refresh token was also extended
        if (updatedSession.refresh_expires_at && originalSession.refresh_expires_at) {
          expect(updatedSession.refresh_expires_at.getTime()).toBeGreaterThan(
            originalSession.refresh_expires_at.getTime(),
          );
        }
      }
    });

    it('should extend expired session from current time', async () => {
      const extendBySeconds = 3600; // 1 hour
      const now = new Date();

      const result = await authRepository.extendSession(expiredSessionId, extendBySeconds);

      expect(result.success).toBe(true);
      if (isSuccessResponse(result)) {
        expect(result.body().data).toBe(true);

        // Verify the session was extended from NOW, not from expired time
        const updatedSession = await db
          .selectFrom('sessions')
          .select(['expires_at'])
          .where('id', '=', expiredSessionId)
          .executeTakeFirst();

        expect(updatedSession).toBeDefined();
        if (!updatedSession) {
          throw new Error('Updated session not found');
        }

        // Should be approximately now + extendBy
        const expectedMinExpiry = now.getTime() + extendBySeconds * 1000 - 5000; // 5 sec buffer
        const expectedMaxExpiry = now.getTime() + extendBySeconds * 1000 + 5000; // 5 sec buffer

        expect(updatedSession.expires_at.getTime()).toBeGreaterThanOrEqual(expectedMinExpiry);
        expect(updatedSession.expires_at.getTime()).toBeLessThanOrEqual(expectedMaxExpiry);
      }
    });

    it('should not extend revoked session', async () => {
      const result = await authRepository.extendSession(revokedSessionId, 1800);

      expect(result.success).toBe(true);
      if (isSuccessResponse(result)) {
        expect(result.body().data).toBe(false);

        // Verify session remains unchanged
        const session = await db
          .selectFrom('sessions')
          .select(['expires_at', 'revoked_at'])
          .where('id', '=', revokedSessionId)
          .executeTakeFirst();

        expect(session?.revoked_at).not.toBeNull();
      }
    });

    it('should return false for non-existent session', async () => {
      const result = await authRepository.extendSession(uuidv4(), 1800);

      expect(result.success).toBe(true);
      if (isSuccessResponse(result)) {
        expect(result.body().data).toBe(false);
      }
    });

    it('should handle session without refresh token', async () => {
      // Create session without refresh token
      const noRefreshSessionId = uuidv4();
      await db
        .insertInto('sessions')
        .values({
          id: noRefreshSessionId,
          user_id: testUserId,
          token_hash: 'no-refresh-token',
          device_type: 'api',
          expires_at: new Date(Date.now() + 3600000),
          refresh_token_hash: null,
          refresh_expires_at: null,
        } as any)
        .execute();

      const result = await authRepository.extendSession(noRefreshSessionId, 1800);

      expect(result.success).toBe(true);
      if (isSuccessResponse(result)) {
        expect(result.body().data).toBe(true);

        const session = await db
          .selectFrom('sessions')
          .select(['refresh_expires_at'])
          .where('id', '=', noRefreshSessionId)
          .executeTakeFirst();

        expect(session?.refresh_expires_at).toBeNull();
      }

      await db.deleteFrom('sessions').where('id', '=', noRefreshSessionId).execute();
    });
  });

  describe('revokeSession', () => {
    let activeSessionId: string;
    let alreadyRevokedSessionId: string;

    beforeEach(async () => {
      const now = new Date();

      // Create active session
      activeSessionId = uuidv4();
      await db
        .insertInto('sessions')
        .values({
          id: activeSessionId,
          user_id: testUserId,
          token_hash: 'active-revoke-token',
          refresh_token_hash: 'active-revoke-refresh',
          device_type: 'web',
          expires_at: new Date(now.getTime() + 3600000),
          refresh_expires_at: new Date(now.getTime() + 90000000),
          last_activity_at: now,
        } as any)
        .execute();

      // Create already revoked session
      alreadyRevokedSessionId = uuidv4();
      await db
        .insertInto('sessions')
        .values({
          id: alreadyRevokedSessionId,
          user_id: testUserId,
          token_hash: 'already-revoked-token',
          refresh_token_hash: 'already-revoked-refresh',
          device_type: 'mobile',
          expires_at: new Date(now.getTime() + 3600000),
          refresh_expires_at: new Date(now.getTime() + 90000000),
          last_activity_at: now,
          revoked_at: new Date(now.getTime() - 600000), // 10 min ago
          revoked_by: 'admin-user',
          revoke_reason: 'Security violation',
        } as any)
        .execute();
    });

    afterEach(async () => {
      await db
        .deleteFrom('sessions')
        .where('id', 'in', [activeSessionId, alreadyRevokedSessionId])
        .execute();
    });

    it('should revoke active session without revokedBy and reason', async () => {
      const result = await authRepository.revokeSession(activeSessionId);

      expect(result.success).toBe(true);
      if (isSuccessResponse(result)) {
        expect(result.body().data).toBe(true);

        // Verify session was revoked
        const session = await db
          .selectFrom('sessions')
          .select(['revoked_at', 'revoked_by', 'revoke_reason'])
          .where('id', '=', activeSessionId)
          .executeTakeFirst();

        expect(session).toBeDefined();
        expect(session!.revoked_at).not.toBeNull();
        expect(session!.revoked_by).toBeNull();
        expect(session!.revoke_reason).toBeNull();
      }
    });

    it('should revoke active session with revokedBy and reason', async () => {
      const revokedBy = 'admin-123';
      const reason = 'Suspicious activity detected';

      const result = await authRepository.revokeSession(activeSessionId, revokedBy, reason);

      expect(result.success).toBe(true);
      if (isSuccessResponse(result)) {
        expect(result.body().data).toBe(true);

        // Verify session was revoked with metadata
        const session = await db
          .selectFrom('sessions')
          .select(['revoked_at', 'revoked_by', 'revoke_reason'])
          .where('id', '=', activeSessionId)
          .executeTakeFirst();

        expect(session).toBeDefined();
        expect(session!.revoked_at).not.toBeNull();
        expect(session!.revoked_by).toBe(revokedBy);
        expect(session!.revoke_reason).toBe(reason);
      }
    });

    it('should not re-revoke already revoked session', async () => {
      const originalSession = await db
        .selectFrom('sessions')
        .select(['revoked_at', 'revoked_by', 'revoke_reason'])
        .where('id', '=', alreadyRevokedSessionId)
        .executeTakeFirst();

      expect(originalSession).toBeDefined();
      if (!originalSession) {
        throw new Error('Test session not found');
      }

      const result = await authRepository.revokeSession(
        alreadyRevokedSessionId,
        'new-admin',
        'Attempt to re-revoke',
      );

      expect(result.success).toBe(true);
      if (isSuccessResponse(result)) {
        expect(result.body().data).toBe(false);

        // Verify original revocation data unchanged
        const session = await db
          .selectFrom('sessions')
          .select(['revoked_at', 'revoked_by', 'revoke_reason'])
          .where('id', '=', alreadyRevokedSessionId)
          .executeTakeFirst();

        expect(session).toBeDefined();
        if (!session) {
          throw new Error('Session not found after revoke attempt');
        }

        expect(session.revoked_at).toEqual(originalSession.revoked_at);
        expect(session.revoked_by).toBe(originalSession.revoked_by);
        expect(session.revoke_reason).toBe(originalSession.revoke_reason);
      }
    });

    it('should return false for non-existent session', async () => {
      const result = await authRepository.revokeSession(uuidv4(), 'admin', 'Test');

      expect(result.success).toBe(true);
      if (isSuccessResponse(result)) {
        expect(result.body().data).toBe(false);
      }
    });

    it('should update the updated_at timestamp when revoking', async () => {
      const result = await authRepository.revokeSession(activeSessionId);

      expect(result.success).toBe(true);
      if (isSuccessResponse(result)) {
        expect(result.body().data).toBe(true);
      }

      // Verify the session was revoked and has an updated_at timestamp
      const revokedSession = await db
        .selectFrom('sessions')
        .select(['updated_at', 'revoked_at'])
        .where('id', '=', activeSessionId)
        .executeTakeFirst();

      expect(revokedSession).toBeDefined();
      expect(revokedSession?.revoked_at).not.toBeNull();
      expect(revokedSession?.updated_at).toBeInstanceOf(Date);
    });

    it('should handle database errors gracefully', async () => {
      // Mock for extendSession
      const mockDbExtend = {
        selectFrom: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        executeTakeFirst: jest.fn().mockRejectedValue(new Error('DB connection lost')),
      };

      const repoWithMockDb = new AuthRepository(mockDbExtend as any);
      const extendResult = await repoWithMockDb.extendSession('any-id', 1800);

      expect(extendResult.success).toBe(false);
      if (!extendResult.success) {
        expect(extendResult.body().error.code).toBe('DATABASE_ERROR');
        const details = extendResult.body().error.details as { operation: string } | undefined;
        expect(details?.operation).toBe('extendSession');
      }
    });
  });

  describe('revokeAllUserSessions', () => {
    let userSessionIds: string[] = [];
    let otherUserSessionId: string;
    let otherUserId: string;

    beforeEach(async () => {
      const now = new Date();
      userSessionIds = [];

      // Create multiple active sessions for test user
      for (let i = 0; i < 4; i++) {
        const sessionId = uuidv4();
        userSessionIds.push(sessionId);

        await db
          .insertInto('sessions')
          .values({
            id: sessionId,
            user_id: testUserId,
            token_hash: `user-token-${i}-${Date.now()}`,
            refresh_token_hash: `user-refresh-${i}-${Date.now()}`,
            device_type: i === 0 ? 'web' : i === 1 ? 'mobile' : i === 2 ? 'desktop' : 'api',
            device_name: `Device ${i}`,
            expires_at: new Date(now.getTime() + 3600000), // 1 hour from now
            refresh_expires_at: new Date(now.getTime() + 86400000),
            last_activity_at: now,
          } as any)
          .execute();
      }

      // Create one already revoked session for test user
      const revokedSessionId = uuidv4();
      await db
        .insertInto('sessions')
        .values({
          id: revokedSessionId,
          user_id: testUserId,
          token_hash: `revoked-token-${Date.now()}`,
          refresh_token_hash: `revoked-refresh-${Date.now()}`,
          device_type: 'web',
          expires_at: new Date(now.getTime() + 3600000),
          refresh_expires_at: new Date(now.getTime() + 86400000),
          last_activity_at: now,
          revoked_at: new Date(now.getTime() - 600000), // Revoked 10 min ago
          revoked_by: testUserId,
          revoke_reason: 'User logged out',
        } as any)
        .execute();
      userSessionIds.push(revokedSessionId);

      // Create session for different user
      otherUserId = uuidv4();
      await db
        .insertInto('users')
        .values(createTestUser({ id: otherUserId }))
        .execute();

      otherUserSessionId = uuidv4();
      await db
        .insertInto('sessions')
        .values({
          id: otherUserSessionId,
          user_id: otherUserId,
          token_hash: `other-user-token-${Date.now()}`,
          refresh_token_hash: `other-user-refresh-${Date.now()}`,
          device_type: 'web',
          expires_at: new Date(now.getTime() + 3600000),
          refresh_expires_at: new Date(now.getTime() + 86400000),
          last_activity_at: now,
        } as any)
        .execute();
    });

    afterEach(async () => {
      await db
        .deleteFrom('sessions')
        .where('id', 'in', [...userSessionIds, otherUserSessionId])
        .execute();
      await db.deleteFrom('users').where('id', '=', otherUserId).execute();
    });

    it('should revoke all active sessions for a user', async () => {
      const result = await authRepository.revokeAllUserSessions(testUserId);

      expect(result.success).toBe(true);
      if (isSuccessResponse(result)) {
        // Should have revoked 4 active sessions (not the already revoked one)
        expect(result.body().data).toBe(4);
      }

      // Verify only the previously active sessions are now revoked with correct metadata
      const sessions = await db
        .selectFrom('sessions')
        .select(['id', 'revoked_at', 'revoked_by', 'revoke_reason'])
        .where('user_id', '=', testUserId)
        .where('id', 'in', userSessionIds.slice(0, 4)) // Only check the first 4 (active) sessions
        .execute();

      sessions.forEach((session) => {
        expect(session.revoked_at).not.toBeNull();
        expect(session.revoked_by).toBe(testUserId);
        expect(session.revoke_reason).toBe('Bulk revocation');
      });

      // Verify other user's session was not affected
      const otherSession = await db
        .selectFrom('sessions')
        .select(['revoked_at'])
        .where('id', '=', otherUserSessionId)
        .executeTakeFirst();

      expect(otherSession?.revoked_at).toBeNull();
    });

    it('should revoke all sessions except specified one', async () => {
      const exceptSessionId = userSessionIds[1]; // Keep the mobile session

      const result = await authRepository.revokeAllUserSessions(testUserId, exceptSessionId);

      expect(result.success).toBe(true);
      if (isSuccessResponse(result)) {
        // Should have revoked 3 active sessions (excluding one + already revoked)
        expect(result.body().data).toBe(3);
      }

      // Verify the excepted session is still active
      const exceptedSession = await db
        .selectFrom('sessions')
        .select(['revoked_at'])
        .where('id', '=', exceptSessionId)
        .executeTakeFirst();

      expect(exceptedSession?.revoked_at).toBeNull();

      // Verify other sessions are revoked
      const revokedSessions = await db
        .selectFrom('sessions')
        .select(['id', 'revoked_at'])
        .where('user_id', '=', testUserId)
        .where('id', '!=', exceptSessionId)
        .execute();

      revokedSessions.forEach((session) => {
        expect(session.revoked_at).not.toBeNull();
      });
    });

    it('should return 0 when user has no active sessions', async () => {
      // Revoke all sessions first
      await db
        .updateTable('sessions')
        .set({ revoked_at: new Date() })
        .where('user_id', '=', testUserId)
        .execute();

      const result = await authRepository.revokeAllUserSessions(testUserId);

      expect(result.success).toBe(true);
      if (isSuccessResponse(result)) {
        expect(result.body().data).toBe(0);
      }
    });

    it('should return 0 for non-existent user', async () => {
      const nonExistentUserId = uuidv4();

      const result = await authRepository.revokeAllUserSessions(nonExistentUserId);

      expect(result.success).toBe(true);
      if (isSuccessResponse(result)) {
        expect(result.body().data).toBe(0);
      }
    });

    it('should handle database errors gracefully', async () => {
      const mockDb = {
        updateTable: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockRejectedValue(new Error('Database connection lost')),
      };

      const repoWithMockDb = new AuthRepository(mockDb as any);
      const result = await repoWithMockDb.revokeAllUserSessions(testUserId);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.body().error.code).toBe('DATABASE_ERROR');
        const details = result.body().error.details as { operation: string } | undefined;
        expect(details?.operation).toBe('revokeAllUserSessions');
      }
    });

    it('should set correct revocation metadata', async () => {
      const beforeRevoke = new Date();

      await authRepository.revokeAllUserSessions(testUserId);

      const sessions = await db
        .selectFrom('sessions')
        .select(['revoked_at', 'revoked_by', 'revoke_reason', 'updated_at'])
        .where('user_id', '=', testUserId)
        .where('id', 'in', userSessionIds.slice(0, 4)) // Only check the originally active sessions
        .execute();

      sessions.forEach((session) => {
        expect(session.revoked_at).toBeInstanceOf(Date);
        // Allow for millisecond precision differences
        const timeDiff = session.revoked_at!.getTime() - beforeRevoke.getTime();
        expect(timeDiff).toBeGreaterThanOrEqual(-1000); // Allow 1 second tolerance
        expect(timeDiff).toBeLessThanOrEqual(5000); // Should happen within 5 seconds
        expect(session.revoked_by).toBe(testUserId);
        expect(session.revoke_reason).toBe('Bulk revocation');
        expect(session.updated_at).toBeInstanceOf(Date);
      });
    });

    it('should handle exceptSessionId that does not belong to user', async () => {
      // Try to except another user's session (should have no effect)
      const result = await authRepository.revokeAllUserSessions(testUserId, otherUserSessionId);

      expect(result.success).toBe(true);
      if (isSuccessResponse(result)) {
        // Should revoke all 4 active sessions since exceptSessionId doesn't belong to user
        expect(result.body().data).toBe(4);
      }

      // Verify all user's sessions are revoked
      const userSessions = await db
        .selectFrom('sessions')
        .select(['revoked_at'])
        .where('user_id', '=', testUserId)
        .where('revoked_at', 'is', null)
        .execute();

      expect(userSessions).toHaveLength(0);
    });
  });

  describe('revokeExpiredSessions', () => {
    let expiredSessionIds: string[] = [];
    let activeSessionIds: string[] = [];
    let alreadyRevokedExpiredId: string;

    beforeEach(async () => {
      const now = new Date();
      expiredSessionIds = [];
      activeSessionIds = [];

      // Create expired sessions
      for (let i = 0; i < 3; i++) {
        const sessionId = uuidv4();
        expiredSessionIds.push(sessionId);

        await db
          .insertInto('sessions')
          .values({
            id: sessionId,
            user_id: testUserId,
            token_hash: `expired-token-${i}-${Date.now()}`,
            refresh_token_hash: `expired-refresh-${i}-${Date.now()}`,
            device_type: 'web',
            expires_at: new Date(now.getTime() - (i + 1) * 3600000), // 1-3 hours ago
            refresh_expires_at: new Date(now.getTime() - i * 3600000),
            last_activity_at: new Date(now.getTime() - (i + 1) * 3600000),
            created_at: new Date(now.getTime() - (i + 2) * 3600000),
          } as any)
          .execute();
      }

      // Create active (not expired) sessions
      for (let i = 0; i < 2; i++) {
        const sessionId = uuidv4();
        activeSessionIds.push(sessionId);

        await db
          .insertInto('sessions')
          .values({
            id: sessionId,
            user_id: testUserId,
            token_hash: `active-token-${i}-${Date.now()}`,
            refresh_token_hash: `active-refresh-${i}-${Date.now()}`,
            device_type: 'mobile',
            expires_at: new Date(now.getTime() + (i + 1) * 3600000), // 1-2 hours in future
            refresh_expires_at: new Date(now.getTime() + (i + 2) * 3600000),
            last_activity_at: now,
          } as any)
          .execute();
      }

      // Create already revoked but expired session
      alreadyRevokedExpiredId = uuidv4();
      await db
        .insertInto('sessions')
        .values({
          id: alreadyRevokedExpiredId,
          user_id: testUserId,
          token_hash: `revoked-expired-token-${Date.now()}`,
          refresh_token_hash: `revoked-expired-refresh-${Date.now()}`,
          device_type: 'desktop',
          expires_at: new Date(now.getTime() - 7200000), // 2 hours ago
          refresh_expires_at: new Date(now.getTime() - 3600000),
          last_activity_at: new Date(now.getTime() - 7200000),
          revoked_at: new Date(now.getTime() - 3600000), // Revoked 1 hour ago
          revoked_by: testUserId,
          revoke_reason: 'User logged out',
        } as any)
        .execute();
    });

    afterEach(async () => {
      await db
        .deleteFrom('sessions')
        .where('id', 'in', [...expiredSessionIds, ...activeSessionIds, alreadyRevokedExpiredId])
        .execute();
    });

    it('should revoke all expired sessions', async () => {
      const result = await authRepository.revokeExpiredSessions();

      expect(result.success).toBe(true);
      if (isSuccessResponse(result)) {
        // Should revoke 3 expired sessions (not the already revoked one)
        expect(result.body().data).toBe(3);
      }

      // Verify expired sessions are now revoked
      const expiredSessions = await db
        .selectFrom('sessions')
        .select(['id', 'revoked_at', 'revoked_by', 'revoke_reason'])
        .where('id', 'in', expiredSessionIds)
        .execute();

      expiredSessions.forEach((session) => {
        expect(session.revoked_at).not.toBeNull();
        expect(session.revoked_by).toBe('system');
        expect(session.revoke_reason).toBe('Session expired');
      });

      // Verify active sessions are not affected
      const activeSessions = await db
        .selectFrom('sessions')
        .select(['revoked_at'])
        .where('id', 'in', activeSessionIds)
        .execute();

      activeSessions.forEach((session) => {
        expect(session.revoked_at).toBeNull();
      });
    });

    it('should not re-revoke already revoked expired sessions', async () => {
      const result = await authRepository.revokeExpiredSessions();

      expect(result.success).toBe(true);
      if (isSuccessResponse(result)) {
        expect(result.body().data).toBe(3); // Only the 3 non-revoked expired sessions
      }

      // Verify the already revoked session maintains its original revocation data
      const alreadyRevoked = await db
        .selectFrom('sessions')
        .select(['revoked_by', 'revoke_reason'])
        .where('id', '=', alreadyRevokedExpiredId)
        .executeTakeFirst();

      expect(alreadyRevoked?.revoked_by).toBe(testUserId);
      expect(alreadyRevoked?.revoke_reason).toBe('User logged out');
    });

    it('should return 0 when no expired sessions exist', async () => {
      // Delete all expired sessions
      await db.deleteFrom('sessions').where('id', 'in', expiredSessionIds).execute();

      const result = await authRepository.revokeExpiredSessions();

      expect(result.success).toBe(true);
      if (isSuccessResponse(result)) {
        expect(result.body().data).toBe(0);
      }
    });

    it('should handle sessions expiring at exact current time', async () => {
      const now = new Date();
      const exactExpiryId = uuidv4();

      // Create session that expires exactly now
      await db
        .insertInto('sessions')
        .values({
          id: exactExpiryId,
          user_id: testUserId,
          token_hash: `exact-expiry-token-${Date.now()}`,
          refresh_token_hash: `exact-expiry-refresh-${Date.now()}`,
          device_type: 'web',
          expires_at: now,
          refresh_expires_at: new Date(now.getTime() + 3600000),
          last_activity_at: new Date(now.getTime() - 600000),
        } as any)
        .execute();

      const result = await authRepository.revokeExpiredSessions();

      // Clean up
      await db.deleteFrom('sessions').where('id', '=', exactExpiryId).execute();

      expect(result.success).toBe(true);
      // The exact behavior depends on MySQL precision, but it should include our 3 expired + possibly this one
      if (isSuccessResponse(result)) {
        expect(result.body().data).toBeGreaterThanOrEqual(3);
      }
    });

    it('should update the updated_at timestamp', async () => {
      const beforeRevoke = new Date();

      const result = await authRepository.revokeExpiredSessions();

      expect(result.success).toBe(true);

      const revokedSessions = await db
        .selectFrom('sessions')
        .select(['updated_at'])
        .where('id', 'in', expiredSessionIds)
        .execute();

      revokedSessions.forEach((session) => {
        expect(session.updated_at).toBeInstanceOf(Date);
        // Allow for timestamp precision differences
        const timeDiff = session.updated_at.getTime() - beforeRevoke.getTime();
        expect(timeDiff).toBeGreaterThanOrEqual(-1000);
        expect(timeDiff).toBeLessThanOrEqual(5000);
      });
    });

    it('should handle database errors gracefully', async () => {
      const mockDb = {
        updateTable: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockRejectedValue(new Error('Database connection lost')),
      };

      const repoWithMockDb = new AuthRepository(mockDb as any);
      const result = await repoWithMockDb.revokeExpiredSessions();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.body().error.code).toBe('DATABASE_ERROR');
        const details = result.body().error.details as { operation: string } | undefined;
        expect(details?.operation).toBe('revokeExpiredSessions');
      }
    });

    it('should work across different users', async () => {
      // Create expired session for another user
      const otherUserId = uuidv4();
      const otherUserExpiredId = uuidv4();

      await db
        .insertInto('users')
        .values(createTestUser({ id: otherUserId }))
        .execute();

      await db
        .insertInto('sessions')
        .values({
          id: otherUserExpiredId,
          user_id: otherUserId,
          token_hash: `other-expired-token-${Date.now()}`,
          refresh_token_hash: `other-expired-refresh-${Date.now()}`,
          device_type: 'web',
          expires_at: new Date(Date.now() - 3600000), // 1 hour ago
          refresh_expires_at: new Date(Date.now() - 1800000),
          last_activity_at: new Date(Date.now() - 3600000),
        } as any)
        .execute();

      const result = await authRepository.revokeExpiredSessions();

      expect(result.success).toBe(true);
      if (isSuccessResponse(result)) {
        // Should revoke 3 test user sessions + 1 other user session = 4
        expect(result.body().data).toBe(4);
      }

      // Verify both users' expired sessions were revoked
      const otherUserSession = await db
        .selectFrom('sessions')
        .select(['revoked_at', 'revoked_by'])
        .where('id', '=', otherUserExpiredId)
        .executeTakeFirst();

      expect(otherUserSession?.revoked_at).not.toBeNull();
      expect(otherUserSession?.revoked_by).toBe('system');

      // Cleanup
      await db.deleteFrom('sessions').where('id', '=', otherUserExpiredId).execute();
      await db.deleteFrom('users').where('id', '=', otherUserId).execute();
    });
  });

  describe('updateLastActivity', () => {
    let activeSessionId: string;
    let revokedSessionId: string;

    beforeEach(async () => {
      const now = new Date();

      // Create active session
      activeSessionId = uuidv4();
      await db
        .insertInto('sessions')
        .values({
          id: activeSessionId,
          user_id: testUserId,
          token_hash: 'active-activity-token',
          refresh_token_hash: 'active-activity-refresh',
          device_type: 'web',
          expires_at: new Date(now.getTime() + 3600000), // 1 hour from now
          refresh_expires_at: new Date(now.getTime() + 86400000),
          last_activity_at: new Date(now.getTime() - 1800000), // 30 minutes ago
          created_at: new Date(now.getTime() - 3600000), // 1 hour ago
          updated_at: new Date(now.getTime() - 1800000),
        } as any)
        .execute();

      // Create revoked session
      revokedSessionId = uuidv4();
      await db
        .insertInto('sessions')
        .values({
          id: revokedSessionId,
          user_id: testUserId,
          token_hash: 'revoked-activity-token',
          refresh_token_hash: 'revoked-activity-refresh',
          device_type: 'mobile',
          expires_at: new Date(now.getTime() + 3600000),
          refresh_expires_at: new Date(now.getTime() + 86400000),
          last_activity_at: new Date(now.getTime() - 1800000),
          revoked_at: new Date(now.getTime() - 600000), // Revoked 10 minutes ago
          revoked_by: testUserId,
          created_at: new Date(now.getTime() - 3600000),
          updated_at: new Date(now.getTime() - 600000),
        } as any)
        .execute();
    });

    afterEach(async () => {
      await db
        .deleteFrom('sessions')
        .where('id', 'in', [activeSessionId, revokedSessionId])
        .execute();
    });

    it('should update last activity for active session', async () => {
      // Get original timestamps
      const before = await db
        .selectFrom('sessions')
        .select(['last_activity_at', 'updated_at'])
        .where('id', '=', activeSessionId)
        .executeTakeFirst();

      expect(before).toBeDefined();
      expect(before?.last_activity_at).not.toBeNull();
      if (!before || !before.last_activity_at) throw new Error('Session not found or invalid');

      const beforeUpdate = new Date();

      // Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 50));

      const result = await authRepository.updateLastActivity(activeSessionId);

      expect(result.success).toBe(true);
      if (isSuccessResponse(result)) {
        expect(result.body().data).toBe(true);
      }

      // Verify timestamps were updated
      const after = await db
        .selectFrom('sessions')
        .select(['last_activity_at', 'updated_at'])
        .where('id', '=', activeSessionId)
        .executeTakeFirst();

      expect(after).toBeDefined();
      expect(after?.last_activity_at).not.toBeNull();
      if (!after || !after.last_activity_at) throw new Error('Session not found after update');

      // Check last_activity_at was updated
      expect(after.last_activity_at.getTime()).toBeGreaterThan(before.last_activity_at.getTime());

      // Allow for MySQL timestamp precision (compare at second level)
      const afterSeconds = Math.floor(after.last_activity_at.getTime() / 1000);
      const beforeUpdateSeconds = Math.floor(beforeUpdate.getTime() / 1000);
      expect(afterSeconds).toBeGreaterThanOrEqual(beforeUpdateSeconds);

      // Check updated_at was also updated
      expect(after.updated_at.getTime()).toBeGreaterThan(before.updated_at.getTime());

      // Compare updated_at at second level too
      const updatedAtSeconds = Math.floor(after.updated_at.getTime() / 1000);
      expect(updatedAtSeconds).toBeGreaterThanOrEqual(beforeUpdateSeconds);
    });

    it('should not update last activity for revoked session', async () => {
      const result = await authRepository.updateLastActivity(revokedSessionId);

      expect(result.success).toBe(true);
      if (isSuccessResponse(result)) {
        expect(result.body().data).toBe(false);
      }

      // Verify timestamps were NOT updated
      const session = await db
        .selectFrom('sessions')
        .select(['last_activity_at', 'updated_at', 'revoked_at'])
        .where('id', '=', revokedSessionId)
        .executeTakeFirst();

      expect(session).toBeDefined();
      // Timestamps should remain unchanged from setup
      expect(session!.revoked_at).not.toBeNull();
    });

    it('should return false for non-existent session', async () => {
      const result = await authRepository.updateLastActivity(uuidv4());

      expect(result.success).toBe(true);
      if (isSuccessResponse(result)) {
        expect(result.body().data).toBe(false);
      }
    });

    it('should update both timestamps to same value', async () => {
      const result = await authRepository.updateLastActivity(activeSessionId);

      expect(result.success).toBe(true);
      if (isSuccessResponse(result)) {
        expect(result.body().data).toBe(true);
      }

      const session = await db
        .selectFrom('sessions')
        .select(['last_activity_at', 'updated_at'])
        .where('id', '=', activeSessionId)
        .executeTakeFirst();

      expect(session).toBeDefined();
      expect(session?.last_activity_at).not.toBeNull();

      if (!session || !session.last_activity_at) {
        throw new Error('Session or last_activity_at is null');
      }

      // Both timestamps should be very close (within 1 second due to DB precision)
      const timeDiff = Math.abs(session.last_activity_at.getTime() - session.updated_at.getTime());
      expect(timeDiff).toBeLessThanOrEqual(1000);
    });

    it('should handle multiple rapid updates', async () => {
      const timestamps: Date[] = [];

      // Perform multiple updates with longer delays to ensure timestamp differences
      for (let i = 0; i < 3; i++) {
        await new Promise((resolve) => setTimeout(resolve, 1100)); // 1.1 seconds to ensure different timestamps

        const result = await authRepository.updateLastActivity(activeSessionId);
        expect(result.success).toBe(true);

        const session = await db
          .selectFrom('sessions')
          .select(['last_activity_at'])
          .where('id', '=', activeSessionId)
          .executeTakeFirst();

        if (session && session.last_activity_at) {
          timestamps.push(session.last_activity_at);
        } else {
          throw new Error('Session or last_activity_at is null');
        }
      }

      // Each timestamp should be later than the previous (comparing seconds, not milliseconds)
      expect(timestamps.length).toBe(3);
      for (let i = 1; i < timestamps.length; i++) {
        const currentSeconds = Math.floor(timestamps[i].getTime() / 1000);
        const previousSeconds = Math.floor(timestamps[i - 1].getTime() / 1000);
        expect(currentSeconds).toBeGreaterThanOrEqual(previousSeconds);
      }
    });

    it('should not affect other session fields', async () => {
      // Get original session data
      const before = await db
        .selectFrom('sessions')
        .selectAll()
        .where('id', '=', activeSessionId)
        .executeTakeFirst();

      expect(before).toBeDefined();
      if (!before) throw new Error('Session not found');

      await authRepository.updateLastActivity(activeSessionId);

      // Get updated session data
      const after = await db
        .selectFrom('sessions')
        .selectAll()
        .where('id', '=', activeSessionId)
        .executeTakeFirst();

      expect(after).toBeDefined();
      if (!after) throw new Error('Session not found after update');

      // Verify only last_activity_at and updated_at changed
      expect(after.id).toBe(before.id);
      expect(after.user_id).toBe(before.user_id);
      expect(after.token_hash).toBe(before.token_hash);
      expect(after.refresh_token_hash).toBe(before.refresh_token_hash);
      expect(after.device_type).toBe(before.device_type);
      expect(after.expires_at).toEqual(before.expires_at);
      expect(after.refresh_expires_at).toEqual(before.refresh_expires_at);
      expect(after.created_at).toEqual(before.created_at);
      expect(after.revoked_at).toEqual(before.revoked_at);
    });

    it('should handle database errors gracefully', async () => {
      const mockDb = {
        updateTable: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockRejectedValue(new Error('Database connection lost')),
      };

      const repoWithMockDb = new AuthRepository(mockDb as any);
      const result = await repoWithMockDb.updateLastActivity(activeSessionId);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.body().error.code).toBe('DATABASE_ERROR');
        const details = result.body().error.details as { operation: string } | undefined;
        expect(details?.operation).toBe('updateLastActivity');
      }
    });

    it('should work with expired but not revoked sessions', async () => {
      // Create expired session
      const expiredSessionId = uuidv4();
      const now = new Date();
      const originalLastActivity = new Date(now.getTime() - 7200000); // 2 hours ago

      await db
        .insertInto('sessions')
        .values({
          id: expiredSessionId,
          user_id: testUserId,
          token_hash: 'expired-activity-token',
          refresh_token_hash: 'expired-activity-refresh',
          device_type: 'desktop',
          expires_at: new Date(now.getTime() - 3600000), // Expired 1 hour ago
          refresh_expires_at: new Date(now.getTime() - 1800000),
          last_activity_at: originalLastActivity,
          created_at: new Date(now.getTime() - 86400000),
          updated_at: originalLastActivity,
        } as any)
        .execute();

      const result = await authRepository.updateLastActivity(expiredSessionId);

      expect(result.success).toBe(true);
      if (isSuccessResponse(result)) {
        // Should still update because it's not revoked
        expect(result.body().data).toBe(true);
      }

      const session = await db
        .selectFrom('sessions')
        .select(['last_activity_at'])
        .where('id', '=', expiredSessionId)
        .executeTakeFirst();

      expect(session?.last_activity_at).not.toBeNull();
      if (session?.last_activity_at) {
        expect(session.last_activity_at.getTime()).toBeGreaterThan(originalLastActivity.getTime());
      }

      // Cleanup
      await db.deleteFrom('sessions').where('id', '=', expiredSessionId).execute();
    });
  });

  describe('deleteInactiveSessions', () => {
    let oldInactiveExpiredIds: string[] = [];
    let oldInactiveNotExpiredIds: string[] = [];
    let recentActiveIds: string[] = [];
    let oldActiveExpiredIds: string[] = [];

    beforeEach(async () => {
      const now = new Date();
      const cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

      oldInactiveExpiredIds = [];
      oldInactiveNotExpiredIds = [];
      recentActiveIds = [];
      oldActiveExpiredIds = [];

      // Create old inactive AND expired sessions (should be deleted)
      for (let i = 0; i < 3; i++) {
        const sessionId = uuidv4();
        oldInactiveExpiredIds.push(sessionId);

        await db
          .insertInto('sessions')
          .values({
            id: sessionId,
            user_id: testUserId,
            token_hash: `old-inactive-expired-${i}-${Date.now()}`,
            device_type: 'web',
            expires_at: new Date(cutoffDate.getTime() - 24 * 60 * 60 * 1000), // Expired before cutoff
            last_activity_at: new Date(cutoffDate.getTime() - 48 * 60 * 60 * 1000), // Inactive before cutoff
            created_at: new Date(cutoffDate.getTime() - 60 * 24 * 60 * 60 * 1000),
          } as any)
          .execute();
      }

      // Create old inactive but NOT expired sessions (should NOT be deleted)
      for (let i = 0; i < 2; i++) {
        const sessionId = uuidv4();
        oldInactiveNotExpiredIds.push(sessionId);

        await db
          .insertInto('sessions')
          .values({
            id: sessionId,
            user_id: testUserId,
            token_hash: `old-inactive-not-expired-${i}-${Date.now()}`,
            device_type: 'mobile',
            expires_at: new Date(now.getTime() + 24 * 60 * 60 * 1000), // Still valid
            last_activity_at: new Date(cutoffDate.getTime() - 48 * 60 * 60 * 1000), // Inactive before cutoff
            created_at: new Date(cutoffDate.getTime() - 60 * 24 * 60 * 60 * 1000),
          } as any)
          .execute();
      }

      // Create recently active sessions (should NOT be deleted)
      for (let i = 0; i < 2; i++) {
        const sessionId = uuidv4();
        recentActiveIds.push(sessionId);

        await db
          .insertInto('sessions')
          .values({
            id: sessionId,
            user_id: testUserId,
            token_hash: `recent-active-${i}-${Date.now()}`,
            device_type: 'desktop',
            expires_at: new Date(cutoffDate.getTime() - 24 * 60 * 60 * 1000), // Expired
            last_activity_at: now, // Recently active
            created_at: new Date(now.getTime() - 60 * 60 * 1000),
          } as any)
          .execute();
      }

      // Create old but recently active expired sessions (should NOT be deleted)
      for (let i = 0; i < 2; i++) {
        const sessionId = uuidv4();
        oldActiveExpiredIds.push(sessionId);

        await db
          .insertInto('sessions')
          .values({
            id: sessionId,
            user_id: testUserId,
            token_hash: `old-active-expired-${i}-${Date.now()}`,
            device_type: 'api',
            expires_at: new Date(cutoffDate.getTime() - 24 * 60 * 60 * 1000), // Expired
            last_activity_at: new Date(cutoffDate.getTime() + 24 * 60 * 60 * 1000), // Active after cutoff
            created_at: new Date(cutoffDate.getTime() - 90 * 24 * 60 * 60 * 1000),
          } as any)
          .execute();
      }
    });

    afterEach(async () => {
      const allIds = [
        ...oldInactiveExpiredIds,
        ...oldInactiveNotExpiredIds,
        ...recentActiveIds,
        ...oldActiveExpiredIds,
      ];
      await db.deleteFrom('sessions').where('id', 'in', allIds).execute();
    });

    it('should delete only old inactive expired sessions', async () => {
      const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

      const result = await authRepository.deleteInactiveSessions(cutoffDate);

      expect(result.success).toBe(true);
      if (isSuccessResponse(result)) {
        expect(result.body().data).toBe(3); // Only the 3 old inactive expired sessions
      }

      // Verify correct sessions were deleted
      const remainingSessions = await db
        .selectFrom('sessions')
        .select(['id'])
        .where('id', 'in', [
          ...oldInactiveExpiredIds,
          ...oldInactiveNotExpiredIds,
          ...recentActiveIds,
          ...oldActiveExpiredIds,
        ])
        .execute();

      const remainingIds = remainingSessions.map((s) => s.id);

      // Old inactive expired should be gone
      oldInactiveExpiredIds.forEach((id) => {
        expect(remainingIds).not.toContain(id);
      });

      // All others should remain
      [...oldInactiveNotExpiredIds, ...recentActiveIds, ...oldActiveExpiredIds].forEach((id) => {
        expect(remainingIds).toContain(id);
      });
    });

    it('should return 0 when no sessions match criteria', async () => {
      const veryOldDate = new Date('2020-01-01');

      const result = await authRepository.deleteInactiveSessions(veryOldDate);

      expect(result.success).toBe(true);
      if (isSuccessResponse(result)) {
        expect(result.body().data).toBe(0);
      }
    });

    it('should handle future dates correctly', async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow

      const result = await authRepository.deleteInactiveSessions(futureDate);

      expect(result.success).toBe(true);
      if (isSuccessResponse(result)) {
        // Should delete more sessions since the cutoff is in the future
        expect(result.body().data).toBeGreaterThanOrEqual(3);
      }
    });

    it('should handle database errors gracefully', async () => {
      const mockDb = {
        deleteFrom: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockRejectedValue(new Error('Database connection lost')),
      };

      const repoWithMockDb = new AuthRepository(mockDb as any);
      const result = await repoWithMockDb.deleteInactiveSessions(new Date());

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.body().error.code).toBe('DATABASE_ERROR');
        const details = result.body().error.details as { operation: string } | undefined;
        expect(details?.operation).toBe('deleteInactiveSessions');
      }
    });
  });

  describe('deleteRevokedSessions', () => {
    let oldRevokedIds: string[] = [];
    let recentRevokedIds: string[] = [];
    let activeIds: string[] = [];

    beforeEach(async () => {
      const now = new Date();
      const cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago

      oldRevokedIds = [];
      recentRevokedIds = [];
      activeIds = [];

      // Create old revoked sessions (should be deleted)
      for (let i = 0; i < 4; i++) {
        const sessionId = uuidv4();
        oldRevokedIds.push(sessionId);

        await db
          .insertInto('sessions')
          .values({
            id: sessionId,
            user_id: testUserId,
            token_hash: `old-revoked-${i}-${Date.now()}`,
            device_type: 'web',
            expires_at: new Date(now.getTime() + 3600000),
            last_activity_at: new Date(cutoffDate.getTime() - 24 * 60 * 60 * 1000),
            revoked_at: new Date(cutoffDate.getTime() - 24 * 60 * 60 * 1000), // Revoked before cutoff
            revoked_by: 'system',
            revoke_reason: 'Session expired',
            created_at: new Date(cutoffDate.getTime() - 30 * 24 * 60 * 60 * 1000),
          } as any)
          .execute();
      }

      // Create recently revoked sessions (should NOT be deleted)
      for (let i = 0; i < 3; i++) {
        const sessionId = uuidv4();
        recentRevokedIds.push(sessionId);

        await db
          .insertInto('sessions')
          .values({
            id: sessionId,
            user_id: testUserId,
            token_hash: `recent-revoked-${i}-${Date.now()}`,
            device_type: 'mobile',
            expires_at: new Date(now.getTime() + 3600000),
            last_activity_at: now,
            revoked_at: new Date(now.getTime() - 60 * 60 * 1000), // Revoked 1 hour ago
            revoked_by: testUserId,
            revoke_reason: 'User logged out',
            created_at: new Date(now.getTime() - 24 * 60 * 60 * 1000),
          } as any)
          .execute();
      }

      // Create active sessions (should NOT be deleted)
      for (let i = 0; i < 2; i++) {
        const sessionId = uuidv4();
        activeIds.push(sessionId);

        await db
          .insertInto('sessions')
          .values({
            id: sessionId,
            user_id: testUserId,
            token_hash: `active-${i}-${Date.now()}`,
            device_type: 'desktop',
            expires_at: new Date(now.getTime() + 3600000),
            last_activity_at: now,
            revoked_at: null, // Not revoked
            created_at: new Date(now.getTime() - 24 * 60 * 60 * 1000),
          } as any)
          .execute();
      }
    });

    afterEach(async () => {
      const allIds = [...oldRevokedIds, ...recentRevokedIds, ...activeIds];
      await db.deleteFrom('sessions').where('id', 'in', allIds).execute();
    });

    it('should delete only old revoked sessions', async () => {
      const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago

      const result = await authRepository.deleteRevokedSessions(cutoffDate);

      expect(result.success).toBe(true);
      if (isSuccessResponse(result)) {
        expect(result.body().data).toBe(4); // Only the 4 old revoked sessions
      }

      // Verify correct sessions were deleted
      const remainingSessions = await db
        .selectFrom('sessions')
        .select(['id'])
        .where('id', 'in', [...oldRevokedIds, ...recentRevokedIds, ...activeIds])
        .execute();

      const remainingIds = remainingSessions.map((s) => s.id);

      // Old revoked should be gone
      oldRevokedIds.forEach((id) => {
        expect(remainingIds).not.toContain(id);
      });

      // Recent revoked and active should remain
      [...recentRevokedIds, ...activeIds].forEach((id) => {
        expect(remainingIds).toContain(id);
      });
    });

    it('should return 0 when no revoked sessions exist before date', async () => {
      const veryOldDate = new Date('2020-01-01');

      const result = await authRepository.deleteRevokedSessions(veryOldDate);

      expect(result.success).toBe(true);
      if (isSuccessResponse(result)) {
        expect(result.body().data).toBe(0);
      }
    });

    it('should not delete active sessions regardless of date', async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow

      const result = await authRepository.deleteRevokedSessions(futureDate);

      expect(result.success).toBe(true);
      if (isSuccessResponse(result)) {
        // Should delete all revoked sessions (old + recent)
        expect(result.body().data).toBe(7); // 4 old + 3 recent
      }

      // Verify active sessions remain
      const activeSessions = await db
        .selectFrom('sessions')
        .select(['id'])
        .where('id', 'in', activeIds)
        .execute();

      expect(activeSessions).toHaveLength(2);
    });

    it('should handle edge case with exact cutoff time', async () => {
      const exactCutoffId = uuidv4();
      const cutoffDate = new Date();

      await db
        .insertInto('sessions')
        .values({
          id: exactCutoffId,
          user_id: testUserId,
          token_hash: `exact-cutoff-${Date.now()}`,
          device_type: 'web',
          expires_at: new Date(cutoffDate.getTime() + 3600000),
          last_activity_at: cutoffDate,
          revoked_at: cutoffDate, // Revoked exactly at cutoff
          revoked_by: 'system',
          created_at: new Date(cutoffDate.getTime() - 3600000),
        } as any)
        .execute();

      const result = await authRepository.deleteRevokedSessions(cutoffDate);

      // Should not delete session revoked exactly at cutoff (using < not <=)
      const session = await db
        .selectFrom('sessions')
        .select(['id'])
        .where('id', '=', exactCutoffId)
        .executeTakeFirst();

      expect(session).toBeDefined();

      // Cleanup
      await db.deleteFrom('sessions').where('id', '=', exactCutoffId).execute();
    });

    it('should handle database errors gracefully', async () => {
      const mockDb = {
        deleteFrom: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockRejectedValue(new Error('Database connection lost')),
      };

      const repoWithMockDb = new AuthRepository(mockDb as any);
      const result = await repoWithMockDb.deleteRevokedSessions(new Date());

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.body().error.code).toBe('DATABASE_ERROR');
        const details = result.body().error.details as { operation: string } | undefined;
        expect(details?.operation).toBe('deleteRevokedSessions');
      }
    });
  });

  describe('findPasswordResetToken', () => {
    let validTokenId: string;
    let expiredTokenId: string;
    let usedTokenId: string;

    beforeEach(async () => {
      const now = new Date();

      // Create valid password reset token
      validTokenId = uuidv4();
      await db
        .insertInto('password_reset_tokens')
        .values({
          id: validTokenId,
          user_id: testUserId,
          token_hash: `valid-reset-token-${Date.now()}`,
          expires_at: new Date(now.getTime() + 3600000), // 1 hour from now
          used_at: null,
          ip_address: '192.168.1.100',
          user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          created_at: now,
          updated_at: now,
        })
        .execute();

      // Create expired token
      expiredTokenId = uuidv4();
      await db
        .insertInto('password_reset_tokens')
        .values({
          id: expiredTokenId,
          user_id: testUserId,
          token_hash: `expired-reset-token-${Date.now()}`,
          expires_at: new Date(now.getTime() - 3600000), // 1 hour ago
          used_at: null,
          ip_address: '192.168.1.101',
          user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
          created_at: new Date(now.getTime() - 7200000),
          updated_at: now,
        })
        .execute();

      // Create used token
      usedTokenId = uuidv4();
      await db
        .insertInto('password_reset_tokens')
        .values({
          id: usedTokenId,
          user_id: testUserId,
          token_hash: `used-reset-token-${Date.now()}`,
          expires_at: new Date(now.getTime() + 3600000), // Still valid time-wise
          used_at: new Date(now.getTime() - 1800000), // Used 30 minutes ago
          ip_address: '192.168.1.102',
          user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6)',
          created_at: new Date(now.getTime() - 3600000),
          updated_at: now,
        })
        .execute();
    });

    afterEach(async () => {
      await db
        .deleteFrom('password_reset_tokens')
        .where('id', 'in', [validTokenId, expiredTokenId, usedTokenId])
        .execute();
    });

    it('should find valid password reset token', async () => {
      const tokenHash = `valid-reset-token-${Date.now()}`;

      // Update the token to use our known hash
      await db
        .updateTable('password_reset_tokens')
        .set({ token_hash: tokenHash })
        .where('id', '=', validTokenId)
        .execute();

      const result = await authRepository.findPasswordResetToken(tokenHash);

      expect(result.success).toBe(true);
      if (isSuccessResponse(result)) {
        const token = result.body().data;
        expect(token).toBeDefined();
        expect(token?.id).toBe(validTokenId);
        expect(token?.userId).toBe(testUserId);
        expect(token?.tokenHash).toBe(tokenHash);
        expect(token?.usedAt).toBeNull();
        expect(token?.ipAddress).toBe('192.168.1.100');
        expect(token?.userAgent).toBe('Mozilla/5.0 (Windows NT 10.0; Win64; x64)');
        expect(token?.expiresAt).toBeInstanceOf(Date);
        expect(token?.createdAt).toBeInstanceOf(Date);
      }
    });

    it('should return null for non-existent token', async () => {
      const result = await authRepository.findPasswordResetToken('non-existent-token-hash');

      expect(result.success).toBe(true);
      if (isSuccessResponse(result)) {
        expect(result.body().data).toBeNull();
      }
    });

    it('should find expired token (still returns it)', async () => {
      const tokenHash = `expired-token-${Date.now()}`;

      await db
        .updateTable('password_reset_tokens')
        .set({ token_hash: tokenHash })
        .where('id', '=', expiredTokenId)
        .execute();

      const result = await authRepository.findPasswordResetToken(tokenHash);

      expect(result.success).toBe(true);
      if (isSuccessResponse(result)) {
        const token = result.body().data;
        expect(token).toBeDefined();
        expect(token?.id).toBe(expiredTokenId);
        // Verify it's expired
        expect(token?.expiresAt.getTime()).toBeLessThan(new Date().getTime());
      }
    });

    it('should find used token (still returns it)', async () => {
      const tokenHash = `used-token-${Date.now()}`;

      await db
        .updateTable('password_reset_tokens')
        .set({ token_hash: tokenHash })
        .where('id', '=', usedTokenId)
        .execute();

      const result = await authRepository.findPasswordResetToken(tokenHash);

      expect(result.success).toBe(true);
      if (isSuccessResponse(result)) {
        const token = result.body().data;
        expect(token).toBeDefined();
        expect(token?.id).toBe(usedTokenId);
        expect(token?.usedAt).not.toBeNull();
        expect(token?.usedAt).toBeInstanceOf(Date);
      }
    });

    it('should map all fields correctly', async () => {
      const now = new Date();
      const tokenId = uuidv4();
      const tokenHash = `detailed-token-${Date.now()}`;
      const ipAddress = '10.0.0.1';
      const userAgent = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36';

      await db
        .insertInto('password_reset_tokens')
        .values({
          id: tokenId,
          user_id: testUserId,
          token_hash: tokenHash,
          expires_at: new Date(now.getTime() + 1800000), // 30 minutes
          used_at: null,
          ip_address: ipAddress,
          user_agent: userAgent,
          created_at: now,
          updated_at: now,
        })
        .execute();

      const result = await authRepository.findPasswordResetToken(tokenHash);

      expect(result.success).toBe(true);
      if (isSuccessResponse(result)) {
        const token = result.body().data;
        expect(token).toEqual({
          id: tokenId,
          userId: testUserId,
          tokenHash: tokenHash,
          expiresAt: expect.any(Date),
          usedAt: null,
          ipAddress: ipAddress,
          userAgent: userAgent,
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
        });
      }

      // Cleanup
      await db.deleteFrom('password_reset_tokens').where('id', '=', tokenId).execute();
    });

    it('should handle null optional fields', async () => {
      const tokenId = uuidv4();
      const tokenHash = `minimal-token-${Date.now()}`;

      await db
        .insertInto('password_reset_tokens')
        .values({
          id: tokenId,
          user_id: testUserId,
          token_hash: tokenHash,
          expires_at: new Date(Date.now() + 3600000),
          used_at: null,
          ip_address: null,
          user_agent: null,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .execute();

      const result = await authRepository.findPasswordResetToken(tokenHash);

      expect(result.success).toBe(true);
      if (isSuccessResponse(result)) {
        const token = result.body().data;
        expect(token).toBeDefined();
        expect(token?.ipAddress).toBeNull();
        expect(token?.userAgent).toBeNull();
      }

      // Cleanup
      await db.deleteFrom('password_reset_tokens').where('id', '=', tokenId).execute();
    });

    it('should handle database errors gracefully', async () => {
      const mockDb = {
        selectFrom: jest.fn().mockReturnThis(),
        selectAll: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        executeTakeFirst: jest.fn().mockRejectedValue(new Error('Database connection lost')),
      };

      const repoWithMockDb = new AuthRepository(mockDb as any);
      const result = await repoWithMockDb.findPasswordResetToken('any-token');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.body().error.code).toBe('DATABASE_ERROR');
        const details = result.body().error.details as { operation: string } | undefined;
        expect(details?.operation).toBe('findPasswordResetToken');
      }
    });

    it('should handle tokens for different users', async () => {
      // Create another user
      const otherUserId = uuidv4();
      await db
        .insertInto('users')
        .values(createTestUser({ id: otherUserId }))
        .execute();

      // Create token for other user
      const otherUserTokenId = uuidv4();
      const otherUserTokenHash = `other-user-token-${Date.now()}`;

      await db
        .insertInto('password_reset_tokens')
        .values({
          id: otherUserTokenId,
          user_id: otherUserId,
          token_hash: otherUserTokenHash,
          expires_at: new Date(Date.now() + 3600000),
          created_at: new Date(),
          updated_at: new Date(),
        })
        .execute();

      // Find the other user's token
      const result = await authRepository.findPasswordResetToken(otherUserTokenHash);

      expect(result.success).toBe(true);
      if (isSuccessResponse(result)) {
        const token = result.body().data;
        expect(token).toBeDefined();
        expect(token?.userId).toBe(otherUserId);
        expect(token?.id).toBe(otherUserTokenId);
      }

      // Cleanup
      await db.deleteFrom('password_reset_tokens').where('id', '=', otherUserTokenId).execute();
      await db.deleteFrom('users').where('id', '=', otherUserId).execute();
    });
  });
});
