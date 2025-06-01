import { beforeEach, describe, it, expect, vi } from 'vitest'
import { Test, TestingModule } from '@nestjs/testing';
import { Injectable, type Logger } from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import { Event } from '@sentry/core';
import { mockDeep } from 'vitest-mock-extended';

import { SentryService } from './sentry.service';
import { NestjsLogger, type LoggerConfiguration } from '../logger';


vi.mock('@sentry/nestjs', async () => {

const original = await vi.importActual('@sentry/nestjs');
  return {
    __esModule: true,
    ...original,
    setTag: vi.fn().mockImplementation(() => {})
  };
});

describe('SentryService', () => {
  let service: SentryService;
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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SentryService,
        {
          provide: NestjsLogger,
          useValue: logger,
        },
      ],
    }).compile();

    service = module.get<SentryService>(SentryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should init Sentry', () => {
    const result = SentryService.init({
      tags: {
        test: 'test',
      },
    });
    expect(result).toBeUndefined();
  });

  it('should initSentry', () => {
    const spy = vi.spyOn(global.console, 'info');

    const result = SentryService.init({
      tags: {
        test: 'test',
      },
    });
    expect(result).toBeUndefined();
    expect(spy).toHaveBeenCalledWith('Sentry initialized');
  });

  it('should setTag', () => {
    const spy = vi.spyOn(Sentry, 'setTag');

    const result = service.setTag('name', 'value');
    expect(spy).toHaveBeenCalled();
  });

  it('should setTags', () => {
    const spy = vi.spyOn(Sentry, 'setTags');

    const result = service.setTags({ name: 'value' });
    expect(spy).toHaveBeenCalled();
  });

  it('should captureException', () => {
    const spy = vi.spyOn(Sentry, 'captureException');

    const result = service.captureException('name');

    expect(spy).toHaveBeenCalled();
  });

  it('should postProcessSentryEvent', () => {
    const result = SentryService.postProcessSentryEvent({
      extra: {
        args: {
          test: 'test',
          test1: 'test1',
          data: {
            test: 'test',
            test2: 'test2',
          },
        },
      },
      tags: {
        test: 'test',
      },
    } as Event, ['test']);

    expect(result).toBeUndefined();
  });

  it('should convertArgsToTags', () => {
    const result = SentryService.convertArgsToTags(
      {
        extra: {
          args: {
            test: 'test',
            tenantId: 'tenantId',
            data: {
              test: 'test',
              tenantId2: 'tenantId',
            },
          },
        },
        tags: {
          test: 'test',
        },
      } as Event,
      ['tenantId', 'test', 'tenantId2'],
    );

    expect(result).toBeUndefined();
  });

  it('should convertArgsToTags with empty values for events', () => {
    const result = SentryService.convertArgsToTags({} as Event, ['key1']);

    expect(result).toBeUndefined();
  });

  it('should stringifyEventExtra ', () => {
    const result = SentryService.stringifyEventExtra(
      {
        extra: {
          test: {
            data: 'test',
          },
        },
        tags: {
          test: 'test',
        },
      } as Event,
      'test',
    );

    expect(result).toBeUndefined();
  });
});
