import { describe, it, expect, vi } from 'vitest'
import { Test, TestingModule } from '@nestjs/testing';
import { Injectable, type Logger } from '@nestjs/common';
import { mockDeep } from 'vitest-mock-extended';

import { SentryTransaction } from './sentry.decorator';
import { NestjsLogger, type LoggerConfiguration } from '../logger';


vi.mock('@sentry/node', async () => {
  const original = await vi.importActual('@sentry/node');

  return {
    ...original,
  };
});

describe('Sentry Decorators', () => {
  let logger: NestjsLogger;
  const defaultLogger = mockDeep<Logger>({
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    apply: vi.fn(),
    child: () => defaultLogger,
  } as any);

  const config: LoggerConfiguration = {
    logLevel: 'log',
    filename: '',
    contextAttributes: {
      tenantId: true,
      jobId: true,
      testKey3: true,
      testKey2: true,
    },
  };

  describe('SentryTransaction Decorator Tests', () => {
    @Injectable()
    class TestService {
      constructor() {}
      @SentryTransaction({
        op: 'process',
        startNewTrace: true,
        clearContextFor: ['Tracked Job', 'Tracked Job Event'],
      })
      async testMethod(data: any) {}

      @SentryTransaction({
        op: 'fail',
        startNewTrace: true,
        clearContextFor: ['Tracked Job', 'Tracked Job Event'],
      })
      async failMethod(data: any) {}

      @SentryTransaction({
        op: 'process',
        startNewTrace: true,
        clearContextFor: ['Tracked Job', 'Tracked Job Event'],
      })
      testMethod2(data: any) {}
    }

    it('should SentryTransaction', async () => {
      const module: TestingModule = await Test.createTestingModule({
        exports: [TestService],
        providers: [
          TestService,
          {
            provide: NestjsLogger,
            useValue: logger,
          },
        ],
      }).compile();

      const service = module.get(TestService);

      const result = await service.testMethod({ test: 'test' });

      expect(result).toBeUndefined();
    });

    it('should SentryTransaction2', async () => {
      const module: TestingModule = await Test.createTestingModule({
        exports: [TestService],
        providers: [
          TestService,
          {
            provide: NestjsLogger,
            useValue: logger,
          },
        ],
      }).compile();

      const service = module.get(TestService);

      const result = service.testMethod2({ test: 'test' });

      expect(result).toBeTruthy();
    });

    it('should fail SentryTransaction', async () => {
      const module: TestingModule = await Test.createTestingModule({
        exports: [TestService],
        providers: [
          TestService,
          {
            provide: NestjsLogger,
            useValue: logger,
          },
        ],
      }).compile();

      const service = module.get(TestService);
      try {
        await service.failMethod({ test: 'test' });
      } catch (error: any) {
        expect(error.message).toStrictEqual('Error');
      }
    });
  });
});
