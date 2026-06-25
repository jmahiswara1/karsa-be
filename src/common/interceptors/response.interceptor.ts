import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  success: boolean;
  message: string;
  data: T;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
    return next.handle().pipe(
      map((data: any) => {
        const res = context.switchToHttp().getResponse();

        // If the controller already sent the response (e.g. res.redirect()),
        // skip wrapping to avoid ERR_HTTP_HEADERS_SENT.
        if (res.headersSent) {
          return data as Response<T>;
        }

        // If the controller already wrapped the response, don't wrap it again
        if (
          data &&
          typeof data === 'object' &&
          'success' in data &&
          'data' in data
        ) {
          return {
            ...data,
            message: (data.message as string) || 'Success',
          } as Response<T>;
        }
        return {
          success: true,
          message: 'Success',
          data: data !== undefined && data !== null ? data : ({} as T),
        };
      }),
    );
    /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
  }
}
