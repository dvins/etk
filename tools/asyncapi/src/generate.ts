import { Parser } from '@asyncapi/parser';
import openapiSchemaParser from '@asyncapi/openapi-schema-parser';

import color from 'colors-cli/safe';
import fs from 'node:fs';
import path from 'node:path';
import { configure as stableStringify} from 'safe-stable-stringify';

import { commonTemplate, nestModuleTemplate, queueTemplate } from './handlebars-defs';
import { generateChannelSubscription, generateChannelPublish, generateMessagePayloadModels } from './modelina';
import { generateZodValidators } from './validators';
import { getBaseChannelName, loadDefinitions, toClassName } from './utils';
import { appendOutput, logger } from './utils';

import type { AsyncAPIDocumentInterface } from '@asyncapi/parser';

/**
 * Main code generation function: orchestrates creation of validators, models, and channel handlers.
 *
 * @param parsedSchema - Parsed AsyncAPI document.
 * @param output - Path to write the generated output.
 */
export const generate = async (parsedSchema: AsyncAPIDocumentInterface, output: string): Promise<void> => {
  logger(`Generating Output: ${color.green.bold.underline(output.toString().replace('bazel-out/', 'dist/out/'))}`);

  appendOutput(output, commonTemplate({}));

  // Shared date parser used in zod replacements
  appendOutput(
    output,
    `const dateSchema = z.preprocess((arg) => {
      if (typeof arg === 'string' || arg instanceof Date) return new Date(arg);
    }, z.date());
    type DateSchema = z.infer<typeof dateSchema>;`
  );

  // Zod validators
  appendOutput(output, await generateZodValidators(parsedSchema));

  // TypeScript models
  appendOutput(output, await generateMessagePayloadModels(parsedSchema));

  const controllers: string[] = [];
  const providers: string[] = [];
  const channels = parsedSchema.channels();

  for (const [key, channel] of Object.entries(channels)) {
    const baseChannelName = getBaseChannelName(key);
    const className = toClassName(baseChannelName);

    logger(` - Generating channel: ${color.bold(className)} ${color.italic.faint(baseChannelName)}`);

    const channelParameters: Record<string, unknown> = Object.fromEntries(
      Object.entries(channel.parameters())
    );

    appendOutput(output, await queueTemplate({
      className,
      baseChannelName,
      channelParameters: Object.keys(channelParameters),
    }));

    for (const [operationType, operation] of Object.entries(channel.operations())) {
      if (operationType === 'subscribe') {
        appendOutput(output, await generateChannelSubscription(operation, className, baseChannelName, channelParameters));
      }

      if (operationType === 'publish') {
        appendOutput(output, await generateChannelPublish(operation, providers, controllers, className, baseChannelName, channelParameters));
      }
    }
  }

  if (controllers.length || providers.length) {
    const moduleOutput = await nestModuleTemplate({ controllers, providers });
    appendOutput(output, moduleOutput);
  }
};

/**
 * Loads and parses the AsyncAPI YAML or JSON schema from file.
 *
 * @param schemaFile - Path to the AsyncAPI file.
 * @param output - Path to write debug output.
 * @returns Parsed AsyncAPI document.
 */
export const parseSchema = async (schemaFile: string, output: string): Promise<AsyncAPIDocumentInterface> => {
  logger(`Loading Schema: ${color.green.underline(schemaFile)}`);
  const content = loadDefinitions(schemaFile);

  const debugFilename = output.replace('index.ts', 'debug.json');
  const debugLogFilename = debugFilename.replace('bazel-out/', 'dist/out/');
  logger(`Parsed Schema Output: ${color.green.underline(debugLogFilename)}`);

  const parser = new Parser({
    schemaParsers: [openapiSchemaParser()],
  });

  const { document, diagnostics } = await parser.parse(content);

  if (diagnostics?.length) {
    diagnostics.forEach((d) => logger(color.red(`❌ ${d.message}`)));
    throw new Error('AsyncAPI document has diagnostics');
  }

  if (!document) throw new Error('No AsyncAPI document returned from parser');

  const jsonToString = stableStringify({ deterministic: true });
  const jsonStringified = jsonToString(document);
  if (fs.existsSync(debugFilename)) fs.rmSync(debugFilename);
  fs.writeFileSync(debugFilename, jsonStringified);

  return document;
};