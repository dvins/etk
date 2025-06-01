import { Project, VariableDeclaration } from 'ts-morph';
import { describe, it, expect, beforeEach } from 'vitest';

import { GatewayInput } from './GatewayInput';

describe('GatewayInput', () => {
  let project: Project;
  let sourceFile;
  let node: VariableDeclaration;

  beforeEach(() => {
    project = new Project({ useInMemoryFileSystem: true });
    sourceFile = project.createSourceFile('definition.ts', TestDefinition.source);
    node = sourceFile.getVariableDeclaration(TestDefinition.name)!;
  });

  it('can be instantiated using gateway definition as source in virtual sandbox', () => {
    const sut = new GatewayInput(node);

    // Uncomment to debug structure
    // console.debug(stableStringify(sut.toPlainObject(), null, 2));

    expect(sut).toBeTruthy();
    expect(sut.definition).toBeTruthy();
    expect(sut.definition).toEqual(TestDefinition.definition);
  });
});

const TestDefinition = {
  name: 'DomainEventGatewayDefinition',
  source: /*ts*/`
    import { IEventGatewayDefinition } from '@omedym/nestjs-dmq';
    import { UserNotificationConsumerDefinition } from '../consumers';
    import {
      UserAddedEventDefinition,
      SessionEndedEventDefinition,
      SessionStartedEventDefinition
    } from '../messages';

    export const DomainEventGatewayDefinition: IEventGatewayDefinition = {
      gatewayType: 'event',
      queueId: 'domain-event',
      bindings: [
        { dir: 'in',  msg: SessionEndedEventDefinition },
        { dir: 'in',  msg: SessionStartedEventDefinition },
        { dir: 'in',  msg: UserAddedEventDefinition },
        { dir: 'out', msg: SessionEndedEventDefinition,   toQueue: [ UserNotificationConsumerDefinition, 'OtherConsumerDefinition' ] },
        { dir: 'out', msg: SessionStartedEventDefinition, toQueue: UserNotificationConsumerDefinition },
        { dir: 'out', msg: UserAddedEventDefinition,  toQueue: UserNotificationConsumerDefinition },
      ],
    };
  `,
  definition: {
    gatewayType: 'event',
    queueId: 'domain-event',
    bindings: [
      { dir: 'in',  msg: 'SessionEndedEvent' },
      { dir: 'in',  msg: 'SessionStartedEvent' },
      { dir: 'in',  msg: 'UserAddedEvent' },
      { dir: 'out', msg: 'SessionEndedEvent',   toQueue: [ 'UserNotificationConsumer', 'OtherConsumerDefinition' ] },
      { dir: 'out', msg: 'SessionStartedEvent', toQueue: 'UserNotificationConsumer' },
      { dir: 'out', msg: 'UserAddedEvent',  toQueue: 'UserNotificationConsumer' },
    ],
  },
};
