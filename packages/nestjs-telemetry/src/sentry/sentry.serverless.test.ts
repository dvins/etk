import { describe, it, expect, vi } from 'vitest'
import * as Sentry from '@sentry/aws-serverless';
import { initSentryServerless } from './sentry.serverless';

vi.mock('@sentry/aws-serverless', async () => {
  const original = await vi.importActual('@sentry/aws-serverless');

  return {
    ...original,
    init: vi.fn().mockImplementation((config) => {
      const { debug } = config;
      if (debug) {
        return true;
      } else {
        throw Error('Error');
      }
    }),
    setTag: vi.fn(),
    setTags: vi.fn(),
  };
});

describe('Sentry Serverless Service', () => {
  it('should initSentryServerless', () => {
    const spy = vi.spyOn(Sentry, 'setTags');

    const result = initSentryServerless({
      tags: { service: 'test' },
      debug: true,
      integrations: [],
    });
    expect(result).toBeUndefined();
    expect(spy).toHaveBeenCalled();
  });

  it('should fail to initSentryServerless', () => {
    const spy = vi.spyOn(global.console, 'log');

    const result = initSentryServerless({
      tags: { service: 'test' },
      debug: false,
    });
    expect(result).toBeUndefined();
    expect(spy).toHaveBeenCalledWith('WARNING: Error during Sentry initialization, will not affect application');
  });
});
