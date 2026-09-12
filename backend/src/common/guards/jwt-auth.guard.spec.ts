import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

describe('JwtAuthGuard (Authorization)', () => {
  let guard: JwtAuthGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new JwtAuthGuard(reflector);
  });

  it('allows access to public routes without calling super.canActivate', () => {
    // ARRANGE: route handler flagged as public with @Public()
    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as unknown as ExecutionContext;
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

    // ACT
    const result = guard.canActivate(context);

    // ASSERT
    expect(result).toBe(true);
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
  });

  it('delegates to passport AuthGuard when route is not public', () => {
    // ARRANGE: protected route without @Public()
    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as unknown as ExecutionContext;
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    const superCanActivate = jest.spyOn(
      Object.getPrototypeOf(JwtAuthGuard.prototype),
      'canActivate',
    ).mockReturnValue(true);

    // ACT
    const result = guard.canActivate(context);

    // ASSERT
    expect(result).toBe(true);
    expect(superCanActivate).toHaveBeenCalledWith(context);
    superCanActivate.mockRestore();
  });
});
