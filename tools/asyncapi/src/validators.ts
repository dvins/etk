import color from 'colors-cli/safe';
import { zodSchemaTemplate } from './handlebars-defs';
import { logger } from './utils';
import type { AsyncAPIDocumentInterface, MessageInterface } from '@asyncapi/parser';

/**
 * Generates Zod validators for all AsyncAPI message payloads and reusable component schemas.
 *
 * @remarks
 * This function scans all `publish` and `subscribe` operations for their message payloads,
 * and also looks at top-level reusable schemas under `components.schemas`.
 * Each schema is transformed into a Zod object and exported as a constant.
 *
 * Any property using `z.date()` is replaced with `dateSchema` to support custom parsing logic.
 *
 * @param parsedSchema - The parsed AsyncAPI document.
 * @returns A string containing all validator exports to be written to the output file.
 */
export const generateZodValidators = async (parsedSchema: AsyncAPIDocumentInterface): Promise<string> => {
  let output = '';

  // Collect all message operations across all channels
  const channels = parsedSchema.channels();
  const messages: MessageInterface[] = [];
  Object.values(channels).forEach((channel) => {
    for (const operation of Object.values(channel.operations())) {
      messages.push(...operation.messages());
    }
  });

  const seenValidatorNames: Set<string> = new Set();

  for (const message of messages) {
    const name: string = message.title() ?? message.payload()?.$id() ?? '!!';
    const typeName = `${name}SchemaValidator`;

    if (seenValidatorNames.has(typeName)) continue;

    logger(` - Generating message validator: ${color.bold(typeName)} for [${color.yellow(name)}]`);

    const rendered = `export const ${typeName} = ${zodSchemaTemplate(message.payload()?.json())}`
      .replace(/z\.date\(\)/g, 'dateSchema'); // Replace raw z.date() calls with shared preprocessor

    seenValidatorNames.add(typeName);
    output += `\n\n${rendered}`;
  }

  const schemas = parsedSchema.components().schemas();
  for (const [key, schema] of Object.entries(schemas)) {
    const name = schema.title() ?? schema.$id() ?? '!!';
    const typeName = `${name}SchemaValidator`;

    if (seenValidatorNames.has(typeName)) continue;

    logger(` - Generating component schema validator: ${color.bold(typeName)} for ${color.faint(key)} [${color.yellow(name)}]`);

    const rendered = `export const ${typeName} = ${zodSchemaTemplate(schema.json())}`
      .replace(/z\.date\(\)/g, 'dateSchema');

    seenValidatorNames.add(typeName);
    output += `\n\n${rendered}`;
  }

  return output;
};
