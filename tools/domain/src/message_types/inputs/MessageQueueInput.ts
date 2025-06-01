
import { IMessageQueueDefinition, MessageBinding } from '@omedym/nestjs-dmq';
import { lowerFirst, upperFirst } from 'lodash';

import { DefinitionInput, IDefinitionInput } from './DefinitionInput';
import {
  IMessageBindingMessageInput,
  IMessageBindingInput,
  IMessageBindingToQueueInput,
  OutboundMessageBindingInput,
  InboundMessageBindingInput,
} from './MessageBindingInput';

export interface IOutboundQueueInput extends IDefinitionInput<any> {
  instance: string;
}

export interface IMessageQueueInput<T> extends IDefinitionInput<T> {
  nameBase: string;
  interfaceType: string;
  messageType: string;
  receiver: {
    instance: string;
    method: string;
    param: string;
  },
  inboundBindings: InboundMessageBindingInput[];
  outboundBindings: OutboundMessageBindingInput[];
  outboundQueues: IOutboundQueueInput[];
}

export class MessageQueueInput<T extends IMessageQueueDefinition> extends DefinitionInput<T>
  implements IMessageQueueInput<T> {

  override get type(): string { return 'Abstract' + super.type.substring(1) }

  get nameBase(): string { return MessageQueueInput.mapNameBaseFromName(this.name) }
  get interfaceType(): string { return 'I' + upperFirst(super.type.substring(1)) }
  get messageType(): string { return this.interfaceType.replace('Gateway', '') }
  get receiver() { return MessageQueueInput.mapDispatcherFromQueueName(this.name) }

  get inboundBindings(): InboundMessageBindingInput[] {
    const bindings = this.definition.bindings
      .filter(b => b.dir === 'in')
      .map(b => MessageQueueInput.mapMessageBindingInput<InboundMessageBindingInput>(b));

    return bindings;
  }

  get outboundBindings(): OutboundMessageBindingInput[] {
    const bindings = this.definition.bindings
      .filter(b => b.dir === 'out')
      // To prevent messages that have patterns from being handled by queues without patterns,
      // move all case statements that have patterns to the bottom
      .sort((a, b) => {
        return b.hasOwnProperty('pattern') ? -1 : a.hasOwnProperty('pattern') ? 1 : 0;
      })
      .map(b => MessageQueueInput.mapMessageBindingInput<OutboundMessageBindingInput>(b));

    return bindings;
  }

  get outboundQueues(): IOutboundQueueInput[] {
    const queues: IOutboundQueueInput[] = []
    this.outboundBindings.map(b => b.toQueue.map(toQueue => {
      if(queues.find(q => q.name === toQueue.name)) return;
      queues.push({
        ...toQueue,
        instance: lowerFirst(toQueue.name),
      } satisfies IOutboundQueueInput);
    }));

    return queues;
  }

  override toPlainObject(): IMessageQueueInput<T> {
    return {
      ...(super.toPlainObject()),
      nameBase: this.nameBase,
      interfaceType: this.interfaceType,
      messageType: this.messageType,
      receiver: this.receiver,
      inboundBindings: this.inboundBindings,
      outboundBindings: this.outboundBindings,
      outboundQueues: this.outboundQueues,
    };
  }

  static mapMessageBindingInput<T extends IMessageBindingInput>(binding: MessageBinding) {
    const metadata = {
      dir: binding.dir,
      inputType: 'messageBinding',
      message: MessageQueueInput.mapMessageInput(binding),
      toQueue: MessageQueueInput.mapQueueInput(binding),

      // ITopicMessageBinding
      pattern: (binding as any)?.pattern,
    } satisfies IMessageBindingInput;

    return metadata as T;
  }

  static mapMessageInput(binding: MessageBinding): IMessageBindingMessageInput {
    const name = binding.msg.toString();
    const type = MessageQueueInput.mapBaseTypeNameFromMessageTypeName(name);

    const metadata = {
      inputType: 'message',
      type: type,
      interface: 'I' + name,
      definitionName: name + 'Definition',
      definitionType: type + 'Definition',
      name: name,
      definition: {},
    } satisfies IMessageBindingMessageInput;

    return metadata;
  }

  static mapNameBaseFromName(typeName: string): string {
    if (typeName.endsWith('Consumer')) return typeName.replace('Consumer','');
    if (typeName.endsWith('Exchange')) return typeName.replace('Exchange','');
    if (typeName.endsWith('Gateway')) return typeName.replace('Gateway','');

    return typeName;
  }

  static mapQueueInput(binding: MessageBinding): IMessageBindingToQueueInput[] {
    const outboundBinding = binding as unknown as { toQueue: string | string[]};
    if (binding.dir === 'in' || !outboundBinding) return [];

    const toQueues = Array.isArray(outboundBinding.toQueue)
      ? outboundBinding.toQueue
      : [outboundBinding.toQueue];

    const metadata = toQueues.map(toQueue => ({
      dispatcher: MessageQueueInput.mapDispatcherFromQueueName(toQueue),
      inputType: 'toQueue',
      type: MessageQueueInput.mapTypeFromQueueName(toQueue),
      interface: 'I' + toQueue + 'Queue',
      definitionName: toQueue + 'Definition',
      definitionType: 'string',
      name: toQueue + 'Queue',
      definition: { },
    } satisfies IMessageBindingToQueueInput));

    return metadata;
  }

  static mapBaseTypeNameFromMessageTypeName(typeName: string): string {
    if (typeName.includes('Command')) return 'ICommand';
    if (typeName.includes('Event')) return 'IEvent';
    if (typeName.includes('Query')) return 'IQuery';
    if (typeName.includes('Task')) return 'ITask';

    return 'message';
  }

  static mapTypeFromQueueName(typeName: string): string {
    if (typeName.includes('CommandGateway')) return 'CommandGateway';
    if (typeName.includes('EventGateway')) return 'EventGateway';
    if (typeName.includes('Exchange')) return 'MessageExchange';
    if (typeName.includes('Consumer')) return 'MessageConsumer';

    return 'MessageQueue';
  }

  static mapDispatcherFromQueueName(queueName: string) {
    const name = queueName;
    const instance = lowerFirst(queueName) + 'Queue';

    const base = { name, instance };

    if (queueName.includes('CommandGateway')) return { ...base, method: 'send', param: 'command' };
    if (queueName.includes('EventGateway'))return { ...base, method: 'publish', param: 'event' };
    if (queueName.includes('Exchange')) return { ...base, method: 'publishOrSend', param: 'message' };
    if (queueName.includes('Consumer')) return { ...base, method: 'send', param: 'message' };
    if (queueName.includes('TaskGateway'))return { ...base, method: 'send', param: 'task' };

    return { ...base, method: 'send', param: 'message' };
  }
}
