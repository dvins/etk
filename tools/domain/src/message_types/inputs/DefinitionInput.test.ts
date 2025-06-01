import { Isolate } from 'isolated-vm';
import { Project, VariableDeclaration } from 'ts-morph';
import { describe, it, expect, beforeEach } from 'vitest';

import { DefinitionInput } from './DefinitionInput';

describe('DefinitionInput', () => {
  let project: Project;
  let sourceFile;
  let node: VariableDeclaration;

  beforeEach(() => {
    project = new Project({ useInMemoryFileSystem: true });
    sourceFile = project.createSourceFile('definition.ts', TestDefinition.source);
    node = sourceFile.getVariableDeclaration(TestDefinition.name)!;
  });

  describe('Verify approaches for instantiating definitions from source code', () => {
    it('can create nodes from virtual source file', () => {
      expect(node).toBeTruthy();
    });

    it('cannot run virtual source contents as file in virtual sandbox', () => {
      const vmInstance = new Isolate();
      expect(() => vmInstance.compileScriptSync(TestDefinition.source)).toThrow();
    });

    it('cannot run virtual source as source in virtual sandbox', () => {
      const vmInstance = new Isolate();
      expect(() => vmInstance.compileScriptSync(TestDefinition.source))
        .toThrowError('Cannot use import statement outside a module');
    });

    it('cannot load definition as source in virtual sandbox because of identifiers', () => {
      const initializer = node.getInitializer()!;
      const literal = initializer.getFullText();

      const vmInstance = new Isolate();
      const context = vmInstance.createContextSync();
      const script = vmInstance.compileScriptSync(`(${literal})`);

      expect(() => script.runSync(context)).toThrowError(
        'SessionEndedEventDefinition is not defined'
      );
    });
  });

  describe('getDefinitionFromVariableDeclaration', () => {
    it('can load definition as source in virtual sandbox after replacing types with type names', () => {
      const sut = DefinitionInput.getDefinitionFromVariableDeclaration(node);
      expect(sut).toBeTruthy();
    });
  });

  describe('DefinitionInput class', () => {
    it('can be instantiated using definition as source in virtual sandbox', () => {
      const sut = new DefinitionInput(node);

      expect(sut).toBeTruthy();
      expect(sut.definition).toBeTruthy();
      expect(sut.definition).toEqual(TestDefinition.definition);
    });
  });

  describe('GatewayDefinitionInput class', () => {
    it('can be instantiated using gateway definition as source in virtual sandbox', () => {
      const sut = new DefinitionInput(node);

      const sutForDebug = {
        definitionName: sut.definitionName,
        definitionType: sut.definitionType,
        interface: sut.interface,
        metadataType: sut.inputType,
        name: sut.name,
        type: sut.type,
      };

      expect(sut).toBeTruthy();
      expect(sut.definition).toBeTruthy();
      expect(sut.definition).toEqual(TestDefinition.definition);
    });
  });
});

const TestDefinition = {
  name: 'DomainEventGatewayDefinition',
  source: /*ts*/`
    import { IEventGatewayDefinition } from '@omedym/nestjs-dmq';
    import { UserNotificationConsumerDefinition } from '../consumers';
    import { UserAddedEventDefinition, SessionEndedEventDefinition, SessionStartedEventDefinition } from '../messages';

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
