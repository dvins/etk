import SwaggerParser from '@apidevtools/swagger-parser';
import { default as color } from 'colors-cli/safe';
import { readFileSync } from 'node:fs';
import { OpenAPI } from 'openapi-types';
import { parse } from 'yaml';

import {
  libraryTemplate,
  istioAuthorizationPolicyTemplate,
} from './handlebars-defs';
import { beautifyTypeScript, logger, writeTypeScriptFile } from '../utils';

export async function parseAndValidateSchema(
  schema: any
): Promise<OpenAPI.Document | undefined> {
  try {
    let api = await SwaggerParser.validate(schema);
    logger.info(`  - Parsing OpenAPI Schema: ${api.info.title}, Version: ${api.info.version}`);
    return api;
  } catch (err) {
    logger.error(` - Validation failed when parsing schema:\n${err}`);
    throw err;
  }
}

export async function renderLibrary(
  schema: any,
  api: any
): Promise<string | undefined> {
  try {
    logger.debug('    - Rendering module using Handlebars template');
    let spec = {
      schema,
      ...api,
    };

    // Remove any path containing `/graphql`
    spec.paths = Object.fromEntries(
      Object.entries(spec.paths).filter(
        ([key, value]) => key.indexOf('/graphql') === -1
      )
    );
    return libraryTemplate(spec);
  } catch (err: any) {
    console.error(err);
    console.log(err.stack);
  }

  return;
}

export async function renderIstioAuthorizationPolicy(
  schema: any,
  api: any
): Promise<string | undefined> {
  try {
    logger.info('Rendering istio authorization policy template');
    return istioAuthorizationPolicyTemplate({ schema, ...api });
  } catch (err: any) {
    console.error(err);
    console.log(err.stack);
  }

  return;
}

export async function loadAndParseSchemaFromFile(
  schemaPath: string,
): Promise<any> {
  logger.debug(`  - Loading schema from: ${color.magenta.italic(schemaPath)}`);
  const rawSchema = readFileSync(schemaPath, 'utf8');

  logger.debug(`  - Parsing schema without validation`);
  const schema = parse(rawSchema);

  return schema;
}

/**
 * Formats the given code and then appends it to the provided output file.
 *
 * @param {string} file The file to save the formatted code.
 * @param {string} content The original code.
 */
export function formatAndSave(file: string, content: string) {
  const formatted = beautifyTypeScript(content);
  writeTypeScriptFile(file, [{ content: formatted }]);
}
