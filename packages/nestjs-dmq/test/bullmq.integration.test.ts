import {
  InjectQueue,
  BullModule,
  Processor,
  OnQueueEvent,
  OnWorkerEvent,
  QueueEventsListener,
  QueueEventsHost,
  WorkerHost,
} from '@nestjs/bullmq';
import { Injectable, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { createId } from '@paralleldrive/cuid2';
import { DelayedError, Job, Queue } from 'bullmq';
import { DateTime } from 'luxon';
import { GenericContainer, StartedTestContainer } from 'testcontainers';

import { NestjsSentryModule, SentryTransaction } from '@omedym/nestjs-telemetry';

import sentryTestkit from 'sentry-testkit';
const { testkit, sentryTransport } = sentryTestkit();

const TestConfig = {
  redis: {
    port: process.env.TESTCONFIG__REDIS__PORT
      ? Number(process.env.TESTCONFIG__REDIS__PORT) : 6379,
    startupMs: process.env.TESTCONFIG__REDIS__STARTUP_MS
      ? Number(process.env.TESTCONFIG__REDIS__STARTUP_MS) : 1000 * 15,
  },
  bullMq: {
    delayMs: process.env.TESTCONFIG__BULLMQ__DELAY_MS
      ? Number(process.env.TESTCONFIG__BULLMQ__DELAY_MS) : 1000 * 1,
    showLogs: process.env.TESTCONFIG__BULLMQ__SHOWLOGS
      ? Boolean(process.env.TESTCONFIG__BULLMQ__SHOWLOGS) : false,
  },
  jest: {
    timeoutMs: process.env.TESTCONFIG__JEST__TIMEOUT_MS
      ? Number(process.env.TESTCONFIG__JEST__TIMEOUT_MS) : 1000 * 10,
  },
  sentry: {
    dsn: process.env.SENTRY_DSN
      ? process.env.SENTRY_DSN : '',
  }
};

// import and call init before any other module
import { SentryService } from '@omedym/nestjs-telemetry';
SentryService.init({
  tags: {
    service: 'types-messaging',
  },
  debug: false,
  transport: sentryTransport,
  dsn: TestConfig.sentry.dsn,
});


/**
 * Simulate an external service that when initially called does not yet have
 * an available result. Only after subsequently polling is it ultimately ready;
 */
class ExternalService {
  public totalRequests = 0;
  public minRequests;

  constructor(options?: { minRequests?: number; }) {
    this.minRequests = options?.minRequests ?? 1;
  }

  async getResult(): Promise<'done'|'pending'> {
    ++this.totalRequests;
    return this.totalRequests < this.minRequests ? 'pending' : 'done';
  }
}

class BaseTestProcessor extends WorkerHost {
  public externalService: ExternalService;
  public handler: (job: Job<any, any, string>, token: string) => Promise<any>;

  public logs: string[] = [`[000] Processor Started`];

  constructor(externalService: ExternalService) {
    super();

    this.externalService = externalService;

    this.handler = async (job: Job<any, any, string>, token: string) =>
      await this.externalService.getResult();
  }

  async log(message: string) {
    const next = this.logs.length;
    const entry = next > 99
      ? next
      : next > 9
        ? `0${next}`
        : `00${next}`;

    this.logs.push(`[${entry}] ${message}`);
  }

  async process(job: Job<any, any, string>, token: string): Promise<any> {
    const result = await this.handler(job, token);
    return result;
  }
}

/** Monitor A BullMQ Queue Using BullMQ Queue Events */
class QueueListener extends QueueEventsHost {
  logs: string[] = [`[000] Queue Listener Started`];

  async log(message: string) {
    const next = this.logs.length;
    const entry = next > 99
      ? next
      : next > 9
        ? `0${next}`
        : `00${next}`;

    this.logs.push(`[${entry}] ${message}`);
  }

  onAdded(jobId: string, name: string) { this.log(`Job ${jobId} Added: ${name}`) };
  onCompleted(jobId: string, returnvalue: string) { this.log(`Job ${jobId} Completed: ${returnvalue}`) };
  onDelayed(jobId: string, delay: number, id: string) { this.log(`Job ${jobId} Delayed: ${DateTime.fromMillis(Number(delay)).toISO()} id: ${id}`) };
  onError(error: Error) { this.log(`Queue Error: ${error.name}, ${error.message}, ${error.cause}`) };
  onPaused() { this.log(`Queue Paused`) };
  onResumed() { this.log(`Queue Resumed`) };

  @OnQueueEvent('added')
  @SentryTransaction({ name: 'onQueueEvent-added' })
  _onAdded(event: { jobId: string, name: string }, id: string) { this.onAdded(event.jobId, event.name) }

  @OnQueueEvent('completed')
  @SentryTransaction({ name: 'onQueueEvent-completed' })
  _onCompleted(event: { jobId: string, returnvalue: string, prev?: string}, id: string) {
    this.onCompleted(event.jobId, event.returnvalue);
  }

  @OnQueueEvent('delayed')
  @SentryTransaction({ name: 'onQueueEvent-delayed' })
  _onDelayed(event: { jobId: string, delay: number }, id: string) { this.onDelayed(event.jobId, event.delay, id) }

  @OnQueueEvent('error')
  _onError(event: Error) { this.onError(event) }

  @OnQueueEvent('paused')
  _onPaused() { this.onPaused(); }

  @OnQueueEvent('resumed')
  _onResumed() { this.onResumed(); }
}

describe('BullMQ Processor', () => {
  jest.setTimeout(TestConfig.jest.timeoutMs);

  let testNum = 0;

  let app: INestApplication;
  let container: StartedTestContainer;
  let externalService: ExternalService;
  let listener: QueueListener;
  let processor: BaseTestProcessor;
  let producer: { queue: Queue };

  const insertQueueSpies = (options?: {
    externalService?: ExternalService;
    queueListener?: QueueListener;
  }) => {
    const target = {
      externalService: options?.externalService || processor.externalService,
      queueListener: options?.queueListener || listener,
    }

    return {
      console: {
        info: jest.spyOn(global.console, 'info'),
      },
      queue: {
        onLog: jest.spyOn(target.queueListener, 'log'),
        onAdded: jest.spyOn(target.queueListener, 'onAdded'),
        onCompleted: jest.spyOn(target.queueListener, 'onCompleted'),
        onDelayed: jest.spyOn(target.queueListener, 'onDelayed'),
        onError: jest.spyOn(target.queueListener, 'onError'),
        onPaused: jest.spyOn(target.queueListener, 'onPaused'),
        onResumed: jest.spyOn(target.queueListener, 'onResumed'),
      },
      external: {
        getResult: jest.spyOn(target.externalService, 'getResult')
      },

      showListenerLogs: (warn: boolean = false) => (warn || TestConfig.bullMq.showLogs)
        && console.warn(JSON.stringify(listener.logs, null, 2)),
      showProcessorLogs: (warn: boolean = false) => (warn || TestConfig.bullMq.showLogs)
        && console.warn(JSON.stringify(processor.logs, null, 2)),
  }};

  beforeAll(async ()  => {
    container = await new GenericContainer('redis')
      .withExposedPorts(TestConfig.redis.port)
      .withStartupTimeout(TestConfig.redis.startupMs)
      .start();
  });

  beforeEach(async () => {
    testNum++;
    const QUEUE_NAME = `test_${testNum}`;
    const redisConnectionOptions = {
      host: container.getHost(),
      port: container.getMappedPort(TestConfig.redis.port)
    };

    @Injectable()
    @Processor(QUEUE_NAME)
    class TestProcessor extends BaseTestProcessor {
      constructor(externalService: ExternalService) {
        super(externalService)
      }

      @OnWorkerEvent('active')
      onActive(job: Job<any, any, string>, prev: string) {
        this.log(`Job ${job.id} Active: ${JSON.stringify(prev)}`);
      }

      @OnWorkerEvent('completed')
      onCompleted(job: Job<any, any, string>) {
        this.log(`Job ${job.id} Completed: ${JSON.stringify(job.returnvalue)}`);
      }

      @OnWorkerEvent('error')
      onError(error: Error) {
        this.log(`Processor Error: ${error.name} { message: ${error.message} cause: ${error.cause} }`);
      };

      @OnWorkerEvent('failed')
      onFailed(job: Job<any, any, string>, error: Error, prev: string) {
        this.log(`Job ${job.id} Failed: ${error.name} { message: ${error.message} cause: ${error.cause} }`);
      };

      @OnWorkerEvent('paused')
      onPaused() {
        this.log(`Processor Paused`);
      }

      @OnWorkerEvent('progress')
      onProgress(job: Job<any, any, string>, progress: number | object) {
        this.log(`Job ${job.id} Progress: ${typeof(progress) === 'object' ? JSON.stringify(progress) : progress}`);
      }

      @OnWorkerEvent('stalled')
      onStalled(jobId: string, prev: string) {
        this.log(`Job ${jobId} Stalled: ${JSON.stringify(prev)}`);
      }
    }

    class TestQueue {
      constructor(@InjectQueue(QUEUE_NAME) public queue: Queue) { }
    }

    /** The `lastEventId` setting is critical for ensuring the listener captures events that occurred before initialization */
    @QueueEventsListener(QUEUE_NAME, { lastEventId: '0-0', connection: redisConnectionOptions })
    class TestQueueListener extends QueueListener { }

    const moduleRef = await Test.createTestingModule({
      imports: [
        BullModule.forRoot({ connection: redisConnectionOptions }),
        BullModule.registerQueue({ name: QUEUE_NAME }),
        NestjsSentryModule,
      ],
      providers: [ ExternalService, TestProcessor, TestQueue, TestQueueListener ],
    }).compile();


    app = moduleRef.createNestApplication();
    processor = moduleRef.get<BaseTestProcessor>(TestProcessor);
    listener = moduleRef.get<TestQueueListener>(TestQueueListener);
    externalService = moduleRef.get<ExternalService>(ExternalService);
    producer = moduleRef.get<TestQueue>(TestQueue);

    await app.init();
    await processor.worker.waitUntilReady();
    await listener.queueEvents.waitUntilReady();

  });

  afterEach(async () => {
    await app.close();
    testkit.reset();
  });

  afterAll(async () => { await container.stop(); })

  describe('event', () => {
    it('can return non-delayed result', async () => {
      const spies = insertQueueSpies();
      spies.showListenerLogs();

      await producer.queue.add(createId(), {});
      await processor.worker.delay(TestConfig.bullMq.delayMs);

      spies.showListenerLogs();

      expect(spies.queue.onLog).toHaveBeenCalledTimes(2);

      expect(spies.external.getResult).toHaveBeenCalledTimes(1);
      expect(spies.queue.onAdded).toHaveBeenCalledTimes(1);
      expect(spies.queue.onCompleted).toHaveBeenCalledTimes(1);

      expect(listener.logs).toContain('[002] Job 1 Completed: done');

      const sentryTransactions = testkit.transactions();
      const expectedTransactionsLength = 2;
      expect(sentryTransactions).toHaveLength(expectedTransactionsLength);
    });

    it('can inject job handler', async () => {
      const newService = new ExternalService();

      processor.handler = async (job: Job, token: string) => {
        console.info(`Job ${job.id} Processing: ${job.name}`);
        return await newService.getResult();
      }

      const spies = insertQueueSpies({ externalService: newService });

      const cuid = createId();
      await producer.queue.add(cuid, {});
      await processor.worker.delay(TestConfig.bullMq.delayMs);

      spies.showListenerLogs();

      expect(spies.external.getResult).toHaveBeenCalledTimes(1);
      expect(spies.queue.onLog).toHaveBeenCalledTimes(2);
      expect(spies.queue.onCompleted).toHaveBeenCalledTimes(1);

      expect(listener.logs).toContain('[002] Job 1 Completed: done');
      expect(spies.console.info).toHaveBeenCalledWith(`Job 1 Processing: ${cuid}`);

      const sentryTransactions = testkit.transactions();
      const expectedTransactionsLength = 2;
      expect(sentryTransactions).toHaveLength(expectedTransactionsLength );
    });

    it('can delay a job', async () => {
      const minRequests = 3;
      const newService = new ExternalService({ minRequests });

      processor.handler = async (job: Job, token: string) => {
        console.info(`Job ${job.id} Processing: ${job.name}`);

        const result = await newService.getResult();
        if (result == 'done') return result;

        console.info(`Job ${job.id} Delayed, External Service is still ${result}`);
        await job.moveToDelayed(DateTime.now().plus({ milliseconds: TestConfig.bullMq.delayMs / 2 }).toMillis(), token);
        throw new DelayedError();
      }

      const spies = insertQueueSpies({ externalService: newService });

      const cuid = createId();
      await producer.queue.add(cuid, {});
      await processor.worker.delay(TestConfig.bullMq.delayMs * minRequests);

      spies.showListenerLogs(true);
      spies.showProcessorLogs(true);

      expect(spies.external.getResult).toHaveBeenCalledTimes(3);
      expect(spies.queue.onLog).toHaveBeenCalledTimes(4);
      expect(spies.queue.onDelayed).toHaveBeenCalledTimes(2);
      expect(spies.queue.onCompleted).toHaveBeenCalledTimes(1);

      expect(listener.logs).toContain(`[001] Job 1 Added: ${cuid}`);
      expect(listener.logs).toContain('[004] Job 1 Completed: done');
      expect(spies.console.info).toHaveBeenCalledWith(`Job 1 Processing: ${cuid}`);

      const sentryTransactions = testkit.transactions();
      const expectedTransactionsLength = 4;
      expect(sentryTransactions).toHaveLength(expectedTransactionsLength );
    });

    it('long delayed job remains in queue', async () => {
      const minRequests = 10;
      const newService = new ExternalService({ minRequests });

      processor.handler = async (job: Job, token: string) => {
        // console.info(`Job ${job.id} Processing: ${job.name}`);

        const result = await newService.getResult();
        if (result == 'done') return result;

        // console.info(`Job ${job.id} Delayed, External Service is still ${result}`);
        await job.moveToDelayed(DateTime.now().plus({ seconds: 2}).toMillis(), token);
        return;
      }

      const spies = insertQueueSpies({ externalService: newService });

      const cuid = createId();
      await producer.queue.add(cuid, {});
      await processor.worker.delay(TestConfig.bullMq.delayMs * 3);

      spies.showListenerLogs(true);
      spies.showProcessorLogs(true);

      expect(await producer.queue.getDelayedCount()).toEqual(1);

      const delayedJobs = await producer.queue.getDelayed();
      expect (delayedJobs.length).toEqual(1);

      // const job = delayedJobs[0];
      // const jobOptions = job.opts;
      // const jobState = await job.getState();
      // console.warn(`delayedJob`, { delayedJob: stableStringify(job, null, 2) });
      // console.warn(`delayedJob.options`, { opts: stableStringify(jobOptions, null, 2) });
      // console.warn(`delayedJob.state`, { state: stableStringify(jobState, null, 2) });

      // expect(DateTime.fromMillis(job.timestamp).toISO()).toEqual(delay.toISO());

      const sentryTransactions = testkit.transactions();
      const expectedTransactionsLength = 3;
      expect(sentryTransactions).toHaveLength(expectedTransactionsLength );
    });
  });

  it('can delay a job and set progress', async () => {
    const minRequests = 3;
    const newService = new ExternalService({ minRequests });

    processor.handler = async (job: Job, token: string) => {
      console.info(`Job ${job.id} Processing: ${job.name}`);

      const result = await newService.getResult();
      if (result == 'done') return result;

      console.info(`Job ${job.id} Delayed, External Service is still ${result}`);

      const runAt = DateTime.now().plus({ milliseconds: TestConfig.bullMq.delayMs / 2 });
      await job.moveToDelayed(runAt.toMillis(), token);
      await job.updateProgress({
        delay: runAt.toMillis(),
        jobId: job.id,
        state: (await job.getState()).toString(),
        runAt: runAt.toISO(),
      });

      throw new DelayedError();
    }

    const spies = insertQueueSpies({ externalService: newService });

    const cuid = createId();
    await producer.queue.add(cuid, {});
    await processor.worker.delay(TestConfig.bullMq.delayMs * minRequests);

    spies.showListenerLogs(true);
    spies.showProcessorLogs(true);

    expect(spies.external.getResult).toHaveBeenCalledTimes(3);
    expect(spies.queue.onLog).toHaveBeenCalledTimes(4);
    expect(spies.queue.onDelayed).toHaveBeenCalledTimes(2);
    expect(spies.queue.onCompleted).toHaveBeenCalledTimes(1);

    expect(listener.logs).toContain(`[001] Job 1 Added: ${cuid}`);
    expect(listener.logs).toContain('[004] Job 1 Completed: done');
    expect(spies.console.info).toHaveBeenCalledWith(`Job 1 Processing: ${cuid}`);

    const sentryTransactions = testkit.transactions();
    const expectedTransactionsLength = 4;
    expect(sentryTransactions).toHaveLength(expectedTransactionsLength);
  });
});
