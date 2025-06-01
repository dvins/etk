import { default as color } from "colors-cli/safe";
import { Command } from "@commander-js/extra-typings";

import { logger } from "./utils/logger";
import { registerDomainMessageTypesCommand } from "./message_types/command";
import { registerOpenApiCommand } from "./openapi/command";
import { registerGraphqlCommand } from "./graphql/command";

const program = new Command()
  .name("ETK Domain Generator Tool")
  .version("0.1.0")
  .showHelpAfterError()
  .configureOutput({
    writeOut: (str) => logger.info(str),
    writeErr: (str) => logger.error(str),
  });

registerDomainMessageTypesCommand(program);
registerOpenApiCommand(program);
registerGraphqlCommand(program);

program.parse();
