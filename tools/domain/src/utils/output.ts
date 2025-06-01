import path from "path";
import { writeFileSync, existsSync, mkdirSync } from "fs";
import { DateTime } from "luxon";
import Prettier from "prettier";

export interface GeneratedContent {
  content: string;
  key?: string;
}

/**
 * Generates an appropriately commented header for a generated TypeScript file
 * from a banner and any additional errata such as a copyright.
 */
export const generateFileHeader = (artifact: string, errata?: string) => {
  const banner = ``.replaceAll("\n    ", "\n");

  const generatedAt = DateTime.now().toISO();
  const artifactInfo = `Schema Artifact: *${artifact}*`;
  const timestampInfo = `Generated at:    *${generatedAt}*`;

  const bareHeader = `${banner}\n${
    errata ? errata + "\n" : ""
  }\n${artifactInfo}\n${timestampInfo}\n`;

  // We need to prefix every line with a comment identifier
  const commentedHeader = bareHeader
    .split("\n")
    .map((line) => (line.length > 1 ? ` ${line}\n` : `\n`))
    .join(" *");

  return `/**\n *${commentedHeader} */\n`;
};

/**
 * @private
 * Internal function to output a text file.
 */
const writeFile = (
  contentType: "json" | "typescript" | "yaml" | "unknown",
  outputFile: string,
  output: string
) => {
  const outputDir = path.resolve(path.dirname(outputFile));
  if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });

  const outputPath = path.resolve(outputFile);
  writeFileSync(outputPath, output);
};

/**
 * User Prettier to beautify the TypeScript content provided
 */
export const beautifyTypeScript = (content: string) => {
  const options: Prettier.Options = {
    // Per https://prettier.io/docs/en/options.html#parser
    // `babel-ts` might support JavaScript features (proposals) not yet supported by
    // TypeScript, but it’s less permissive when it comes to invalid code and less
    // battle-tested than the `typescript` parser.
    parser: "babel-ts",
    printWidth: 120,
    singleQuote: true,
    singleAttributePerLine: true,
    tabWidth: 2,
    trailingComma: "all",
    useTabs: false,
  };

  return Prettier.format(content, options);
};

/**
 * Output generated content to a TypesScript file
 */
export const writeTypeScriptFile = (
  outputFile: string,
  contents: GeneratedContent[],
  options: {
    beautify: boolean;
  } = { beautify: true }
) => {
  const header = generateFileHeader(outputFile, "");

  const output = contents
    .map((c) => (options.beautify ? beautifyTypeScript(c.content) : c.content))
    .join("\n");

  const outputWithHeader = `${header}\n${output}\n`;

  writeFile("typescript", outputFile, outputWithHeader);
};

/**
 * Output generated content to a JSON file
 */
export const writeJsonFile = (
  outputFile: string,
  content: GeneratedContent
) => {
  writeFile("json", outputFile, content.content);
};

/**
 * Output generated content to a JSON file
 */
export const writeYamlFile = (
  outputFile: string,
  content: GeneratedContent
) => {
  writeFile("yaml", outputFile, content.content);
};
