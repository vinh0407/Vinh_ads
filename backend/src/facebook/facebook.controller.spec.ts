import { FacebookController } from './facebook.controller';
import { Response } from 'express';

describe('FacebookController (OAuth & Pages)', () => {
  let controller: FacebookController;
  let facebookService: any;
  let configService: any;
  let responseMock: any;

  beforeEach(() => {
    facebookService = {
      createOAuthState: jest.fn().mockResolvedValue('test-state-token'),
      getOAuthUrl: jest.fn().mockReturnValue('https://facebook.com/oauth/dialog'),
      handleCallback: jest.fn().mockResolvedValue({ sessionId: 'session-xyz' }),
      getPendingPages: jest.fn().mockResolvedValue([{ id: 'page-1', name: 'P1' }]),
      selectPage: jest.fn().mockResolvedValue({ success: true }),
      getPages: jest.fn().mockResolvedValue([{ id: 'page-1', pageName: 'Page 1' }]),
      disconnectPage: jest.fn().mockResolvedValue({ status: 'DISCONNECTED' }),
    };
    configService = {
      get: jest.fn((key: string) => {
        if (key === 'app.frontendUrl') return 'http://localhost:5173';
        return null;
      }),
    };
    controller = new FacebookController(facebookService, configService);
    responseMock = {
      redirect: jest.fn(),
    } as unknown as Response;
  });

  it('generates state and connect URL for authenticated user', async () => {
    // ARRANGE
    const userId = 'user-123';

    // ACT
    const result = await controller.getConnectUrl(userId);

    // ASSERT
    expect(facebookService.createOAuthState).toHaveBeenCalledWith('user-123');
    expect(facebookService.getOAuthUrl).toHaveBeenCalledWith('test-state-token');
    expect(result).toEqual({
      url: 'https://facebook.com/oauth/dialog',
      state: 'test-state-token',
    });
  });

  it('redirects to frontend with oauthError when Facebook returns an error param', async () => {
    // ARRANGE
    const code = '';
    const state = 'state-1';
    const error = 'access_denied';

    // ACT
    await controller.callback(code, state, error, responseMock);

    // ASSERT
    expect(responseMock.redirect).toHaveBeenCalledWith(
      'http://localhost:5173/dashboard/facebook?oauthError=access_denied',
    );
    expect(facebookService.handleCallback).not.toHaveBeenCalled();
  });

  it('exchanges code and redirects with oauthSession on successful callback', async () => {
    // ARRANGE
    const code = 'valid-auth-code';
    const state = 'valid-oauth-state';

    // ACT
    await controller.callback(code, state, undefined as any, responseMock);

    // ASSERT
    expect(facebookService.handleCallback).toHaveBeenCalledWith('valid-auth-code', 'valid-oauth-state');
    expect(responseMock.redirect).toHaveBeenCalledWith(
      'http://localhost:5173/dashboard/facebook?oauthSession=session-xyz',
    );
  });

  it('delegates page selection to FacebookService with authenticated user', async () => {
    // ARRANGE
    const userId = 'user-123';
    const dto = { sessionId: 'session-xyz', pageId: 'page-1' };

    // ACT
    const result = await controller.selectPage(userId, dto as any);

    // ASSERT
    expect(facebookService.selectPage).toHaveBeenCalledWith('user-123', 'session-xyz', 'page-1');
    expect(result).toEqual({ success: true });
  });

  it('disconnects page for authenticated user', async () => {
    // ARRANGE
    const userId = 'user-123';
    const pageId = 'page-row-1';

    // ACT
    const result = await controller.disconnectPage(userId, pageId);

    // ASSERT
    expect(facebookService.disconnectPage).toHaveBeenCalledWith('user-123', 'page-row-1');
    expect(result).toEqual({ status: 'DISCONNECTED' });
  });
});
