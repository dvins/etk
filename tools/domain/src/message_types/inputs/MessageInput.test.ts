import { Project, VariableDeclaration } from 'ts-morph';
import { describe, it, expect, beforeEach } from 'vitest';

import { MessageInput } from './MessageInput';

describe('MessageInput', () => {
  var project: Project;
  var sourceFile;
  var node: VariableDeclaration;

  beforeEach(() => {
    project = new Project({ useInMemoryFileSystem: true });
    sourceFile = project.createSourceFile('definition.ts', TestDefinition.source);
    node = sourceFile.getVariableDeclaration(TestDefinition.name)!;
  })

  it('can be instantiated using gateway definition as source in virtual sandbox', () => {
    const sut = new MessageInput(node);

    // console.debug(stableStringify(sut.toPlainObject(), null, 2));

    expect(sut).toBeTruthy();
    expect(sut.definition).toBeTruthy();
    expect(sut.definition).toEqual(TestDefinition.definition);
  });
});

const TestDefinition = {
  name: 'UserAddedEventDefinition',
  source: /*ts*/`
    import { IEvent, IEventDefinition } from '@omedym/nestjs-dmq';

    export const UserAddedEventDefinition: IEventDefinition = {
      messageType: 'event',
      cloudEvent: {
        dataContentType: 'application/json',
        type: 'com.test.userAdded',
        specVersion: '1.0'
      }
    }
  `,
  definition: {
    messageType: 'event',
    cloudEvent: {
      dataContentType: 'application/json',
      type: 'com.test.userAdded',
      specVersion: '1.0'
    },
  },
};
