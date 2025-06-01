import { default as color } from "colors-cli/safe";
import fastglob from 'fast-glob';
import fs from "fs";
import path from "path";

import { logger, withFileLink } from "../../utils/logger";

export * from "./generate";

export type Options = {
  schema: string;
  output: string;
  srcs: string[];
};

export const initialize = async (schema: string, srcDir: string) => {
  const schemaFile = path.resolve(schema);
  const dataPath = path.dirname(schemaFile);

  logger.info(`  Schema: ${color.magenta.italic(schema)}`);
  logger.info(`    Path: ${color.magenta.italic(schemaFile)}`);
  logger.info(`  Data[]: ${color.magenta.italic(dataPath)}`);

  const dataFiles = await fastglob(["**/*.ts", "!**/*.test.ts"], { cwd: srcDir});

  dataFiles.map((f) => {
    const file = path.resolve(srcDir, f);
    const dirname = path.dirname(file).replace(dataPath, "  ~");
    const basename = path.basename(file);
    const displayPath = `          ${color.magenta.italic.faint(
      dirname
    )}/${color.magenta.italic(basename)}`;

    fs.existsSync(file)
      ? logger.info(displayPath)
      : logger.error(`${displayPath} ${color.red("**MISSING**")}`);
  });
};

export const wrapUp = async (output: string) => {
  const outputPath = path.dirname(output);
  logger.info(
    color.green.bold(
      `Generated Output: ${withFileLink(
        color.green.bold.underline(outputPath)
      )}`
    )
  );
};
