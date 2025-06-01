import colors from 'colors-cli/safe';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import prettier from 'prettier';

/**
 * Retrieves the value of a command-line argument (e.g., --key=value).
 *
 * @param key - The name of the CLI argument to retrieve.
 * @returns The argument value if present (as string), `true` if flag-only, or `null` if missing.
 */
export const argv = (key: string): string | boolean | null => {
  if (process.argv.includes(`--${key}`)) return true;
  const value = process.argv.find(arg => arg.startsWith(`--${key}=`));
  if (!value) return null;
  return value.replace(`--${key}=`, '');
};

/**
 * Ensures a required CLI argument is present, or exits the process with an error.
 *
 * @param arg - The name of the required CLI argument.
 * @returns The argument value if provided.
 */
export const requiredArg = (arg: string): string => {
  const value = argv(arg);
  if (typeof value === 'string') return value;

  console.error(`please provide a --${arg}=... option`);
  process.exit(1);
};

/**
 * Loads the contents of a file as a string.
 *
 * @param schema - Path to the file to read.
 * @returns File contents as a UTF-8 string.
 */
export const loadDefinitions = (schema: string): string =>
  fs.readFileSync(schema, 'utf-8');

/**
 * Converts a snake_case or kebab-case string to camelCase.
 *
 * @param str - The input string in snake_case or kebab-case.
 * @returns The camelCase version of the string.
 */
export const snakeToCamel = (str: string): string =>
  str
    .toLowerCase()
    .replace(/([-_][a-z])/g, group =>
      group.toUpperCase().replace('-', '').replace('_', '')
    );

/**
 * Converts a snake_case or kebab-case string to a PascalCase class name.
 *
 * @param str - The input string.
 * @returns The PascalCase class name.
 */
export const toClassName = (str: string): string => {
  const name = snakeToCamel(str);
  return name.charAt(0).toUpperCase() + name.slice(1);
};

/**
 * Simplifies a channel name by removing path-like or templated elements.
 *
 * @param channel - The original channel string (e.g., '/foo/{id}').
 * @returns A cleaned version with slashes and template tokens removed.
 */
export const getBaseChannelName = (channel: string): string =>
  channel.replace(/{.*}/g, '').replace(/\//g, '').replace(/^-/g, '');

/**
 * Formats a string into a comment-friendly block that wraps at `maxWidth` columns.
 *
 * @param str - The input string to format.
 * @param maxWidth - The maximum line width before inserting a line break.
 * @returns A formatted block comment string.
 */
export const formatStringBlockComment = (str: string, maxWidth: number): string =>
  str
    .split(' ')
    .reduce((acc, word) => {
      // Append word and check if the last line exceeds max width
      let newAcc = acc + ' ' + word;
      const lines = newAcc.split('\n');
      const lastLine = lines[lines.length - 1];

      // Insert a new line with comment padding if width exceeded
      if (lastLine.length > maxWidth) {
        newAcc += '\n   *';
      }

      return newAcc;
    }, '')
    .slice(1); // Remove leading space from first word

/**
 * Logs a formatted message to the console with a consistent prefix and color.
 *
 * @param message - The message to log.
 */
export const logger = (message: string): void => {
  console.info(`${colors.green('INFO:')} [${colors.blue_bt('asyncapi')}] ${message}`);
};

/**
 * Formats TypeScript code using Prettier and appends it to the specified output file.
 * If the file does not exist, it will be created.
 *
 * @param output - Path to the file where the formatted code should be written.
 * @param codeToAppend - The raw TypeScript code to format and write.
 */
export const appendOutput = async (
  output: string,
  codeToAppend: string
): Promise<void> => {
  const formatted = prettier.format(codeToAppend, { parser: 'babel-ts' });

  // Ensure the directory exists
  const dir = path.dirname(output);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Ensure the file exists
  if (!fs.existsSync(output)) {
    fs.writeFileSync(output, '');
  }

  fs.appendFileSync(output, formatted + '\n');
};
