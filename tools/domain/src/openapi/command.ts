import { Command } from '@commander-js/extra-typings';
import { default as color } from 'colors-cli/safe';
import { readFileSync, writeFileSync } from 'fs';
import { generate as orvalGenerate } from 'orval';
import path from 'path';
import prettier from 'prettier';
import { parse as parseYaml, stringify } from 'yaml';

import { logger, onError, withFileLink } from '../utils/logger';
import {
  formatAndSave,
  loadAndParseSchemaFromFile,
  parseAndValidateSchema,
  renderIstioAuthorizationPolicy,
  renderLibrary,
} from './generate';
import { mergeComponents, mergeOpenApiSchemas, replaceConstWithEnum} from './merge';
import { writeYamlFile } from '../utils';
import { treeShakeSchema } from './tree-shake';

const OrvalGenerator = {
  generate: orvalGenerate,
};

const programInfo = {
  name: `openapi`,
  summary: color.bold.underline('OPENAPI GENERATOR'),
  description: `Generate several targets from OpenAPI definitions`,
};

const programSchemaInfo = {
  name: `schema`,
  summary: color.bold.underline('OPENAPI SCHEMA GENERATOR'),
  description: `Generate OpenAPI schema from OpenAPI definitions`,
};

const programNestJsInfo = {
  name: `nestjs`,
  summary: color.bold.underline('OPENAPI NESTJS MODULE GENERATOR'),
  description: `Generate NestJs controllers with validation built-in from OpenAPI definitions`,
};

const programClientInfo = {
  name: `client`,
  summary: color.bold.underline('OPENAPI CLIENT SDK GENERATOR'),
  description: `Generate client SDK from OpenAPI definitions`,
};

const programIstioAuthorizationPolicyInfo = {
  name: `istio`,
  summary: color.bold.underline('OPENAPI ISTIO AUTHORIZATION POLICY GENERATOR'),
  description: `Generate an Istio authorization policy according to the security configuration from OpenAPI definitions`,
};

const programFederatedSchemaInfo = {
  name: `client:federated`,
  summary: color.bold.underline('OPENAPI FEDERATED CLIENT GENERATOR'),
  description: `Merge schemas from multiple OpenAPI definitions`,
};

