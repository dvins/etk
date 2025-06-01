import fastglob from 'fast-glob';
import type { Options } from "./index";

import {
  generateJsonSchemas,
  exportJsonSchemas,
  exportOpenApiComponents,
} from "./generate-jsonschema";
import { generateTypes } from "./generate-types";
import { TypeScriptCodeParser } from "./ts-parser";

export const generate = async (
  outputPath: string,
  srcDir: string,
  onlyOpenapiComponents?: boolean,
  baseComponentsPath?: string,
) => {
  const dataFiles = await fastglob(["**/*.ts", "!**/*.test.ts"], { absolute: true, cwd: srcDir});

  const parser = new TypeScriptCodeParser(dataFiles);

  const iMessageDefinitions = parser.findVariables(
    TypeScriptCodeParser.Find.Definitions.Messages
  );
  const iConsumerDefinitions = parser.findVariables(
    TypeScriptCodeParser.Find.Definitions.Consumers
  );
  const iGatewayDefinitions = parser.findVariables(
    TypeScriptCodeParser.Find.Definitions.Gateways
  );

  const iCommands = parser.findInterfaces(
    TypeScriptCodeParser.Find.Interfaces.Commands
  );
  const iEvents = parser.findInterfaces(
    TypeScriptCodeParser.Find.Interfaces.Events
  );
  const iTasks = parser.findInterfaces(
    TypeScriptCodeParser.Find.Interfaces.Tasks
  );
  const iModels = parser.findInterfaces(
    TypeScriptCodeParser.Find.Interfaces.Models
  );
  const iModelsToo = parser.findTypeAliases(
    TypeScriptCodeParser.Find.TypeAliases.Models
  );

  const commands = generateJsonSchemas(iCommands);
  const events = generateJsonSchemas(iEvents);
  const tasks = generateJsonSchemas(iTasks);
  const models = generateJsonSchemas(iModels);
  const modelsToo = generateJsonSchemas(iModelsToo);

  if (onlyOpenapiComponents) {
    exportOpenApiComponents(
      [ ...commands, ...events, ...tasks, ...models, ...modelsToo ],
      outputPath,
      baseComponentsPath,
    );
  } else {
    const schemas = [ ...commands, ...events, ...tasks ];
    generateTypes(
      {
        messages: iMessageDefinitions,
        consumers: iConsumerDefinitions,
        gateways: iGatewayDefinitions,
        jsonSchemas: schemas,
      },
      outputPath
    );

    const jsonSchemasOutputDir = outputPath.replace("/index.ts", "");
    exportJsonSchemas(commands, `${jsonSchemasOutputDir}/commands`);
    exportJsonSchemas(events, `${jsonSchemasOutputDir}/events`);
    exportJsonSchemas(tasks, `${jsonSchemasOutputDir}/tasks`);
    exportJsonSchemas(models, `${jsonSchemasOutputDir}/models`);
    exportJsonSchemas(modelsToo, `${jsonSchemasOutputDir}/models`);
  }
};
