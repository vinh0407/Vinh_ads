import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy (Authentication)', () => {
  let strategy: JwtStrategy;
  let authService: any;
  let configService: any;

  beforeEach(() => {
    authService = {
      validateUser: jest.fn(),
    };
    configService = {
      get: jest.fn().mockReturnValue('test-jwt-secret'),
    };
    strategy = new JwtStrategy(configService, authService);
  });

  it('validates active user successfully from token payload', async () => {
    // ARRANGE
    const payload = { sub: 'user-123', email: 'test@example.com' };
    const user = { id: 'user-123', email: 'test@example.com', status: 'ACTIVE' };
    authService.validateUser.mockResolvedValue(user);

    // ACT
    const result = await strategy.validate(payload);

    // ASSERT
    expect(authService.validateUser).toHaveBeenCalledWith('user-123');
    expect(result).toEqual(user);
  });

  it('rejects validation when user is missing or inactive', async () => {
    // ARRANGE: user is null or suspended
    const payload = { sub: 'user-suspended', email: 'suspended@example.com' };
    authService.validateUser.mockResolvedValue(null);

    // ACT & ASSERT
    await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
    expect(authService.validateUser).toHaveBeenCalledWith('user-suspended');
  });
});
