import { Type, Abstract } from '@nestjs/common';
import type { NodeOptions } from '@sentry/node';
import { SamplingContext } from '@sentry/core';

export interface SentryOptions extends NodeOptions {
  tags?: { [key: string]: string };
  prismaPostgresProvider?: Type<any> | Abstract<any> | string | symbol;
  contextArgumentsToTags?: Array<string>;
  reMapAttributes?: Record<string, string>;
  headersToTags?: Record<string, string>;
  headersToUser?: Record<string, string>;
}

export interface ApolloOperationData {
  requestType?: string;
  operationName?: string;
}

export { SamplingContext };
