import NYC from 'nyc/index.js';
import fs from 'fs';
import path from 'path';

/**
 * Merges raw NYC JSON coverage files into a single JSON file.
 *
 * @param rawDir - Directory containing raw coverage `.json` files.
 * @param outputDir - Directory to write the merged coverage file into.
 * @param fileName - Name of the resulting merged file.
 */
export const handleMerge = async (
  rawDir: string,
  outputDir: string,
  fileName: string
): Promise<void> => {
  const rawPath = path.resolve(rawDir);
  const outputPath = path.resolve(outputDir);
  const outputFile = path.join(outputPath, fileName);

  const nyc = new NYC({
    tempDirectory: outputPath,
    cwd: process.cwd(),
    silent: true,
  });

  const merged = await nyc.getCoverageMapFromAllCoverageFiles(rawPath);

  fs.mkdirSync(outputPath, { recursive: true });
  fs.writeFileSync(outputFile, JSON.stringify(merged, null, 2));

  console.log(`✅ Merged coverage written to: ${outputFile}`);
};

/**
 * Generates a coverage report from merged NYC JSON coverage data.
 *
 * @param tempDir - Directory containing the merged coverage `.json`.
 * @param reportDir - Output directory for the generated coverage report.
 * @param reporters - Array of reporter formats to generate (e.g., 'html', 'text').
 * @param excludeAfterRemap - Whether to exclude files after remapping via source maps.
 */
export const handleReport = async (
  tempDir: string,
  reportDir: string,
  reporters: string[],
  excludeAfterRemap: boolean
): Promise<void> => {
  const nyc = new NYC({
    tempDirectory: path.resolve(tempDir),
    reportDir: path.resolve(reportDir),
    reporter: reporters,
    excludeAfterRemap,
    cwd: process.cwd(),
    silent: true,
  });

  await nyc.report();
  console.log(`📄 Report generated in: ${reportDir}`);
};
