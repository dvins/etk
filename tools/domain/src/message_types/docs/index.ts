import { CallExpression, Expression, Project, SourceFile, SyntaxKind, TypeChecker } from 'ts-morph';
import { select } from '@inquirer/prompts';

type Bindings = Array<{ dir: 'in' | 'out'; msg?: any; toQueue?: any | any[] }>;
const templateHeader = `
sequenceDiagram
autonumber
`;
const templateLine = ({ from, to, event }: { from: string; to: string; event: string }) => `${from}-->>${to}: ${event}`;

export const initializeDocs = () => {
  const project = new Project();
  const typeChecker = project.getTypeChecker();
  const files = project.addSourceFilesAtPaths([
    '../../modules/*/src/**/*.ts',
    '../../types/types-domain-messaging/src/DomainCommand.gateway.ts',
    '../../types/types-domain-messaging/src/DomainEvent.gateway.ts',
    '!**/*.test.ts',
    '!**/*.module.ts',
    '!**/*.d.ts',
  ]);

  return { project, typeChecker, files };
};

export const buildMermaidMessageFlowDiagram = async ({ files, typeChecker, queue, message }: {
  files: SourceFile[],
  typeChecker: TypeChecker,
  queue?: 'event' | 'command',
  message?: string,
}) => {
  let commandGateway;
  let eventGateway;

  let output = `${templateHeader}`;

  let queueToStartFrom = queue;

  if (!queueToStartFrom) {
    queueToStartFrom = await select({
      message: 'Select first Gateway Queue',
      choices: [
        {
          name: 'DomainEventGateway',
          value: 'event',
        },
        {
          name: 'DomainCommandGateway',
          value: 'command',
        },
      ],
    });
  }

  if (!queueToStartFrom) {
    throw new Error('Initial Queue Not Found');
  }

  for (const file of files) {
    if (commandGateway && eventGateway) {
      break;
    }

    if (!commandGateway) {
      commandGateway = file
        .getVariableDeclaration('DomainCommandGatewayDefinition')
        ?.getInitializer()
        ?.asKind(SyntaxKind.ObjectLiteralExpression);
    }

    if (!eventGateway) {
      eventGateway = file
        .getVariableDeclaration('DomainEventGatewayDefinition')
        ?.getInitializer()
        ?.asKind(SyntaxKind.ObjectLiteralExpression);
    }
  }

  if (!commandGateway) {
    throw new Error('DomainCommandGatewayDefinition Not Found');
  }

  if (!eventGateway) {
    throw new Error('DomainEventGatewayDefinition Not Found');
  }


  const eventBinding = eventGateway.getPropertyOrThrow('bindings').asKind(SyntaxKind.PropertyAssignment);
  const eventInitializer = eventBinding?.getInitializerOrThrow();
  if (!eventInitializer?.isKind(SyntaxKind.ArrayLiteralExpression)) {
    throw new Error('bindings is not an array');
  }

  const eventElements = eventInitializer.getElements();
  const eventBindings = getBindingsArrayFromGatewayNode(eventElements);

  if (!eventBindings?.length) {
    throw new Error('bindings not found in event gateway');
  }

  const commandBinding = commandGateway.getPropertyOrThrow('bindings').asKind(SyntaxKind.PropertyAssignment);
  const commandInitializer = commandBinding?.getInitializerOrThrow();

  if (!commandInitializer?.isKind(SyntaxKind.ArrayLiteralExpression)) {
    throw new Error('bindings is not an array');
  }

  const commandElements = commandInitializer.getElements();
  const commandBindings = getBindingsArrayFromGatewayNode(commandElements);

  if (!commandBindings?.length) {
    throw new Error('bindings not found in command gateway');
  }

  let messageToStartFlow = message;

  if (!messageToStartFlow) {

    const bindingToSelectFirstMessage = queueToStartFrom === 'command' ? commandBindings : eventBindings;
    const messageChoices: Array<{name: string; value: string }> = [];

    for (const el of bindingToSelectFirstMessage) {
      if (el.dir !== 'in') {
        continue;
      }
      const msg = el.msg.substring(0, el.msg.length - 10);

      messageChoices.push({
        name: msg,
        value: msg,
      });
    }

    messageToStartFlow = await select({
      message: 'Select first Message',
      choices: messageChoices,
    });
  }

  if (!messageToStartFlow) {
    throw new Error('Initial Message Not Found');
  }


  // it call Next Event recursively
  output = getSequenceLineStartWithMessage({
    eventBindings,
    commandBindings,
    files,
    msg: messageToStartFlow,
    queue: queueToStartFrom,
    typeChecker,
    output,
  });

  return output;
}

