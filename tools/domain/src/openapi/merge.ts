import { default as color } from 'colors-cli/safe';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parse, stringify } from 'yaml';

import { logger, withFileLink } from '../utils/logger';
import { treeShakeSchema } from './tree-shake';
import { writeYamlFile } from '../utils';

export type PathPrefixMode = 'none' | 'filename' | 'custom';

/**
 * Configuration options for how the OpenAPI schemas should be merged.
 */
interface MergeOpenApiOptions {
  /**
   * If true (default), unused components will be removed from the output.
   */
  treeShake?: boolean;

  /**
   * Controls how to prefix paths from each schema:
   * - 'none': no prefixing
   * - 'filename': prefix with schema file's base name (e.g., /a/hello from a.yaml)
   * - 'custom': use the provided `prefixNames` array (must match schema order)
   */
  pathPrefix?: PathPrefixMode;

  /**
   * Required if pathPrefix is 'custom'.
   * Must contain a string prefix for each schema, in order.
   */
  prefixNames?: string[];
}

/**
 * Merges multiple OpenAPI 3.1 specifications into a single schema.
 *
 * This utility:
 * - Retains `openapi`, `info`, and `servers` metadata from the first schema
 * - Merges `paths` and `components.schemas` from all provided schemas
 * - Supports optional path prefixing to namespace each schema
 * - Optionally tree-shakes unused schemas for a minimal output
 *
 * @param schemas - Absolute or relative paths to OpenAPI YAML files
 * @param outputFilePath - File path to write the merged YAML schema to
 * @param components - Optional extra component files (e.g., shared types)
 * @param options - Optional flags to control merging behavior
 * @throws If no schemas are provided, or if prefix configuration is invalid
 */
export const mergeOpenApiSchemas = async (
  schemas: string[],
  outputFilePath: string,
  components?: string[],
  options?: MergeOpenApiOptions,
): Promise<void> => {
  if (!schemas || schemas.length === 0) {
    throw new Error('At least one OpenAPI schema path must be provided.');
  }

  if (!outputFilePath) {
    throw new Error('An output file path must be provided.');
  }

  const treeShakeEnabled = options?.treeShake !== false;
  const prefixMode: PathPrefixMode = options?.pathPrefix ?? 'filename';

  logger.info(`OpenAPI schema merge starting`);

  // Use the first schema to seed metadata like info and servers
  const firstSchemaPath = schemas[0];
  const firstSchema = parse(readFileSync(firstSchemaPath, 'utf8'));
  logger.debug(`Using metadata from: ${firstSchemaPath}`);

  const baseMetadata = {
    openapi: firstSchema.openapi ?? '3.1.0',
    info: {
      title: firstSchema.info?.title ?? 'Merged OpenAPI Schema',
      summary: firstSchema.info?.summary,
      description: firstSchema.info?.description,
      version: firstSchema.info?.version ?? '1.0.0',
      termsOfService: firstSchema.info?.termsOfService,
      contact: firstSchema.info?.contact,
      license: firstSchema.info?.license,
    },
    security: firstSchema.security ?? [],
    servers: firstSchema.servers ?? [],
  };

  // Start the merged schema with metadata and combined component definitions
  let initSchema = {
    ...baseMetadata,
    paths: {},
    components: {
      schemas: {}
    },
  };

  // Merge any shared components provided separately
  if (components && components.length > 0) {
    for (const componentPath of components) {
      logger.debug(`Merging shared components from: ${componentPath}`);
      initSchema = await mergeComponents(initSchema, componentPath);
    }
  }

  // Merge the first schema's components directly
  if (firstSchema.components) {
    initSchema = {
      ...initSchema,
      components: {
        ...initSchema.components,
        ...firstSchema.components,
      },
    };
  }

  const mergedSchema = schemas.reduce((acc, schemaPath, index) => {
    logger.debug(`Merging schema from: ${schemaPath}`);
    const parsedSchema = parse(readFileSync(schemaPath, 'utf8'));

    // Compute path prefix based on configured strategy
    let pathPrefix = '';
    switch (prefixMode) {
      case 'filename':
        pathPrefix = path.basename(schemaPath, path.extname(schemaPath));
        break;

      case 'custom':
        if (!options?.prefixNames || options.prefixNames.length !== schemas.length) {
          throw new Error(
            `Invalid prefixNames: expected ${schemas.length} names for 'custom' prefixing but got ${options?.prefixNames?.length ?? 0}.`
          );
        }
        pathPrefix = options.prefixNames[index];
        break;

      case 'none':
        pathPrefix = '';
        break;
    }

    // Add prefix to each path unless explicitly disabled
    const prefixedPaths = Object.entries(parsedSchema.paths ?? {}).reduce(
      (accPaths, [pathKey, pathValue]) => ({
        ...accPaths,
        [pathPrefix ? `/${pathPrefix}${pathKey}` : pathKey]: pathValue,
      }),
      {},
    );

    return {
      ...acc,
      paths: {
        ...acc.paths,
        ...prefixedPaths,
      },
      components: {
        ...acc.components,
        schemas: {
          ...acc.components.schemas,
          ...parsedSchema.components?.schemas,
        },
      },
    };
  }, initSchema);

  const finalSchema = treeShakeEnabled
    ? (logger.debug(`Running component tree shake optimization...`), await treeShakeSchema(mergedSchema))
    : mergedSchema;

  const content = stringify(finalSchema);

  logger.debug(`Writing merged OpenAPI schema to: ${outputFilePath}`);
  writeYamlFile(outputFilePath, { content });

  logger.info(`OpenAPI schema merge completed → ${withFileLink(outputFilePath)}`);
};