export const registerOpenApiCommand = (command: Command) => {
  const subcommand = command.command(programInfo.name).summary(programInfo.summary);

  subcommand
    .command('schema')
    .description(programSchemaInfo.description)
    .requiredOption('-s, --schema <path>', `Must specify input schema root folder`)
    .requiredOption('-o, --output <path>', `Must specify output path`)
    .option('-c, --components <path>', `An optional file with additional json schemas definitions`)
    .action(async ({ schema, output, components }) => {
      logger.info('');
      logger.info(programClientInfo.summary);
      logger.info(`Initializing...`);

      const outputPath = path.parse(output);
      const outputApi = outputPath.base;
      const outputWorkspace = output.replace(`/${outputApi}`, '');
      const outputFilePath = path.resolve(output)

      logger.info(`  Base OpenAPI Schema: ${withFileLink(schema)}`);
      logger.info(`      Component types: ${withFileLink(components ?? '')}`);
      logger.info(`            Workspace: ${withFileLink(outputWorkspace)}`);
      logger.info(`       OpenAPI Output: ${withFileLink(output)}`);
      logger.info(``);

      try {
        logger.info(`OpenAPI Schema generation starting`);

        const parsedSchema = await loadAndParseSchemaFromFile(schema);
        const mergedSchema = await mergeComponents(parsedSchema, components);
        const optimizedSchema = await treeShakeSchema(mergedSchema);
        const content = stringify(optimizedSchema);
        // const content = stringify(mergedSchema);

        logger.debug(`  - Writing final OpenAPI output`);
        writeYamlFile(outputFilePath, { content });

        logger.info(`OpenAPI Schema generation completed`);
      } catch (reason) {
        onError(reason);
      }
    });

  subcommand
    .command('nestjs')
    .description(programNestJsInfo.description)
    .requiredOption('-s, --schema <path>', `Must specify input schema root folder`)
    .requiredOption('-o, --output <path>', `Must specify output path`)
    .option('-c, --components <path>', `An optional file with additional json schemas definitions`)
    .action(async ({ schema, output, components }) => {
      logger.info(programNestJsInfo.summary);
      logger.info(programNestJsInfo.description);
      logger.info(`Initializing...`);

      const outputPath = path.parse(output);
      const outputClient = outputPath.base;
      const outputWorkspace = output.replace(`/${outputClient}`, '');

      logger.info(`        OpenAPI Schema: ${withFileLink(schema)}`);
      logger.info(`       Component types: ${withFileLink(components ?? '')}`);
      logger.info(`             Workspace: ${withFileLink(outputWorkspace)}`);
      logger.info(`  NestJs Module Output: ${withFileLink(output)}`);
      logger.info(``);

      try {
        logger.info(`OpenAPI NestJs Module generation starting`);

        const parsedSchema = await loadAndParseSchemaFromFile(schema);
        const mergedSchema = await mergeComponents(parsedSchema, components);
        const modifiedSchema = await replaceConstWithEnum(mergedSchema);
        const optimizedSchema = await treeShakeSchema(modifiedSchema);

        const api = await parseAndValidateSchema(optimizedSchema);
        const moduleCode = await renderLibrary(optimizedSchema, api);

        logger.debug(`  - Writing final module output`);
        formatAndSave(output, moduleCode!);

        logger.info(`OpenAPI NestJs Module generation completed`);
      } catch (reason) {
        onError(reason);
      }
    });

  subcommand
    .command('client')
    .description(programClientInfo.description)
    .requiredOption('-s, --schema <path>', `Must specify input schema root folder`)
    .requiredOption('-o, --output <path>', `Must specify output path`)
    .requiredOption(
      '-t, --target <target>',
      `Must specify target, possible values: 'angular', 'axios', 'axios-functions', 'react-query', 'svelte-query', 'vue-query', 'swr' or 'zod'.`,
    )
    .option('-c, --components <path>', `An optional file with additional json schemas definitions`)
    .action(async ({ schema, output, components, target }) => {
      logger.info('');
      logger.info(programClientInfo.summary);
      logger.info(`Initializing...`);

      const outputPath = path.parse(output);
      const outputClientType = target;
      const outputClient = outputPath.base;
      const outputWorkspace = output.replace(`/${outputClient}`, '');
      const outputApi = output.replace(`/${outputClient}`, '/api.yaml');

      logger.info(`     OpenAPI Schema: ${withFileLink(schema)}`);
      logger.info(`    Component types: ${withFileLink(components ?? '')}`);
      logger.info(`          Workspace: ${withFileLink(outputWorkspace)}`);
      logger.info(`        Client type: ${outputClientType}`);
      logger.info(`  Client SDK Output: ${withFileLink(output)}`);
      logger.info(``);

      try {
        logger.info(`OpenAPI Client SDK generation starting`);

        const parsedSchema = await loadAndParseSchemaFromFile(schema);
        const mergedSchema = await mergeComponents(parsedSchema, components);
        const optimizedSchema = await treeShakeSchema(mergedSchema);

        logger.debug(`  - Writing final API output`);
        writeYamlFile(outputApi, { content: stringify(optimizedSchema) })

        const axiosInstancePath = path.resolve(path.join(__dirname, '../../../packages/client-http-axios/src/axiosInstance.ts'));

        try {
          logger.debug(`  - Generating ${outputClientType} client SDK from API`);
          await OrvalGenerator.generate({
            input: { target: outputApi },
            output: {
              client: outputClientType as any,
              workspace: outputWorkspace,
              target: outputClient,

              /** Generate mocks using MSW and Faker */
              mock: {
                type: 'msw',
                delay: 500,
                useExamples: true,
              },

              /** Enable URL encoding of path/query parameters. */
              ...(outputClientType == 'react-query' && {
                urlEncodeParameters: true,
              }),

              /** Apply AxiosRegistry for using Custom Instance  */
              override: {
                query: {
                  /** Required to emit proper TanStack v5 types */
                  version: 5,
                },
                mutator: {
                  path: axiosInstancePath,
                  name: 'useAxios',
                },
              },
            },
          });
        } catch (e) {
          console.error(`Unable to generate ${outputClientType} client with Orval!`, e);
          process.exit(1);
        }

        const prettifiedOutput = prettier
          .format(
            readFileSync(output, 'utf8')
              .replaceAll('file: string', 'file: File')
              .replaceAll('file?: string', 'file?: File'),
            { parser: 'typescript' },
          )
          .split('\n')
          .filter((l: string) => l.indexOf('/src/axiosInstance') === -1)
          .join('\n');

        // Manually patch the generated code so upload file works
        writeFileSync(
          output,
          /* ts */`import { useAxios } from 'client-http-axios';\n
          ${prettifiedOutput}`,
        );

        logger.debug(`  - Client SDK patched to use Axios HTTP Client`);
        logger.info(`OpenAPI client generation completed`);
      } catch (reason) {
        onError(reason);
      }
    });

  subcommand
    .command('istio')
    .description(programIstioAuthorizationPolicyInfo.description)
    .requiredOption('-s, --schema <path>', `Must specify input schema root folder`)
    .requiredOption('-o, --output <path>', `Must specify output path`)
    .option('-c, --components <path>', `An optional file with additional json schemas definitions`)
    .action(async ({ schema, output, components }) => {
      logger.info(programIstioAuthorizationPolicyInfo.summary);
      logger.info(programIstioAuthorizationPolicyInfo.description);
      logger.info(`Initializing...`);
      try {
        logger.info(`OpenAPI Istio Authorization Policy generation starting`);

        const parsedSchema = await loadAndParseSchemaFromFile(schema);
        const mergedSchema = await mergeComponents(parsedSchema, components);
        const optimizedSchema = await treeShakeSchema(mergedSchema);
        const api = await parseAndValidateSchema(optimizedSchema);

        // Extract the security configuration
        const unprotected = Object.entries(optimizedSchema.paths).reduce(
          (acc, [path, pathValue]) => [
            ...acc,
            ...Object.entries(pathValue as any)
              .map(([method, methodValue]) =>
                !(methodValue as any).security
                  ? {
                      path:
                        // Istio has a limited support for wildcards, specially we can't have more than one wildcard in the path
                        // therefore we just replace everything after the first parameter with a wildcard
                        path.replace(/\/{.*/, '/*'),
                      // Istio only understand uppercase methods
                      method: method.toUpperCase(),
                    }
                  : null,
              )
              .filter((x) => x !== null),
          ],
          [] as any[],
        );

        //console.log(unprotected);
        const content = await renderIstioAuthorizationPolicy(parsedSchema, {
          unprotected,
        });

        //console.log(content);
        if (content)
          writeYamlFile(output, { content })
        else
          throw new Error(`No content for ${output} file generated`);

        logger.info(`OpenAPI Istio Authorization Policy generation completed`);
      } catch (reason) {
        onError(reason);
      }
    });

subcommand
  .command('schema:merge')
  .description(programFederatedSchemaInfo.description)
  .option('-s, --schemas <path...>', 'Must specify input schemas')
  .option('-o, --output <path>', 'Must specify output path')
  .option('-c, --components <path...>', 'Optional additional component files')
  .option('--no-tree-shake', 'Disable removal of unused component schemas')
  .option(
    '--prefix <mode>',
    'How to prefix paths: "filename", "custom", or "none" (default: filename)',
    'filename'
  )
  .option(
    '--prefix-names <names>',
    'Comma-separated prefix names for each schema (used only when --prefix custom)'
  )
  .option('--config <path>', 'Optional YAML file containing full configuration')
  .action(async (cliOptions) => {
    logger.info(programFederatedSchemaInfo.summary);
    logger.info(programFederatedSchemaInfo.description);
    logger.info('Initializing...');

    try {
      let config: any;

      if (cliOptions.config) {
        logger.debug(`Loading configuration from: ${cliOptions.config}`);
        const fileContent = readFileSync(cliOptions.config, 'utf8');
        config = parseYaml(fileContent);
      } else {
        config = {
          schemas: cliOptions.schemas,
          output: cliOptions.output,
          components: cliOptions.components,
          treeShake: cliOptions.treeShake,
          pathPrefix: cliOptions.prefix,
          prefixNames:
            cliOptions.prefix === 'custom' && typeof cliOptions.prefixNames === 'string'
              ? cliOptions.prefixNames.split(',').map((s) => s.trim())
              : undefined,
        };
      }

      if (!config.schemas || !config.output) {
        throw new Error(
          'Missing required parameters: both "schemas" and "output" must be specified (either via flags or config file).'
        );
      }

      await mergeOpenApiSchemas(
        config.schemas,
        config.output,
        config.components,
        {
          treeShake: config.treeShake,
          pathPrefix: config.pathPrefix,
          prefixNames: config.prefixNames,
        }
      );
    } catch (reason) {
      onError(reason);
    }
  });
};
