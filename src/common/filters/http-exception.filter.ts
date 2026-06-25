import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    if (!(exception instanceof HttpException)) {
      this.logger.error(
        `${request.method} ${request.url} -> ${exception instanceof Error ? exception.stack : String(exception)}`,
      );
    } else {
      this.logger.warn(
        `${request.method} ${request.url} -> ${exception.getStatus()} ${exception.message}`,
      );
    }

    // If the response has already been sent (e.g. by a guard redirect),
    // skip writing again to avoid ERR_HTTP_HEADERS_SENT.
    if (response.headersSent) {
      return;
    }

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    const message =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : (exceptionResponse as Record<string, unknown>).message || 'Error';

    response.status(status).json({
      success: false,
      message,
      error: {
        code: status,
        details:
          typeof exceptionResponse === 'string' ? undefined : exceptionResponse,
      },
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