/**
 * Merges additional OpenAPI components into the target schema.
 *
 * This supports merging common component sections such as:
 * - components.schemas
 * - components.securitySchemes
 * - components.responses
 * - components.parameters
 * - components.requestBodies
 * - components.headers
 * - components.examples
 * - components.links
 * - components.callbacks
 *
 * It also supports optional transformation of `const` to `enum`.
 *
 * @param schema - The base OpenAPI schema object to augment
 * @param components - Path to a JSON file containing OpenAPI `components`
 * @param options - Optional settings
 * @param options.isReplaceConstWithEnum - If true, replaces `const` values with equivalent `enum` arrays
 * @returns A new OpenAPI schema with components merged in
 */
export async function mergeComponents(
  schema: any,
  components: string | undefined,
  options: {
    isReplaceConstWithEnum?: boolean;
  } = {}
): Promise<any> {
  const { isReplaceConstWithEnum = false } = options;

  if (!components) return schema;

  logger.debug(`  - Loading component schemas from: ${color.magenta.italic(components)}`);

  const parsedJson = JSON.parse(readFileSync(components, 'utf8'));
  const componentsObj = isReplaceConstWithEnum
    ? replaceConstWithEnum(parsedJson)
    : parsedJson;

  const baseComponents = schema.components ?? {};
  const incomingComponents = componentsObj.components ?? {};

  // List of top-level component groups defined by OpenAPI 3.1
  const componentKeys = [
    'schemas',
    'securitySchemes',
    'responses',
    'parameters',
    'requestBodies',
    'headers',
    'examples',
    'links',
    'callbacks',
    'pathItems',
  ];

  const mergedComponents: Record<string, any> = {};

  for (const key of componentKeys) {
    // Get any incoming (new) components from the overlay file for this key (e.g., securitySchemes, responses)
    const incoming = incomingComponents[key] ?? {};

    // Get any existing components already in the base schema under this key
    const existing = baseComponents[key] ?? {};

    // Merge both sources — overlay wins if duplicate keys exist
    const merged = { ...incoming, ...existing };

    // Only include this component key in the final output if it has at least one entry
    const mergedCount = Object.keys(merged).length;
    if (mergedCount > 0) {
      // Attach merged result to the output components object
      mergedComponents[key] = merged;

      // Log useful debug info for traceability
      logger.debug(`  - Merging ${mergedCount} component(s) into components.${key}`);
    }
  }

  return {
    ...schema,
    components: mergedComponents,
  };
}

/**
 * This function replaces the `const` keyword with `enum` in the schema.
 * This is necessary because the `const` keyword is not supported by OpenAPI 3.0.
 * @param {any} schema The schema to be modified.
 * @returns {any} The modified schema.
 */
export function replaceConstWithEnum(schema: any): any {
  const innerReplaceConstWithEnum = (schema: any) => {
    if (typeof schema === 'object' && schema !== null) {
      for (const key in schema) {
        if (key === 'const') {
          schema['enum'] = [schema[key]];
          delete schema[key];
        } else {
          innerReplaceConstWithEnum(schema[key]);
        }
      }
    }
  }

  const updatedSchema = schema;

  logger.debug(`  - Replacing consts with enums`);
  innerReplaceConstWithEnum(updatedSchema);

  return updatedSchema;

}