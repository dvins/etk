import { Command } from '@commander-js/extra-typings';
import { default as color } from 'colors-cli/safe';
import {
  Parser
} from 'graphql-js-tree';

import { logger, onError } from '../utils/logger';
import { readFileSync } from 'fs';
import { writeFileSync } from 'node:fs';
import prettier from 'prettier';
import {
  getFieldInfo,
  getModelFieldsList,
  getRelationModelList,
  isNestJsQueryManyResolver,
  NestJsQueryOperationRenderer,
  TypesParser,
} from './graphql-parse';

const programInfo = {
  name: `graphql`,
  summary: color.bold.underline('GRAPHQL GENERATOR'),
  description: `Generate code from GraphQL definitions`,
};

const programAutoOperationsInfo = {
  name: `auto-operations`,
  summary: color.bold.underline('GRAPHQL AUTO OPERATIONS GENERATOR'),
  description: `Generate operations from GraphQL schema`,
};

// this should be enough for our use case
// const getSingularForm = (word: string) => {
//   if (word.endsWith('ies')) {
//     return word.slice(0, -3) + 'y';
//   } else if (word.endsWith('s') || word.endsWith('S')) {
//     return word.slice(0, -1);
//   } else {
//     return word;
//   }
// };

export const registerGraphqlCommand = (command: Command) => {
  const subcommand = command
    .command(programInfo.name)
    .summary(programInfo.summary);

  subcommand
    .command('auto-operations')
    .description(programAutoOperationsInfo.description)
    .requiredOption(
      '-s, --schema <path>',
      `Must specify input schema root folder`
    )
    .requiredOption('-o, --output <path>', `Must specify output path`)
    .action(async ({ schema, output }) => {
      logger.info(programAutoOperationsInfo.summary);
      logger.info(programAutoOperationsInfo.description);
      logger.info(`Initializing...`);
      try {
        const parsedSchema = Parser.parse(readFileSync(schema, 'utf8'));

        const typeParser = new TypesParser(parsedSchema);

        const content = typeParser.types.queries
          .filter(query => isNestJsQueryManyResolver(query))
          .reduce((accumulator, query) => {

          const queryReturnType = getFieldInfo(query).type.replace('Connection', '');
          const model = typeParser.types.models.find(model => model.id === queryReturnType)!;
          const allowedFields = getModelFieldsList(model, typeParser._allowedScalars);

          const allowedModels = getRelationModelList(
            typeParser.types,
            model,
            typeParser._allowedModels,
          );
          if (allowedFields.length === 0)
            return accumulator;

          return /*gql*/ `${accumulator}\n
            ${NestJsQueryOperationRenderer.findById(query, allowedFields, allowedModels)}\n
            ${NestJsQueryOperationRenderer.queryMany(query, allowedFields)}\n
          `;
        }, '');

        logger.info(`Writing operations to file ${output}`);
        const formatted = prettier.format(content, { parser: 'graphql' });        // write operations
        writeFileSync(output, formatted, 'utf8');
      } catch (reason) {
        onError(reason);
      }
    });
};