function getSequenceLineStartWithMessage({ msg, queue, eventBindings, commandBindings, files, typeChecker, output }: {
  eventBindings: Bindings,
  commandBindings: Bindings,
  msg: string,
  queue: 'event' | 'command',
  files: SourceFile[],
  output: string,
  typeChecker: TypeChecker,
}) {
  const currentBindingQueue = queue === 'event' ? eventBindings : commandBindings;
  const msgToQueue = currentBindingQueue?.find((el) => el?.dir === 'out' && el?.msg === `${msg}Definition`)
    ?.toQueue as string;

  if (!msgToQueue) {
    console.info(`out not found for message ${msg}`);
    return output;
  }

  const queueName = queue === 'event' ? 'DomainEventGateway' : 'DomainCommandGateway';
  const msgToQueueName = msgToQueue.substring(0, msgToQueue.length - 10);
  const firstLine = templateLine({from: queueName, to: msgToQueueName, event: msg});
  output = appendToOutput(output, firstLine);

  // Find message handler, to find next line
  for (const file of files) {
    // Remove Definition at the end
    const processor = file.getClass(msgToQueue?.substring(0, msgToQueue?.length - 10));

    if (!processor) {
      continue;
    }

    console.debug('Found processor:', processor.getName());

    // get handler for the event
    const handlerName = `on${msg}`;
    const handler = processor.getInstanceMethod(handlerName);

    if (!handler) {
      continue;
    }

    console.debug('Found handler:', handler.getName());

    // does handler send or publish any command or event?
    const allCalls = handler.getDescendantsOfKind(SyntaxKind.CallExpression);

    for (const call of allCalls) {
      const methodName = getCalleeName(call);
      let isMethodSendCommand = methodName === 'send';
      let isMethodPublishEvent = methodName === 'publish';

      if (!isMethodSendCommand && !isMethodPublishEvent) {
        continue;
      }

      const expression = call.getExpression();
      const calledOn = typeChecker
      .getTypeAtLocation(expression)
      .getSymbol()
      ?.getDeclarations()
      .map((el) => el.getParent()?.asKind(SyntaxKind.ClassDeclaration)?.getName());
      const isCaledOnCommandGateway = calledOn?.includes('AbstractCommandGateway');
      const isCaledOnEventGateway = calledOn?.includes('AbstractEventGateway');

      if (!isCaledOnCommandGateway && !isCaledOnEventGateway) {
        continue;
      }

      const argNodes = call.getArguments();
      const argTexts = argNodes.map((a) =>
        typeChecker
        .getTypeAtLocation(a)
        .getSymbol()
        ?.getDeclarations()
        .map((el) => el.asKind(SyntaxKind.InterfaceDeclaration)?.getName()),
      );
      const eventName = argTexts?.[0]?.[0]?.substring(1);

      if (!eventName) {
        continue;
      }

      const queueToSendEvent = isCaledOnCommandGateway ? 'DomainCommandGateway' : 'DomainEventGateway';

      console.debug(`next ${eventName} send/publish to ${queueToSendEvent} with `);

      const nextLine = templateLine({from: processor.getName() as string, to: queueToSendEvent, event: eventName});
      output = appendToOutput(output, nextLine);

      // Call Next Event recursively
      output = getSequenceLineStartWithMessage({
        msg: eventName,
        queue: isCaledOnEventGateway ? 'event' : 'command',
        eventBindings,
        commandBindings,
        files,
        typeChecker,
        output,
      });
    }

    break;
  }

  return output;
}

function getBindingsArrayFromGatewayNode(nodeElements: Expression[]) {
  const bindings: Bindings = [];

  for (const el of nodeElements) {
    if (!el.isKind(SyntaxKind.ObjectLiteralExpression)) {
      continue;
    }

    const dirProp = el.getProperty('dir');
    const msgProp = el.getProperty('msg');
    const toQueueProp = el.getProperty('toQueue');

    const dir = dirProp?.isKind(SyntaxKind.PropertyAssignment)
      ? dirProp?.getInitializerIfKind(SyntaxKind.StringLiteral)?.getLiteralValue()
      : null;

    if (dir !== 'in' && dir !== 'out') {
      continue;
    }

    const msg = msgProp?.isKind(SyntaxKind.PropertyAssignment)
      ? msgProp?.getInitializerIfKind(SyntaxKind.Identifier)?.getText()
      : null;
    let toQueue = null;

    if (toQueueProp?.isKind(SyntaxKind.PropertyAssignment)) {
      toQueue = toQueueProp?.getInitializerIfKind(SyntaxKind.Identifier)?.getText();
      if (!toQueue) {
        const arrayOfQueues = toQueueProp?.getInitializerIfKind(SyntaxKind.ArrayLiteralExpression);
        toQueue = arrayOfQueues?.getElements().map((el) => el.getText());
      }
    }

    bindings.push({ dir, msg, toQueue });
  }

  return bindings;
}

function appendToOutput(output: string, line: string): string {
  output = `${output}
    ${line}
  `;
  return output;
}

function getCalleeName(call: CallExpression) {
  const expr = call.getExpression();
  if (expr.isKind(SyntaxKind.PropertyAccessExpression)) return expr.getName();
  if (expr.isKind(SyntaxKind.Identifier)) return expr.getText();
  return '<complex-expression>';
}
