import { BadRequestException, HttpStatus, Logger } from '@nestjs/common';
import { GlobalExceptionFilter } from './global-exception.filter';

function createHost(url: string) {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const request = { method: 'GET', url };
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
      getRequest: () => request,
    }),
  } as any;
  return { host, status, json };
}

describe('GlobalExceptionFilter', () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('preserves structured HTTP exception responses', () => {
    const { host, status, json } = createHost('/api/example');
    const filter = new GlobalExceptionFilter();

    filter.catch(
      new BadRequestException({
        code: 'INVALID_INPUT',
        message: 'Invalid input',
        details: ['name is required'],
      }),
      host,
    );

    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        code: 'INVALID_INPUT',
        message: 'Invalid input',
        details: ['name is required'],
        path: '/api/example',
      }),
    );
  });

  it('hides internal errors and strips sensitive query parameters', () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const { host, status, json } = createHost(
      '/api/facebook/callback?code=secret-code&state=secret-state',
    );
    const filter = new GlobalExceptionFilter();

    try {
      filter.catch(new Error('database password exposed'), host);
    } finally {
      if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = originalNodeEnv;
    }

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
        path: '/api/facebook/callback',
      }),
    );
    const loggedOutput = jest
      .mocked(Logger.prototype.error)
      .mock.calls.flat()
      .join(' ');
    expect(loggedOutput).not.toContain('database password exposed');
    expect(loggedOutput).not.toContain('secret-code');
  });
});
