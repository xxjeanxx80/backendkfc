import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exceptions');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const baseMessage =
      exception instanceof HttpException
        ? this.extractMessage(exception.getResponse())
        : 'Internal server error';

    const cause =
      exception instanceof HttpException &&
      (exception as unknown as { cause?: unknown }).cause
        ? (exception as unknown as { cause?: unknown }).cause
        : exception;

    const mysqlErrno = this.extractErrno(cause);
    const mysqlSqlState = this.extractSqlState(cause);
    const reqUser = (request as Request & { user?: { id?: number; userId?: number; role?: string; username?: string } }).user;
    const userId = reqUser?.id ?? reqUser?.userId ?? null;
    const userRole = reqUser?.role ?? 'none';
    const username = reqUser?.username ?? 'none';
    const authHeader = request.headers?.authorization ? 'present' : 'missing';

    this.logger.error(
      `[${request.method}] ${request.url} ${status} ${baseMessage} ${mysqlErrno ? `errno=${mysqlErrno}` : ''} ${mysqlSqlState ? `sqlState=${mysqlSqlState}` : ''} userId=${userId ?? 'anonymous'} role=${userRole} username=${username} authHeader=${authHeader}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    const payload: Record<string, unknown> = {
      success: false,
      message: baseMessage,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    if (mysqlErrno || mysqlSqlState) {
      payload.errno = mysqlErrno ?? undefined;
      payload.sqlState = mysqlSqlState ?? undefined;
    }

    if (exception instanceof HttpException) {
      const res = exception.getResponse();
      if (typeof res !== 'string') {
        payload.error = res;
      }
    } else if (
      cause instanceof QueryFailedError ||
      mysqlErrno ||
      mysqlSqlState
    ) {
      payload.error = {
        type: 'QueryFailedError',
      };
    }

    response.status(status).json(payload);
  }

  private extractMessage(response: unknown): string {
    if (!response) return 'Error';
    if (typeof response === 'string') return response;
    if (typeof (response as { message?: unknown }).message === 'string')
      return (response as { message: string }).message;
    if (Array.isArray((response as { message?: unknown }).message))
      return (response as { message: unknown[] }).message.join(', ');
    if (typeof (response as { error?: unknown }).error === 'string')
      return (response as { error: string }).error;
    return 'Error';
  }

  private extractErrno(error: unknown): number | null {
    if (!error) return null;
    if (typeof (error as { errno?: unknown }).errno === 'number')
      return (error as { errno: number }).errno;
    return null;
  }

  private extractSqlState(error: unknown): string | null {
    if (!error) return null;
    if (typeof (error as { sqlState?: unknown }).sqlState === 'string')
      return (error as { sqlState: string }).sqlState;
    return null;
  }
}
