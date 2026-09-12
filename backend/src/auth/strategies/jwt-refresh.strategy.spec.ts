import { UnauthorizedException } from '@nestjs/common';
import { JwtRefreshStrategy } from './jwt-refresh.strategy';
import { Request } from 'express';

describe('JwtRefreshStrategy (Refresh Token)', () => {
  let strategy: JwtRefreshStrategy;
  let authService: any;
  let configService: any;

  beforeEach(() => {
    authService = {
      validateRefreshToken: jest.fn(),
    };
    configService = {
      get: jest.fn().mockReturnValue('test-refresh-secret'),
    };
    strategy = new JwtRefreshStrategy(configService, authService);
  });

  it('extracts Bearer refresh token and validates it with user ID', async () => {
    // ARRANGE
    const req = {
      headers: { authorization: 'Bearer my-refresh-token' },
    } as unknown as Request;
    const payload = { sub: 'user-456', email: 'refresh@example.com' };
    const user = { id: 'user-456', email: 'refresh@example.com', status: 'ACTIVE' };
    authService.validateRefreshToken.mockResolvedValue(user);

    // ACT
    const result = await strategy.validate(req, payload);

    // ASSERT
    expect(authService.validateRefreshToken).toHaveBeenCalledWith(
      'my-refresh-token',
      'user-456',
    );
    expect(result).toEqual(user);
  });

  it('rejects request when authorization header is missing', async () => {
    // ARRANGE
    const req = { headers: {} } as unknown as Request;
    const payload = { sub: 'user-456', email: 'refresh@example.com' };

    // ACT & ASSERT
    await expect(strategy.validate(req, payload)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(authService.validateRefreshToken).not.toHaveBeenCalled();
  });

  it('rejects request when authorization header does not use Bearer scheme', async () => {
    // ARRANGE
    const req = {
      headers: { authorization: 'Basic dXNlcjpwYXNz' },
    } as unknown as Request;
    const payload = { sub: 'user-456', email: 'refresh@example.com' };

    // ACT & ASSERT
    await expect(strategy.validate(req, payload)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(authService.validateRefreshToken).not.toHaveBeenCalled();
  });
});
