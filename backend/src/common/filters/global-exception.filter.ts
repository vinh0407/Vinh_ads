import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

export interface ErrorResponse {
  success: false;
  code: string;
  message: string;
  details?: unknown;
  timestamp: string;
  path: string;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_SERVER_ERROR';
    let message = 'An unexpected error occurred';
    let details: unknown = null;
    const path = request.path || request.url.split(/[?#]/, 1)[0];

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      if (this.isRecord(exceptionResponse)) {
        const body = exceptionResponse;
        code = typeof body.code === 'string' ? body.code : exception.name;
        message =
          typeof body.message === 'string' ? body.message : exception.message;
        details = body.details;
      } else {
        message = exception.message;
        code = exception.name;
      }
    }

    const isProduction = process.env.NODE_ENV === 'production';
    const internalMessage =
      !isProduction &&
      !(exception instanceof HttpException) &&
      exception instanceof Error
        ? `: ${exception.message}`
        : '';
    const stack =
      !isProduction && exception instanceof Error ? exception.stack : undefined;
    this.logger.error(
      `${request.method} ${path} - ${status} - ${code}: ${message}${internalMessage}`,
      stack,
    );

    const errorResponse: ErrorResponse = {
      success: false,
      code,
      message,
      details,
      timestamp: new Date().toISOString(),
      path,
    };

    response.status(status).json(errorResponse);
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
