import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UserStatus } from '@prisma/client';

describe('AuthService (Authentication & Refresh Token)', () => {
  const user = {
    id: 'user-1',
    email: 'user@example.com',
    name: 'User',
    passwordHash: '',
    status: UserStatus.ACTIVE,
    avatarUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any;

  function createHarness(userOverrides: Partial<typeof user> = {}) {
    const currentUser = { ...user, ...userOverrides };
    const records: any[] = [];
    let id = 0;
    const prisma = {
      user: {
        findUnique: jest.fn(async ({ where }) => {
          if (where.email === currentUser.email || where.id === currentUser.id) {
            return currentUser;
          }
          return null;
        }),
        create: jest.fn(async ({ data }) => {
          return { id: 'new-user-id', ...data, status: UserStatus.ACTIVE, createdAt: new Date(), updatedAt: new Date() };
        }),
      },
      userSettings: {
        create: jest.fn().mockResolvedValue({ id: 'settings-1' }),
      },
      refreshToken: {
        create: jest.fn(async ({ data }) => {
          const record = { id: `token-${++id}`, revokedAt: null, createdAt: new Date(), user: currentUser, ...data };
          records.push(record);
          return record;
        }),
        findFirst: jest.fn(async ({ where }) => records.find(record =>
          record.tokenHash === where.tokenHash && record.revokedAt === null && record.expiresAt > where.expiresAt.gt,
        ) || null),
        updateMany: jest.fn(async ({ where, data }) => {
          const matching = records.filter(record =>
            (!where.id || record.id === where.id) &&
            (where.userId === undefined || record.userId === where.userId) &&
            (where.tokenHash === undefined || record.tokenHash === where.tokenHash) &&
            (where.revokedAt === undefined || record.revokedAt === where.revokedAt) &&
            (!where.expiresAt || record.expiresAt > where.expiresAt.gt),
          );
          matching.forEach(record => Object.assign(record, data));
          return { count: matching.length };
        }),
      },
    } as any;
    const config = {
      get: jest.fn((key: string) => ({
        'app.jwt.refreshSecret': 'refresh-secret-for-tests',
        'app.jwt.refreshTokenExpiry': '7d',
      })[key]),
    } as any;
    const service = new AuthService(prisma, new JwtService({ secret: 'access-secret' }), config);
    return { service, records, prisma, currentUser };
  }

  beforeAll(async () => {
    user.passwordHash = await bcrypt.hash('correct-password', 4);
  });

  describe('Registration', () => {
    it('creates new user and user settings when email is not taken', async () => {
      // ARRANGE
      const { service, prisma } = createHarness();
      const registerDto = {
        email: 'newbie@example.com',
        password: 'password123',
        name: 'Newbie',
      };

      // ACT
      const result = await service.register(registerDto);

      // ASSERT
      expect(result.user.email).toBe('newbie@example.com');
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'newbie@example.com',
            name: 'Newbie',
          }),
        }),
      );
      expect(prisma.userSettings.create).toHaveBeenCalled();
    });

    it('rejects registration when email already exists with ConflictException', async () => {
      // ARRANGE
      const { service } = createHarness();
      const registerDto = {
        email: user.email,
        password: 'password123',
        name: 'Duplicate',
      };

      // ACT & ASSERT
      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('Login', () => {
    it('authenticates valid credentials and issues tokens', async () => {
      // ARRANGE
      const { service } = createHarness();

      // ACT
      const result = await service.login({ email: user.email, password: 'correct-password' });

      // ASSERT
      expect(result.user.id).toBe(user.id);
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it('rejects login when user email does not exist', async () => {
      // ARRANGE
      const { service } = createHarness();

      // ACT & ASSERT
      await expect(
        service.login({ email: 'nonexistent@example.com', password: 'password' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects login when password is incorrect', async () => {
      // ARRANGE
      const { service } = createHarness();

      // ACT & ASSERT
      await expect(
        service.login({ email: user.email, password: 'wrong-password' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects login when user status is suspended or deleted', async () => {
      // ARRANGE
      const { service } = createHarness({ status: UserStatus.SUSPENDED });

      // ACT & ASSERT
      await expect(
        service.login({ email: user.email, password: 'correct-password' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('Refresh Token lifecycle', () => {
    const login = (service: AuthService) =>
      service.login({ email: user.email, password: 'correct-password' });

    it('refreshes a valid token and rotates its persisted session', async () => {
      // ARRANGE
      const { service, records } = createHarness();
      const first = await login(service);

      // ACT
      const next = await service.refresh(first.refreshToken);

      // ASSERT
      expect(next.refreshToken).not.toBe(first.refreshToken);
      expect(records).toHaveLength(2);
      expect(records[0].revokedAt).toBeInstanceOf(Date);
      expect(records[1].revokedAt).toBeNull();
    });

    it('rejects an invalid refresh token string', async () => {
      // ARRANGE
      const { service } = createHarness();

      // ACT & ASSERT
      await expect(service.refresh('invalid-token')).rejects.toThrow(UnauthorizedException);
    });

    it('rejects an expired refresh token', async () => {
      // ARRANGE
      const { service, records } = createHarness();
      const session = await login(service);
      records[0].expiresAt = new Date(Date.now() - 1000);

      // ACT & ASSERT
      await expect(service.refresh(session.refreshToken)).rejects.toThrow(UnauthorizedException);
    });

    it('rejects a revoked refresh token', async () => {
      // ARRANGE
      const { service, records } = createHarness();
      const session = await login(service);
      records[0].revokedAt = new Date();

      // ACT & ASSERT
      await expect(service.refresh(session.refreshToken)).rejects.toThrow(UnauthorizedException);
    });

    it('rejects reuse of a refresh token after rotation', async () => {
      // ARRANGE
      const { service } = createHarness();
      const session = await login(service);
      await service.refresh(session.refreshToken);

      // ACT & ASSERT
      await expect(service.refresh(session.refreshToken)).rejects.toThrow(UnauthorizedException);
    });

    it('allows only one concurrent rotation of the same refresh token', async () => {
      // ARRANGE
      const { service } = createHarness();
      const session = await login(service);

      // ACT
      const results = await Promise.allSettled([
        service.refresh(session.refreshToken),
        service.refresh(session.refreshToken),
      ]);

      // ASSERT
      expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
      expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
    });

    it('rejects refresh if user has become suspended since token issuance', async () => {
      // ARRANGE
      const { service, currentUser } = createHarness();
      const session = await login(service);
      currentUser.status = UserStatus.SUSPENDED;

      // ACT & ASSERT
      await expect(service.refresh(session.refreshToken)).rejects.toThrow(UnauthorizedException);
    });

    it('keeps independent sessions valid when one session rotates', async () => {
      // ARRANGE
      const { service, records } = createHarness();
      const first = await login(service);
      const second = await login(service);

      // ACT
      expect(second.refreshToken).not.toBe(first.refreshToken);
      await service.refresh(first.refreshToken);

      // ASSERT
      await expect(service.refresh(second.refreshToken)).resolves.toBeDefined();
      expect(records.filter((record) => record.revokedAt === null)).toHaveLength(2);
    });

    it('logout revokes only the supplied session token', async () => {
      // ARRANGE
      const { service } = createHarness();
      const first = await login(service);
      const second = await login(service);

      // ACT
      await service.logout(user.id, first.refreshToken);

      // ASSERT
      await expect(service.refresh(first.refreshToken)).rejects.toThrow(UnauthorizedException);
      await expect(service.refresh(second.refreshToken)).resolves.toBeDefined();
    });
  });
});
