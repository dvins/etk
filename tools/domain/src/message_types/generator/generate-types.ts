import { VariableDeclaration } from "ts-morph";

import {
  writeTypeScriptFile,
  logger,
  withFileLink,
  GeneratedContent,
} from "../../utils";

import { ConsumerInput, GatewayInput, MessageInput } from "../inputs";
import { compileMessageTypesTemplate } from "../handlebars";

type GenerateTypesProps = {
  messages: VariableDeclaration[];
  consumers: VariableDeclaration[];
  gateways: VariableDeclaration[];
  jsonSchemas?: GeneratedContent[];
};

export const generateTypes = (
  definitions: GenerateTypesProps,
  outputFile: string
) => {
  logger.info(`Generating Types: ${withFileLink(outputFile)}`);

  const messages = defineMessages(definitions.messages);
  const consumers = defineConsumers(definitions.consumers);
  const gateways = defineGateways(definitions.gateways);

  const commands = messages.filter(
    (m) => m.definition.messageType == "command"
  );
  const events = messages.filter((m) => m.definition.messageType == "event");
  const tasks = messages.filter((m) => m.definition.messageType == "task");

  writeTypeScriptFile(outputFile, [
    { content: importsTemplate({}) },
    { content: envParamsTemplate({}) },
    {
      content: constantsTemplate({
        messages: { commands, events, tasks },
        queues: { consumers, gateways },
      }),
    },
    { content: strongMessageTemplate({ messages }) },
    { content: strongConsumerTemplate({ consumers }) },
    { content: strongGatewayTemplate({ gateways }) },
    { content: modulesTemplate({ queues: { consumers, gateways } }) },
    {
      content: embedJsonSchemasTemplate({
        jsonSchemas: definitions.jsonSchemas,
      }),
    },
  ]);
};

export const defineConsumers = (
  variableDeclarations: VariableDeclaration[]
) => {
  logger.debug(`  - ${variableDeclarations.length} Consumer Types`);
  const consumers = variableDeclarations.map((d) =>
    new ConsumerInput(d).toPlainObject()
  );
  return consumers;
};

export const defineGateways = (variableDeclarations: VariableDeclaration[]) => {
  logger.debug(`  - ${variableDeclarations.length} Gateway Types`);
  const gateways = variableDeclarations.map((d) =>
    new GatewayInput(d).toPlainObject()
  );
  return gateways;
};

export const defineMessages = (variableDeclarations: VariableDeclaration[]) => {
  logger.debug(`  - ${variableDeclarations.length} Message Types`);
  const messages = variableDeclarations.map((d) =>
    new MessageInput(d).toPlainObject()
  );
  return messages;
};

export const constantsTemplate = compileMessageTypesTemplate("constants.ts");

export const embedJsonSchemasTemplate = compileMessageTypesTemplate(
  "embed-jsonschemas.ts"
);

export const envParamsTemplate = compileMessageTypesTemplate("envparams.ts");

export const importsTemplate = compileMessageTypesTemplate("imports.ts");

export const modulesTemplate = compileMessageTypesTemplate("modules.ts");

export const strongConsumerTemplate =
  compileMessageTypesTemplate("strong-consumer.ts");

export const strongGatewayTemplate =
  compileMessageTypesTemplate("strong-gateway.ts");

export const strongMessageTemplate =
  compileMessageTypesTemplate("strong-message.ts");
