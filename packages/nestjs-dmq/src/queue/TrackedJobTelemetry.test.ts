import { describe, it, expect, vi } from 'vitest'
import * as Sentry from '@sentry/node';
import { LoggerConfiguration, NestjsLogger } from '@omedym/nestjs-telemetry';
import { setTrackedJobTelemetry } from './TrackedJobTelemetry';
import { mockDeep } from 'vitest-mock-extended';
import { AsyncLocalStorage } from 'async_hooks';
import { ClsService } from 'nestjs-cls';
import { Logger } from 'winston';
import { DateTime } from 'luxon';
import { IMessageHandlerContext } from './TrackedQueueProcessor';

vi.mock('@sentry/node', async () => {
  const original = await vi.importActual('@sentry/node');

  return {
    ...original,
    setTags: vi.fn(),
    getCurrentScope: vi.fn().mockReturnValue({
      setTags: vi.fn(),
      getScopeData: vi.fn(),
      setContext: vi.fn(),
    }),
  };
});

describe('setTrackedJobEventTelemetry', () => {
  const defaultLogger = mockDeep<Logger>({
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    apply: vi.fn(),
    child: () => defaultLogger,
  } as any);

  it('should setTrackedJobEventTelemetry, set Tags from message payload', () => {
    const localStorage = new AsyncLocalStorage();
    const localStorageService = new ClsService<any>(localStorage);
    const config: LoggerConfiguration = {
      logLevel: 'log',
      filename: '',
      contextAttributes: {
        tenantId: true,
        key1: true,
        key2: true,
      },
    };
    const logger = new NestjsLogger(defaultLogger, config, localStorageService);

    const context: IMessageHandlerContext<any> = {
      job: {
        name: 'jobTestName',
        queueName: 'queueName',
        id: 'jobId-1',
        data: {
          metadata: {},
          createdAt: DateTime.now(),
          updatedAt: DateTime.now(),
        },
        queue: {} as any,
      } as any,
      message: {
        type: 'messageType',
        id: 'message-id-1',
        jobEventId: 'jobEventId',
        jobEventType: 'jobEventType',
        queueId: 'queueId',
        tenantId: 'tenantId',
        data: {
          tenantId: 'tenantId',
          key1: 'key1-test-value',
        },
      },
    };
    // it is not possible to mock calls to methods that are called inside other methods
    // https://vitest.dev/guide/mocking.html#mocking-pitfalls
    const spy = vi.spyOn(Sentry, 'getCurrentScope');
    const result = setTrackedJobTelemetry(logger, context);
    expect(result).toBeDefined();
    expect(spy).toBeCalledTimes(4);
  });
});
