import { ArgumentsHost, Catch, type ExceptionFilter } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { ExternalExceptionFilter } from '@nestjs/core/exceptions/external-exception-filter';
import { GqlContextType } from '@nestjs/graphql';
import { SentryExceptionCaptured } from '@sentry/nestjs';

@Catch()
export class SentryExceptionFilter extends BaseExceptionFilter implements ExceptionFilter {
  @SentryExceptionCaptured()
  catch(exception: Error, host: ArgumentsHost) {
    if (host.getType<GqlContextType>() === 'graphql') {
      new ExternalExceptionFilter().catch(exception, host);
    } else {
      super.catch(exception, host);
    }
  }
}
