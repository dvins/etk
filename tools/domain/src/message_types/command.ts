import { default as color } from 'colors-cli/safe';
import { Command } from '@commander-js/extra-typings';
import { logger, onError } from '../utils/logger';
import { initialize, generate, wrapUp } from './generator/index';
import { buildMermaidMessageFlowDiagram, initializeDocs } from './docs';

const programInfo = {
  name: `message_types`,
  summary: color.bold.underline(`DOMAIN GENERATOR`),
  description: `Generate advanced types, schemas, and classes based on interfaces and other definitions`,
};

export const registerDomainMessageTypesCommand = (command: Command) => {
  const subcommand = command
    .command(programInfo.name)
    .summary(programInfo.summary)
    .description(programInfo.description);

  subcommand
    .command('messages')
    .requiredOption(
      '-s, --schema <path>',
      'Must specify input schema root folder'
    )
    .requiredOption('-o, --output <path>', 'Must specify output path')
    .requiredOption(
      '-d, --srcs <path>',
      'Must specify a space separated list of schema files',
    )
    .action(async ({ schema, srcs, output }) => {
      logger.info(programInfo.summary);
      logger.info(programInfo.description);
      logger.info(`Initializing...`);
      try {
        await initialize(schema, srcs);
        await generate(output, srcs, false);
        await wrapUp(output);
      } catch (reason) {
        onError(reason);
      }
    });

  subcommand
    .command('components')
    .requiredOption(
      '-s, --schema <path>',
      'Must specify input schema root folder'
    )
    .requiredOption('-o, --output <path>', 'Must specify output path')
    .requiredOption(
      '-d, --srcs <path>',
      'Must specify a space-separated list of schema files'
    )
    .option(
      '-b, --base-components <path>',
      'Optional path to base OpenAPI components YAML file'
    )
    .action(async ({ schema, srcs, output, baseComponents }) => {
      logger.info(programInfo.summary);
      logger.info(programInfo.description);
      logger.info('Initializing...');

      try {
        await initialize(schema, srcs);
        await generate(output, srcs, true, baseComponents);
        await wrapUp(output);
      } catch (reason) {
        onError(reason);
      }
    });

  subcommand
    .command('docs')
    .description('It generates a Mermaid sequenceDiagram that represents the flow of a message - starting from a command input, and recursively adding the next messages if the handler publishes an event or sends a command.')
    .option(
      '-q, --queue <name>',
      'Select first Gateway Queue: DomainEventGateway or DomainCommandGateway',
    )
    .option(
      '-m, --message <name>',
      'Select first Message',
    )
    .action(async ({ queue, message }) => {
      logger.info(programInfo.summary);
      logger.info(programInfo.description);
      logger.info(`Build Docs: ${queue}, ${message}`);
      logger.info(`Initializing...`);

      if (queue && (queue !== 'event' && queue !== 'command')) {
        throw new Error('queue should be event or command');
      }

      try {
        const { typeChecker, files } = initializeDocs();

        logger.info(`Buildinging...`);

        const output = await buildMermaidMessageFlowDiagram({
          files,
          typeChecker,
          queue: queue as 'event' | 'command' | undefined,
          message
        });

        logger.info(
          color.green.bold(
            `Generated Mermaid sequenceDiagram: ${output}`
          )
        );
      } catch (reason) {
        onError(reason);
      }
    });
};
