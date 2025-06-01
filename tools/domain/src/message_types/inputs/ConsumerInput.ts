import { IMessageConsumerDefinition } from '@omedym/nestjs-dmq';
import { IMessageQueueInput, MessageQueueInput } from './MessageQueueInput';

export interface IConsumerInput extends IMessageQueueInput<IMessageConsumerDefinition> { }
export class ConsumerInput extends MessageQueueInput<IMessageConsumerDefinition>
  implements IConsumerInput { }
