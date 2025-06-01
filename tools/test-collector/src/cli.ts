#!/usr/bin/env tsx

import { Command } from 'commander';

import { cliDefaults } from './defaults.js';
import { handleGather } from './gather.js';
import { handleMerge, handleReport } from './mergeReport.js';


const program = new Command();

program
  .name('test-collector')
  .description('Gathers and merges code coverage reports')
  .version('1.0.0');

program
  .command('gather')
  .description('Gather coverage.json files from multiple folders')
  .option(
    '-d, --destination <path>',
    'Output directory for collected coverage files',
    cliDefaults.gather.destinationPath,
  )
  .option(
    '-f, --fileType <string>',
    'File type to look for',
   cliDefaults.gather.fileType,
  )
  .option(
    '-p, --patterns <patterns...>',
    'Glob folder patterns for folders to scan (ignores node_modules)',
    cliDefaults.gather.folderPatterns,
  )
  .option(
    '-s, --source <path>',
    'Source directory to gather coverage files from',
    cliDefaults.gather.sourcePath,
  )
  .action(async ({ destination, fileType, patterns, source }) => {
    await handleGather(destination, fileType, patterns, source);
  });

program
  .command('merge')
  .description('Merge raw coverage files into a single file')
  .option('-r, --rawDir <path>', 'Directory containing raw coverage files', 'coverage/raw')
  .option('-o, --outputDir <path>', 'Output directory for merged coverage', 'coverage/merged')
  .option('-f, --file <name>', 'Filename for merged coverage', 'coverage-final.json')
  .action(async (opts) => {
    await handleMerge(opts.rawDir, opts.outputDir, opts.file);
  });

program
  .command('report')
  .description('Generate a coverage report from merged coverage files')
  .option('-t, --tempDir <path>', 'Directory containing merged coverage', 'coverage/merged')
  .option('-o, --reportDir <path>', 'Output directory for coverage report', 'coverage/report')
  .option('-r, --reporter <type...>', 'Reporter types (html, text, lcov, json)', ['lcov'])
  .option('--excludeAfterRemap <bool>', 'Exclude files after source map remap', 'false')
  .action(async (opts) => {
    await handleReport(opts.tempDir, opts.reportDir, opts.reporter, opts.excludeAfterRemap === 'true');
  });

program.parse(process.argv);
