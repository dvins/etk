import { IMessageGatewayDefinition } from '@omedym/nestjs-dmq';
import { IMessageQueueInput, MessageQueueInput } from './MessageQueueInput';

export interface IGatewayInput extends IMessageQueueInput<IMessageGatewayDefinition> {
  gatewayType: string;
}

export class GatewayInput extends MessageQueueInput<IMessageGatewayDefinition>
  implements IGatewayInput
{
  get gatewayType(): string { return this.definition.gatewayType }

  override toPlainObject(): IGatewayInput {
    return {
      ...(super.toPlainObject()),
      gatewayType: this.gatewayType,
    };
  }
}
