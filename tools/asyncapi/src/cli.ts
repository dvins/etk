import color from 'colors-cli/safe';
import fs from 'node:fs/promises';
import path from 'node:path';

import { generate, parseSchema } from './generate';
import { logger, requiredArg } from './utils';

/**
 * Recursively yields all file paths from a given directory.
 *
 * @param dir - The root directory to scan.
 * @yields Absolute paths to files found in the directory tree.
 */
const getFiles = async function* (dir: string): AsyncGenerator<string> {
  const dirents = await fs.readdir(dir, { withFileTypes: true });

  for (const dirent of dirents) {
    const res = path.resolve(dir, dirent.name);
    if (dirent.isDirectory()) {
      yield* getFiles(res); // recursively yield files in subdirectories
    } else {
      yield res;
    }
  }
};

/**
 * Entrypoint for the AsyncAPI code generation CLI.
 *
 * Reads schema and output paths from CLI args,
 * logs inputs, loads schema, and triggers code generation.
 */
const main = async (): Promise<void> => {
  logger(color.white_bt('AsyncAPI code generation initializing'));

  const output = requiredArg('output');
  const schema = requiredArg('schema');

  const schemaFile = path.resolve(schema);
  const dataPath = path.dirname(schemaFile);

  logger(`  schema: ${color.magenta.italic(schema)}`);
  logger(`    path: ${color.magenta.italic(schemaFile)}`);
  logger(`  data[]: ${color.magenta.italic(dataPath)}`);

  // Log all files under the data directory
  for await (const f of getFiles(dataPath)) {
    const file = path.resolve(f);
    const dirname = path.dirname(file);
    const basename = path.basename(file);
    logger(`          ${color.magenta.italic.faint(dirname)}/${color.magenta.italic(basename)}`);
  }

  logger(`  output: ${color.magenta.italic(output)}`);
  logger(color.white_bt('AsyncAPI code generation starting'));

  const parsedSchema = await parseSchema(schemaFile, output);
  await generate(parsedSchema, output);

  logger(color.white_bt('AsyncAPI code generation completed'));
};

// Run the CLI
main().catch((err) => {
  console.error(color.red_bt('AsyncAPI code generation failed:'), err);
  process.exit(1);
});
