import { InboundMessageBinding, OutboundMessageBinding } from '@omedym/nestjs-dmq';
import { IInput } from './Input';
import { IDefinitionInput } from './DefinitionInput';

export interface IMessageBindingMessageInput extends IDefinitionInput<any> { }

export interface IMessageBindingToQueueInput extends IDefinitionInput<any> {
  dispatcher: {
    name: string;
    instance: string;
    method: string;
    param: string;
  },
}

export interface IMessageBindingInput extends Omit<IInput, 'msg' | 'name' | 'type'> {
  dir: string;
  message: IMessageBindingMessageInput;
  toQueue?: IMessageBindingToQueueInput[];
  pattern?: string;
}

export type InboundMessageBindingInput = Omit<InboundMessageBinding, 'msg'>
  & IMessageBindingInput
  & {};

export type OutboundMessageBindingInput = Omit<OutboundMessageBinding, 'msg'>
  & IMessageBindingInput
  & {
    pattern?: string;
    toQueue: IMessageBindingToQueueInput[];
  };
