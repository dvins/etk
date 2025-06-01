import color from "colors-cli/safe";
import { readFileSync } from 'node:fs';
import stableStringify from "safe-stable-stringify";
import {
  Config,
  DEFAULT_CONFIG,
  createFormatter,
  createParser,
  SchemaGenerator,
} from "ts-json-schema-generator";
import { InterfaceDeclaration, TypeAliasDeclaration } from "ts-morph";
import { Program } from "typescript";
import { parse } from 'yaml';

import {
  writeJsonFile,
  logger,
  withFileLink,
  GeneratedContent,
} from "../../utils";


export const generateJsonSchemas = (
  sources: InterfaceDeclaration[] | TypeAliasDeclaration[],
  config: {
    stripInterfaceChar?: boolean;
  } = { stripInterfaceChar: true }
): GeneratedContent[] => {
  logger.info(`Generating JSON Schemas`);
  const contents = sources
    .map((i) => generateJsonSchema(i, config))
    .filter((i) => i !== undefined);

  return contents;
};

export const generateJsonSchema = (
  source: InterfaceDeclaration | TypeAliasDeclaration,
  config: {
    stripInterfaceChar?: boolean;
  } = { stripInterfaceChar: true }
): GeneratedContent | undefined  => {
  const name = source.getName();

  // Determine if this is an interface that starts with `I` so we can remove it from the name
  // of the JSON model we emit as well as avoid jumbling the name of interfaces and types
  // which do not start with `I`
  const nameFirstChar = name.substring(0,1);
  const nameSecondChar = name.substring(1,1);
  const isInterfaceWithI = config.stripInterfaceChar
    ? nameFirstChar === 'I' && nameSecondChar === nameSecondChar.toUpperCase()
    : false;

  const schemaName = isInterfaceWithI ? name.substring(1) : name;
  const schemaId = `domain.${schemaName}`;

  logger.debug(`  - ${color.bold(schemaName)} schema generated`);

  const schemaGenConfig: Config = {
    expose: 'none',
    jsDoc: 'extended',
    path: source.getSourceFile().getFilePath(),
    schemaId: schemaId,
    skipTypeCheck: true,
    sortProps: true,
    strictTuples: true,
    topRef: false,
    type: source.getName(),
  };

  // const schema = tsj.createGenerator(config).createSchema(config.type);

  // This explicitly wires up the JSON Schema Generator and uses the already
  // loaded and parsed Typescript source files from the generator caller
  const completedConfig = { ...DEFAULT_CONFIG, ...schemaGenConfig };
  const program: Program = source.getProject().getProgram().compilerObject as Program;
  const parser = createParser(program, completedConfig);
  const formatter = createFormatter(completedConfig);
  const generator = new SchemaGenerator(program, parser, formatter, completedConfig);

  try {
    const rawContent = generator.createSchemaFromNodes([ source.compilerNode ]);
      const stableContent = stableStringify(rawContent, null, 2);

    const schema = {
      key: schemaName,
      content: JSON.stringify(patchSchema(JSON.parse(stableContent)), null, 2),
    };

    return schema;

  } catch (error: unknown) {
    if (error instanceof Error) {
      // Access properties of the Error object safely
      logger.error(error.message);
    } else {
      // Handle cases where the error is not an Error object
      logger.error(`An unknown error occurred: ${error}`);
    }
  };

  return;
};

export const exportJsonSchemas = (
  schemas: GeneratedContent[],
  outputPath: string
) => {
  logger.info(`Exporting JSON Schemas: ${withFileLink(outputPath)}`);

  schemas.map((schema) => {
    const schemaPath = `${outputPath}/${schema.key}.schema.json`;
    try {
      writeJsonFile(schemaPath, schema);
      logger.debug(`  - ${color.bold(schema.key ?? "")} schema exported`);
    }
    catch (error: unknown) {
      logger.warn(`  - ${color.bold(schema.key ?? "")} schema export failed: ${(error as Error).message}`);
    }
  });
};

/**
 * Exports a combined OpenAPI components object by optionally overlaying an existing YAML file
 * and appending generated JSON schemas under components.schemas.
 *
 * @param schemas - Array of generated schema objects (each with .content as JSON string and .key for naming)
 * @param outputPath - Destination path to write the bundled components JSON file
 * @param baseComponentsPath - Optional YAML file path with pre-defined OpenAPI components
 */
export const exportOpenApiComponents = async (
  schemas: GeneratedContent[],
  outputPath: string,
  baseComponentsPath?: string
) => {
  logger.info(`Exporting JSON Schemas Bundle: ${withFileLink(outputPath)}`);

  // Parse base OpenAPI components YAML file if provided
  let baseComponents: { schemas?: {} } = {};

  if (baseComponentsPath) {
    try {
      const raw = readFileSync(baseComponentsPath, 'utf8');
      const parsed = parse(raw);
      if (parsed?.components) {
        baseComponents = parsed.components;
        logger.debug(`Loaded base components from: ${baseComponentsPath}`);
      } else {
        logger.warn(`No components key found in base file: ${baseComponentsPath}`);
      }
    } catch (err) {
      logger.error(`Failed to load base components from ${baseComponentsPath}: ${(err as Error).message}`);
      throw err;
    }
  }

  // Reduce generated JSON schemas
  const jsonSchemas = schemas.reduce((acc, s) => {
    const schema = JSON.parse(s.content);
    delete schema.$id;
    delete schema.$schema;
    delete schema.definitions;

    return {
      ...acc,
      [s.key!]: patchSchema(schema),
    };
  }, {});

  // Merge base components with generated schemas
  const bundledSchema = {
    components: {
      ...baseComponents,
      schemas: {
        ...(baseComponents?.schemas ?? {}),
        ...jsonSchemas,
      },
    },
  };

  writeJsonFile(outputPath, {
    content: JSON.stringify(bundledSchema, null, 2),
  });
};

/** Adds the `path` prefix to all $refs found in object, recursively */
const patchSchema = (obj: object): object => {
  if (obj)
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => {
        const value: any = typeof v === "object" && !Array.isArray(v) ? patchSchema(v) : v;
        // examples field are not accepted by openapi
        // delete value.examples;

        // default value for specversion has wrong type
        if (k === "specversion" && typeof value.default !== "string")
          value.default = "1.0";

        // ignore `required: Non-empty string....`
        if (k === "required" && typeof value === "string") return [];
        if (k === "type") delete value.required;

        return [k, value];
      })
    );

  return {};
};
