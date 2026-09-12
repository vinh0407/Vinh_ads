import { BadRequestException } from '@nestjs/common';
import { FacebookService } from './facebook.service';
import { EncryptionUtil } from '../common/utils/encryption.util';

describe('FacebookService (OAuth Flow & Page Management)', () => {
  const config = {
    get: jest.fn((key: string) =>
      ({
        'app.facebook.appId': 'app-id',
        'app.facebook.appSecret': 'app-secret',
        'app.facebook.callbackUrl': 'http://localhost/callback',
        'app.facebook.apiVersion': 'v25.0',
      })[key],
    ),
  } as any;

  const createPrismaMock = () =>
    ({
      facebookOAuthSession: {
        create: jest.fn(),
        findUnique: jest.fn(),
        updateMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      facebookPage: {
        upsert: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      facebookPageToken: {
        upsert: jest.fn(),
        deleteMany: jest.fn(),
        findUnique: jest.fn(),
      },
    }) as any;

  beforeAll(() => {
    EncryptionUtil.init('test-encryption-key-at-least-32-characters');
  });

  describe('OAuth state creation & URL', () => {
    it('generates a secure state and stores it with expiration', async () => {
      // ARRANGE
      const prisma = createPrismaMock();
      const service = new FacebookService(prisma, config);

      // ACT
      const state = await service.createOAuthState('user-1');

      // ASSERT
      expect(state).toBeDefined();
      expect(state.length).toBeGreaterThanOrEqual(32);
      expect(prisma.facebookOAuthSession.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-1',
            stateHash: expect.any(String),
            expiresAt: expect.any(Date),
          }),
        }),
      );
    });

    it('generates a valid Facebook OAuth dialog URL from state', () => {
      // ARRANGE
      const service = new FacebookService(createPrismaMock(), config);
      const state = 'valid-test-state-string-with-sufficient-length';

      // ACT
      const url = service.getOAuthUrl(state);

      // ASSERT
      expect(url).toContain('https://www.facebook.com/v25.0/dialog/oauth');
      expect(url).toContain('client_id=app-id');
      expect(url).toContain(`state=${encodeURIComponent(state)}`);
    });
  });

  describe('OAuth callback handling', () => {
    it('rejects missing or empty authorization code', async () => {
      // ARRANGE
      const service = new FacebookService(createPrismaMock(), config);

      // ACT & ASSERT
      await expect(service.handleCallback('', 'valid-state')).rejects.toThrow(
        'authorization code',
      );
    });

    it('rejects invalid or unknown state parameter', async () => {
      // ARRANGE
      const prisma = createPrismaMock();
      prisma.facebookOAuthSession.findUnique.mockResolvedValue(null);
      const service = new FacebookService(prisma, config);

      // ACT & ASSERT
      await expect(service.handleCallback('code-123', 'bad-state')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('fails when Facebook Graph API rejects code exchange', async () => {
      // ARRANGE
      const prisma = createPrismaMock();
      prisma.facebookOAuthSession.findUnique.mockResolvedValue({
        id: 'session-1',
        userId: 'user-1',
        expiresAt: new Date(Date.now() + 60000),
        usedAt: null,
      });
      prisma.facebookOAuthSession.updateMany.mockResolvedValue({ count: 1 });
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: { message: 'Invalid code' } }),
      }) as any;
      const service = new FacebookService(prisma, config);

      // ACT & ASSERT
      await expect(
        service.handleCallback('invalid-code', 'valid-state'),
      ).rejects.toThrow('token exchange');
    });

    it('rejects accounts with no manageable pages', async () => {
      // ARRANGE
      const service = new FacebookService(createPrismaMock(), config);
      (service as any).consumeState = jest.fn().mockResolvedValue({
        id: 'session-1',
        userId: 'user-1',
      });
      (service as any).exchangeCode = jest.fn().mockResolvedValue({
        accessToken: 'mock-long-token',
        expiresAt: new Date(),
      });
      (service as any).fetchManagedPages = jest.fn().mockResolvedValue([]);

      // ACT & ASSERT
      await expect(service.handleCallback('valid-code', 'valid-state')).rejects.toThrow(
        'No manageable Facebook Pages',
      );
    });

    it('stores pages encrypted and returns sanitized page list without exposing tokens', async () => {
      // ARRANGE
      const prisma = createPrismaMock();
      prisma.facebookOAuthSession.update.mockResolvedValue({});
      const service = new FacebookService(prisma, config);
      (service as any).consumeState = jest.fn().mockResolvedValue({
        id: 'session-1',
        userId: 'user-1',
      });
      (service as any).exchangeCode = jest.fn().mockResolvedValue({
        accessToken: 'mock-long-token',
        expiresAt: new Date(Date.now() + 100000),
      });
      (service as any).fetchManagedPages = jest.fn().mockResolvedValue([
        { id: 'page-1', name: 'Page One', access_token: 'secret-token-1', tasks: ['CREATE_CONTENT'] },
        { id: 'page-2', name: 'Page Two', access_token: 'secret-token-2', tasks: ['CREATE_CONTENT'] },
      ]);

      // ACT
      const result = await service.handleCallback('valid-code', 'valid-state');

      // ASSERT
      expect(result.sessionId).toBe('session-1');
      expect(result.pages).toHaveLength(2);
      expect(result.pages[0]).not.toHaveProperty('access_token');
      expect(result.pages[1]).not.toHaveProperty('access_token');
      expect(prisma.facebookOAuthSession.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'session-1' },
          data: expect.objectContaining({
            pendingPagesEncrypted: expect.any(String),
          }),
        }),
      );
    });
  });

  describe('Page Selection & Cross-User Security', () => {
    it('stores selected page and encrypts its access token at rest', async () => {
      // ARRANGE
      const prisma = createPrismaMock();
      const pages = [
        { id: 'page-1', name: 'Page One', access_token: 'raw-secret-token' },
      ];
      prisma.facebookOAuthSession.findUnique.mockResolvedValue({
        id: 'session-1',
        userId: 'user-1',
        expiresAt: new Date(Date.now() + 60000),
        tokenExpiresAt: new Date(Date.now() + 60000),
        pendingPagesEncrypted: EncryptionUtil.encrypt(JSON.stringify(pages)),
      });
      prisma.facebookPage.upsert.mockResolvedValue({ id: 'fb-page-row-id', pageId: 'page-1' });
      prisma.facebookPageToken.upsert.mockResolvedValue({});
      prisma.facebookOAuthSession.delete.mockResolvedValue({});
      const service = new FacebookService(prisma, config);

      // ACT
      const result = await service.selectPage('user-1', 'session-1', 'page-1');

      // ASSERT
      expect(result.success).toBe(true);
      const storedToken = prisma.facebookPageToken.upsert.mock.calls[0][0].create.accessTokenEncrypted;
      expect(storedToken).not.toBe('raw-secret-token');
      expect(EncryptionUtil.decrypt(storedToken)).toBe('raw-secret-token');
      expect(prisma.facebookOAuthSession.delete).toHaveBeenCalledWith({ where: { id: 'session-1' } });
    });

    it('rejects page selection when user does not own the OAuth session', async () => {
      // ARRANGE: session belongs to 'user-attacker'
      const prisma = createPrismaMock();
      prisma.facebookOAuthSession.findUnique.mockResolvedValue({
        id: 'session-victim',
        userId: 'user-victim',
        expiresAt: new Date(Date.now() + 60000),
        tokenExpiresAt: new Date(Date.now() + 60000),
        pendingPagesEncrypted: EncryptionUtil.encrypt(JSON.stringify([{ id: 'page-1', name: 'P', access_token: 'tok' }])),
      });
      const service = new FacebookService(prisma, config);

      // ACT & ASSERT: attacker attempts to select page from victim's session
      await expect(
        service.selectPage('user-attacker', 'session-victim', 'page-1'),
      ).rejects.toThrow('Facebook connection session is invalid or expired');
    });

    it('disconnects a connected page and purges its stored token', async () => {
      // ARRANGE
      const prisma = createPrismaMock();
      prisma.facebookPage.findFirst.mockResolvedValue({ id: 'page-row-id', userId: 'user-1' });
      prisma.facebookPageToken.deleteMany.mockResolvedValue({ count: 1 });
      prisma.facebookPage.update.mockResolvedValue({ status: 'DISCONNECTED' });
      const service = new FacebookService(prisma, config);

      // ACT
      const result = await service.disconnectPage('user-1', 'page-row-id');

      // ASSERT
      expect(result.status).toBe('DISCONNECTED');
      expect(prisma.facebookPageToken.deleteMany).toHaveBeenCalledWith({
        where: { facebookPageId: 'page-row-id' },
      });
    });
  });
});
