import { TypeScriptGenerator, TS_DESCRIPTION_PRESET } from '@asyncapi/modelina';
import color from 'colors-cli/safe';

import {
  nestControllerTemplate,
  publisherTemplate,
  subscriberTemplate,
} from './handlebars-defs';

import { DATE_PRESET, ONE_OF_PRESET } from './presets';
import { logger } from './utils';

/**
 * Generates all TypeScript models for message payloads using Modelina v5.
 *
 * @remarks
 * ⚠️ Ensure AsyncAPI documents include `title` properties for all schemas.
 * Without `title`, Modelina may generate anonymous or default-named types.
 *
 * @param asyncapiDocument - Parsed AsyncAPI 2.5+ document object.
 * @returns Combined TypeScript code string with exported model declarations.
 */
export const generateMessagePayloadModels = async (asyncapiDocument: any): Promise<string> => {
  let output = '';

  const generator = new TypeScriptGenerator({
    modelType: 'interface',
    enumType: 'union',
    presets: [DATE_PRESET, ONE_OF_PRESET, TS_DESCRIPTION_PRESET],
  });

  const models = await generator.generate(asyncapiDocument);

  models.forEach((model) => {
    logger(` - Generating message model: ${color.yellow(model.modelName)}`);
    const rendered = `export ${model.result}\n`;
    output += `\n${rendered}`;
  });

  return output;
};

/**
 * Generates a NestJS-compatible subscriber handler for a given AsyncAPI channel.
 *
 * @param subscribe - The subscribe operation from the channel.
 * @param className - The PascalCase class name representing the channel.
 * @param baseChannelName - Raw base name of the channel (e.g., 'orderCreated').
 * @param parameters - Map of channel parameters.
 * @returns A rendered subscriber class as a string.
 */
export const generateChannelSubscription = async (
  subscribe: any,
  className: string,
  baseChannelName: string,
  parameters: Record<string, unknown>
): Promise<string> => {
  const summary = subscribe._json.summary;
  const description = subscribe._json.description;
  const comments = [summary, description].filter(Boolean);

  const message = subscribe.message();
  const payload = message.payload();
  const messageName = message.title() || message.uid();
  const messageType = payload.title() || message.uid();

  logger(
    `    - Generating processor: ${color.bold(`${className}Processor`)} with message ${color.italic(
      messageName
    )} [${color.yellow(messageType)}]`
  );

  return subscriberTemplate({
    className,
    baseChannelName,
    comments,
    operationId: subscribe.json().operationId,
    messageType,
    channelParameters: Object.keys(parameters),
  });
};

/**
 * Generates a NestJS-compatible publisher and optional controller for a given AsyncAPI channel.
 *
 * @param publish - The publish operation from the channel.
 * @param providers - A mutable array to register generated publisher providers.
 * @param controllers - A mutable array to register generated controllers (if HTTP bindings are present).
 * @param className - The PascalCase class name representing the channel.
 * @param baseChannelName - Raw base name of the channel (e.g., 'userRegistered').
 * @param parameters - Map of channel parameters.
 * @returns The full rendered TypeScript string for publisher (and controller if HTTP).
 */
export const generateChannelPublish = async (
  publish: any,
  providers: string[],
  controllers: string[],
  className: string,
  baseChannelName: string,
  parameters: Record<string, unknown>
): Promise<string> => {
  let output = '';

  const json = publish._json;
  const { bindings } = json;

  const message = publish.message();
  const payload = message.payload();
  const messageType = payload.title() || message.uid();
  const messageName = message.title() || message.uid();

  providers.push(`${className}Publisher`);

  const comments = [json.summary, json.description].filter(Boolean);

  logger(
    `    - Generating publisher: ${color.bold(className)} with message ${color.italic(
      messageName
    )} [${color.yellow(messageType)}]`
  );

  output += `\n${publisherTemplate({
    className,
    baseChannelName,
    comments,
    messageType,
    channelParameters: Object.keys(parameters),
  })}`;

  // If HTTP binding exists, also generate controller
  if (!bindings?.http) return output;

  const controllerName = `${className}Controller`;

  logger(
    `    - Generating HTTP bindings: ${color.bold(controllerName)} with body ${color.italic(
      messageName
    )} [${color.yellow(messageType)}]`
  );

  controllers.push(controllerName);

  output += `\n${nestControllerTemplate({
    className,
    baseChannelName,
    messageType,
    channelParameters: Object.keys(parameters),
  })}`;

  return output;
};
