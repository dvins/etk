import { beforeEach, describe, it, expect, vi } from 'vitest'
import * as Sentry from '@sentry/nestjs';

import { SetUserToSentryMiddleware } from './sentry.middleware';
import { SentryService } from './sentry.service';

vi.mock('@sentry/nestjs', async () => {

const original = await vi.importActual('@sentry/nestjs');
  return {
    __esModule: true,
    ...original,
    setTag: vi.fn().mockImplementation(() => {})
  };
});

describe('SetUserToSentryMiddleware', () => {
  let service: SetUserToSentryMiddleware;

  beforeEach(async () => {
    vi.resetModules();

    service = new SetUserToSentryMiddleware();
    SentryService.headersToTags = {
      'test-header-id': 'testId',
      testUserId: 'testUserId',
    };
    SentryService.headersToUser = {
      'test-header-user-id': 'testHeaderUserId',
      testUserId: 'testUserId',
      email: 'email',
    };
  });

  it('should canActivate', () => {
    const spy = vi.spyOn(Sentry, 'setTag');

    const result = service.use(
      {
        get: vi.fn().mockReturnValue('testHeaderUserId'),
        auth: {
          testUserId: 'testUserId',
          email: 'email',
        },
      } as any,
      {} as any,
      vi.fn(),
    );

    expect(result).toBeUndefined();
    expect(spy).toHaveBeenCalled();
  });

  it('should canActivate2', () => {
    const spy = vi.spyOn(Sentry, 'setTag');

    const result = service.use(
      {
        get: vi.fn().mockReturnValue('testHeaderUserId'),
        auth: {
          testUserId: 'testUserId',
          email: 'email',
        },
      } as any,
      {} as any,
      vi.fn(),
    );

    expect(result).toBeUndefined();
    expect(spy).toHaveBeenCalled();
  });

  it('should canActivate 3, do not call set tags', () => {
    const spy = vi.spyOn(Sentry, 'setTag');

    const result = service.use(
      {
        get: vi.fn().mockReturnValue(null),
        auth: {},
      } as any,
      {} as any,
      vi.fn(),
    );

    expect(result).toBeUndefined();
    expect(spy).not.toHaveBeenCalled();
  });
});
