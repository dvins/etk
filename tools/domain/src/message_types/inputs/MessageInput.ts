import { upperFirst} from 'lodash';

import { IMessageDefinition } from '@omedym/nestjs-dmq';
import { DefinitionInput, IDefinitionInput } from './DefinitionInput';

export interface IMessageInput<T> extends IDefinitionInput<T>, IMessageDefinition {
  dataInterface: string;
  metadataInterface: string;
  nameBase: string;
}

export class MessageInput<T extends IMessageDefinition> extends DefinitionInput<T>
  implements IMessageInput<T> {

  get messageType() { return this.definition.messageType };
  get cloudEvent() { return this.definition.cloudEvent };

  get dataInterface(): string { return 'I' + this.nameBase + 'Data' };
  get metadataInterface(): string { return 'I' + upperFirst(this.messageType) + 'Metadata'};
  get nameBase(): string { return MessageInput.mapNameBaseFromName(this.name) }

  static mapNameBaseFromName(typeName: string): string {
    if (typeName.endsWith('Command')) return typeName.replace('Command','');
    if (typeName.endsWith('Event')) return typeName.replace('Event','');
    if (typeName.endsWith('Message')) return typeName.replace('Message','');
    if (typeName.endsWith('Query')) return typeName.replace('Query','');
    if (typeName.endsWith('Request')) return typeName.replace('Request','');
    if (typeName.endsWith('Task')) return typeName.replace('Task','');

    return typeName;
  }

  override toPlainObject(): IMessageInput<T> {
    return {
      ...(super.toPlainObject()),

      cloudEvent: this.cloudEvent,
      dataInterface: this.dataInterface,
      messageType: this.messageType,
      metadataInterface: this.metadataInterface,
      nameBase: this.nameBase,
    };
  }
}
