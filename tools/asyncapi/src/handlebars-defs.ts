import path from 'path';
import fs from 'fs';
import Handlebars from 'handlebars';
import { formatStringBlockComment } from './utils';

/**
 * Register Handlebars helper to wrap comments to 80 characters.
 */
Handlebars.registerHelper('formatStringBlockComment', (s: string) =>
  formatStringBlockComment(s, 80)
);

/**
 * Converts a string to uppercase.
 */
Handlebars.registerHelper('uppercase', (s: string) => s.toUpperCase());

/**
 * Builds a dynamic channel name from a list of values, e.g., `${a}-${b}`.
 */
Handlebars.registerHelper('buildChannelName', (list: string[]) =>
  list.reduce((acc, e) => `${acc}-\${${e}}`, '').slice(1)
);

/**
 * Performs a strict equality check.
 */
Handlebars.registerHelper('eq', (a: unknown, b: unknown) => a === b);

/**
 * Builds a dynamic channel post path from a list, e.g., `/:foo/:bar`.
 */
Handlebars.registerHelper('buildChannelPostPath', (list: string[]) =>
  list.reduce((acc, e) => `${acc}/:${e}`, '').slice(1)
);

/**
 * Checks if a value is defined (not null or undefined).
 */
Handlebars.registerHelper('defined', (s: unknown) => !!s);

/**
 * Maps OpenAPI types to Zod types.
 */
Handlebars.registerHelper('toZodType', (t: string, _items: unknown) => {
  // Normalize type string by removing any quote characters
  const normalized = t.replace(/"/g, '');
  switch (normalized) {
    case 'string':
    case 'object':
    case 'date':
    case 'number':
    case 'boolean':
    case 'array':
    case 'null':
      return normalized;
    case 'integer':
      return 'number';
    default:
      console.log('unknown type', t);
      return 'any';
  }
});

/**
 * Maps OpenAPI format to Zod refinements.
 */
Handlebars.registerHelper('toZodFormat', (f: string) => {
  switch (f) {
    case 'email':
    case 'url':
    case 'uuid':
      return f;
    case 'uri':
      return 'url';
    default:
      console.warn('unknown format', f);
      return undefined;
  }
});

/**
 * Builds a channel name using uppercase environment-based substitutions.
 */
Handlebars.registerHelper(
  'buildChannelNameWithEnvVars',
  (list: string[], className: string) =>
    list
      .reduce(
        (acc, e) => `${acc}-\${${e.toUpperCase()}_${className}Subscriber}`,
        ''
      )
      .slice(1)
);

/**
 * Checks if a field is optional based on the required array.
 */
Handlebars.registerHelper('optional', (s: string, required: string[] | undefined) =>
  required && Array.isArray(required) ? !required.includes(s) : false
);

/**
 * Renders a Zod schema block using the zodSchemaTemplate.
 */
Handlebars.registerHelper('renderZod', (s: Record<string, unknown>) =>
  zodSchemaTemplate({ ...s })
);

/**
 * Logs a value during template rendering.
 */
Handlebars.registerHelper('log', (s: unknown) => {
  const output = JSON.stringify(s);
  console.log('LOG', output);
  return output;
});

/**
 * Checks if a schema represents a union type.
 */
Handlebars.registerHelper('isUnionType', (s: unknown) => Array.isArray(s));

/**
 * Gets the x-parser-schema-id value from an object.
 */
Handlebars.registerHelper('getParserSchemaId', (s: Record<string, unknown>) =>
  s['x-parser-schema-id']
);

// Template exports
/**
 * Template for shared Handlebars helpers.
 */
export const commonTemplate = Handlebars.compile(
  fs.readFileSync(path.join(__dirname, './templates/common.hbs'), 'utf-8')
);

/**
 * Template for generating Zod schemas.
 */
export const zodSchemaTemplate = Handlebars.compile(
  fs.readFileSync(path.join(__dirname, './templates/zod-schema.hbs'), 'utf-8')
);

/**
 * Template for a message publisher.
 */
export const publisherTemplate = Handlebars.compile(
  fs.readFileSync(path.join(__dirname, './templates/publisher.hbs'), 'utf-8')
);

/**
 * Template for a message subscriber.
 */
export const subscriberTemplate = Handlebars.compile(
  fs.readFileSync(path.join(__dirname, './templates/subscriber.hbs'), 'utf-8')
);

/**
 * Template for a NestJS controller.
 */
export const nestControllerTemplate = Handlebars.compile(
  fs.readFileSync(path.join(__dirname, './templates/nest-controller.hbs'), 'utf-8')
);

/**
 * Template for a NestJS module.
 */
export const nestModuleTemplate = Handlebars.compile(
  fs.readFileSync(path.join(__dirname, './templates/nest-module.hbs'), 'utf-8')
);

/**
 * Template for a message queue wrapper.
 */
export const queueTemplate = Handlebars.compile(
  fs.readFileSync(path.join(__dirname, './templates/queue.hbs'), 'utf-8')
);
