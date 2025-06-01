import fs from 'fs/promises';
import path from 'path';
import fastglob from 'fast-glob';

import { cliDefaults } from './defaults.js';

/**
 * Gathers all `coverage.json` files from directories matched by glob patterns
 * and copies them into a common output directory (`coverage/raw`) with unique filenames.
 *
 * @param sourcePath - Root directory from which glob patterns should be resolved.
 * @param folderPatterns - Glob patterns for directories to search for `coverage.json` files.
 * @param destinationPath - Output directory for the collected coverage files.
 */
export const handleGather = async (
  destinationPath: string = cliDefaults.gather.destinationPath,
  fileType: string = cliDefaults.gather.fileType,
  folderPatterns: string[] = cliDefaults.gather.folderPatterns,
  sourcePath: string = cliDefaults.gather.sourcePath,
): Promise<void> => {
  const cwd = process.cwd();

  const sourceDir = sourcePath !== cwd
    ? path.resolve(cwd, sourcePath)
    : cwd;

  const patterns = folderPatterns.map(fp => `${fp}/${fileType}`);

  console.log(`🔍 Gathering from: ${sourceDir} (${cwd})`);
  console.log(`🔍 Looking for: ${patterns.join()}`);

  try {
    await fs.mkdir(destinationPath, { recursive: true });

    const allDirectories: string[] = [];
    const coverageFiles: string[] = [];

    const matches = await fastglob([
      '!**/node_modules',
      ...patterns,
    ], {
      cwd: sourceDir,
      onlyFiles: true,
      absolute: true,
      followSymbolicLinks: false,
      suppressErrors: true,
    });

    for (const match of matches) {
      allDirectories.push(match);

      try {
        await fs.access(match);

        coverageFiles.push(match);

        const relativeMatchFilePath = path.relative(cwd, match);
        const destinationFileName = path.relative(cwd, match)
          .replaceAll('../','')
          .replaceAll('/', '-')
          .replace('-coverage-', '-')
          .replace('-unit-unit.', '.unit.')
          .replace('-integration-integration.', '.integration.');

        const relativeDestinationFilePath = path.join(destinationPath, destinationFileName);
        const destinationFilePath = path.join(cwd, relativeDestinationFilePath);

        console.log(`✅ Found: ${relativeMatchFilePath} > ${relativeDestinationFilePath}`);
        await fs.copyFile(match, destinationFilePath);
      } catch {
        // Skip if coverage.json doesn't exist
      }
    }

    if (coverageFiles.length > 0) {
      console.log(`📦 Gathered ${coverageFiles.length} into: ${destinationPath}\n`);
    } else {
      console.log(`⚠️  No coverage.json files found.`);
    }

  } catch (error) {
    console.error('❌ Error collecting coverage files:', error);
  }
};
