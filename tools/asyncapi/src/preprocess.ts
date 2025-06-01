import color from 'colors-cli/safe';
import { logger } from './utils';

/**
 * Recursively traverses an AsyncAPI schema object and replaces anonymous schema IDs
 * (`<anonymous-schema-...>`) with deterministic names based on parent keys.
 *
 * @remarks
 * This is a workaround for a known issue in AsyncAPI parser when Modelina generation fails
 * due to lack of stable schema IDs. It rewrites the `x-parser-schema-id` field.
 *
 * @see https://github.com/asyncapi/parser-js/issues/176
 *
 * @param obj - The current schema object being traversed.
 * @param lastKey - The most recent key name in the parent object (used for ID naming).
 * @param lastSchemaID - The last valid schema ID encountered (used for hierarchical naming).
 * @returns The updated schema object with improved schema IDs.
 */
export const preprocess = async (
  obj: any,
  lastKey = '',
  lastSchemaID = ''
): Promise<any> => {
  const upperFirst = (str: string): string => str.charAt(0).toUpperCase() + str.slice(1);
  const lowerFirst = (str: string): string => str.charAt(0).toLowerCase() + str.slice(1);

  logger(color.red(`preprocess lastKey: ${lastKey}`));

  // Patch anonymous schema IDs to use a more deterministic name
  const schemaId = obj['x-parser-schema-id'];
  if (schemaId !== undefined) {
    if (schemaId.startsWith('<anonymous-schema-')) {
      const newSchemaId = lowerFirst(lastSchemaID + upperFirst(lastKey));
      obj['x-parser-schema-id'] = newSchemaId;
      lastSchemaID = newSchemaId;
    } else {
      lastSchemaID = schemaId;
    }
  }

  // Recursively traverse keys to locate additional schemas
  const keys = Object.keys(obj);
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === 'object' && value !== null) {
      let newKey = key;

      // If we’re entering a payload schema under a message, adopt the message name
      if (key === 'payload' && obj['name'] !== undefined && lastKey === 'message') {
        lastSchemaID = obj['name'];
      }
      // For array items, use an empty key so we don’t pollute the naming
      else if (key === 'items' && obj['type'] === 'array') {
        newKey = '';
      }

      // Skip recursive walk for circular references
      if (obj['x-parser-circular-props']) {
        continue;
      }

      await preprocess(value, newKey, lastSchemaID);
    }
  }

  return obj;
};
