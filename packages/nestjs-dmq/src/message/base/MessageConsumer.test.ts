import { Queue } from 'bullmq';

import { ILogger } from '@omedym/nestjs-telemetry';

import { IMessage, IMessageDefinition, IMessageMetadata, AbstractMessageBuilder } from '..';
import { AbstractMessageConsumer } from './MessageConsumer';
import { IMessageConsumerDefinition } from './MessageConsumer';


describe('Consumer', () => {
  let logEntries: { msg: string; data: any }[] = [];

  beforeEach(() => {
    logEntries = [];
  });

  const logger = {
    debug: jest.fn((msg, data ) => logEntries.push({ msg: `[debug] ${msg}`, data })),
    error: jest.fn((msg, data ) => logEntries.push({ msg: `[error] ${msg}`, data })),
    info:  jest.fn((msg, data ) => logEntries.push({ msg: ` [info] ${msg}`, data })),
    warn:  jest.fn((msg, data ) => logEntries.push({ msg: ` [warn] ${msg}`, data })),
  } as unknown as ILogger;

  interface ITestData {}
  interface ITestMessage extends IMessage<ITestData> {}

  const TestMessageADefinition: IMessageDefinition = {
    messageType: 'command',
    cloudEvent: {
      dataContentType: 'application/json',
      type: 'test.message.a',
      specVersion: '1.0'
    }
  }

  const TestMessageBDefinition: IMessageDefinition = {
    messageType: 'event',
    cloudEvent: {
      dataContentType: 'application/json',
      type: 'test.message.b',
      specVersion: '1.0'
    }
  }

  const data: ITestData = { };
  const tenantId: string = 'tenantId';

  const TestEventSchema = {
    type: 'object',
    properties: {
      type: { type: 'string' },
      data: { type: 'object' },
      tenantid: {
        minLength: 5,
        maxLength: 10,
        type: 'string',
      },
    },
    required: ['data', 'type', 'tenantid'],
  };

  class TestMessageA extends AbstractMessageBuilder<ITestData, IMessageMetadata, ITestMessage> {
    definition = TestMessageADefinition;
    schema = TestEventSchema;
  }

  class TestMessageB extends AbstractMessageBuilder<ITestData, IMessageMetadata, ITestMessage> {
    definition = TestMessageBDefinition;
    schema = TestEventSchema;
  }

  const TestConsumerDefinition: IMessageConsumerDefinition = {
    queueId: 'queueId',
    bindings: [{ dir: 'in', msg: TestMessageADefinition }],
  };

  class TestConsumer extends AbstractMessageConsumer {
    readonly definition = TestConsumerDefinition;
  }

  const message_a = new TestMessageA().with(tenantId, '', data).build();
  const message_b = new TestMessageB().with(tenantId, '', data).build();

  const queue: Queue = jest.mocked<Queue>({
    add: jest.fn(),
  } as unknown as Queue)

  it('checks if a message is allowed', () => {
    const sut = new TestConsumer(queue, logger);
    expect(sut.isAllowed(message_a)).toBeTruthy();
  });

  it('checks if a message is not allowed', () => {
    const sut = new TestConsumer(queue, logger);
    expect(sut.isAllowed(message_b)).toBeFalsy();
  });

  it('sends an allowed message', async () => {
    const sut = new TestConsumer(queue, logger);
    await sut.send(message_a);
    expect(queue.add).toBeCalled();
  });

  it('prevents sending messages not specified as allowed', async () => {
    const sut = new TestConsumer(queue, logger);
    await expect(sut.send(message_b)).rejects.toThrow();
  });
});
