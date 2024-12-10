import * as Sentry from '@sentry/node';
import { LoggerConfiguration, NestjsLogger } from '@omedym/nestjs-telemetry';
import { setTrackedJobTelemetry } from './TrackedJobTelemetry';
import { mockDeep } from 'jest-mock-extended';
import { AsyncLocalStorage } from 'async_hooks';
import { ClsService } from 'nestjs-cls';
import { Logger } from 'winston';
import { DateTime } from 'luxon';
import { IMessageHandlerContext } from './TrackedQueueProcessor';

describe('setTrackedJobEventTelemetry', () => {
  const defaultLogger = mockDeep<Logger>({
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    apply: jest.fn(),
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
    const spy = jest.spyOn(Sentry, 'setTags');
    const result = setTrackedJobTelemetry(logger, context);
    expect(result).toBeDefined();
    expect(spy).toBeCalledWith({
      jobEvent: null,
      jobEventId: null,
      jobEventType: null,
      jobId: 'jobId-1',
      messageId: 'message-id-1',
      messageType: 'messageType',
      queue: null,
      queueId: 'queueName',
      tenantId: 'tenantId',
      key1: 'key1-test-value',
    });
  });
});
