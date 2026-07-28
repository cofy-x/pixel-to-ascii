#!/usr/bin/env node

/**
 * @license
 * Copyright 2025 cofy-x
 * SPDX-License-Identifier: Apache-2.0
 */

import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'node:fs';
import path from 'node:path';
import { generateAscii } from './index.js';

// Read package.json to get the version number
const packageJson = JSON.parse(
  fs.readFileSync(new URL('../package.json', import.meta.url), 'utf-8'),
);

const program = new Command();

/**
 * Helper: Extract base filename from path or URL
 * e.g. "path/to/icon.png" -> "icon"
 * e.g. "http://site.com/img/pic.jpg" -> "pic"
 */
function getBaseName(source: string): string {
  try {
    if (source.startsWith('http://') || source.startsWith('https://')) {
      const urlObj = new URL(source);
      const urlPath = urlObj.pathname;
      const base = path.basename(urlPath, path.extname(urlPath));
      return base || 'downloaded-image';
    } else {
      return path.basename(source, path.extname(source));
    }
  } catch {
    return 'output-image';
  }
}

program
  .name('pixa')
  .description('Convert images (File, Dir, URL) into high-fidelity ASCII art.')
  .version(packageJson.version)
  .usage('[options] <source>')
  .argument('[source]', 'Path to image file, directory, or URL')
  .option(
    '-t, --target-height <number>',
    'Target height in lines (exact match only)',
    parseInt,
  )
  .option('-m, --min-height <number>', 'Minimum height in lines', parseInt)
  .option('-M, --max-height <number>', 'Maximum height in lines', parseInt)
  .option(
    '-o, --output <path>',
    'Output directory to save ASCII files (saves as .txt)',
  )
  .option(
    '-p, --print',
    'Force print ASCII to console even when saving to file',
    false,
  )
  .option('-v, --verbose', 'Output verbose progress logging', false)
  .action(async (source, options) => {
    if (!source) {
      program.help();
      return;
    }

    try {
      // 1. Execute Core Logic
      const results = await generateAscii(source, {
        targetHeight: options.targetHeight,
        minHeight: options.minHeight,
        maxHeight: options.maxHeight,
        verbose: options.verbose,
      });

      // 2. Handle Empty Results
      if (results.length === 0) {
        console.log(chalk.yellow('⚠️ No matching images processed.'));
        if (options.targetHeight) {
          console.log(
            chalk.gray(
              `Note: You filtered for exactly ${options.targetHeight} lines.`,
            ),
          );
        }
        return;
      }

      // 3. Logic: Save to File
      if (options.output) {
        const outputDir = options.output;

        // Ensure directory exists
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
          if (options.verbose) {
            console.log(
              chalk.gray(`📂 Created output directory: ${outputDir}`),
            );
          }
        }

        console.log(
          chalk.cyan(`\n💾 Saving ${results.length} files to: ${outputDir}`),
        );

        let savedCount = 0;
        for (const res of results) {
          const baseName = getBaseName(res.source);
          const fileName = `${baseName}.txt`;
          const filePath = path.join(outputDir, fileName);

          // Write file (includes ANSI color codes)
          fs.writeFileSync(filePath, res.ascii, 'utf-8');

          savedCount++;
          if (options.verbose) {
            console.log(chalk.green(`  ✅ Saved: ${fileName}`));
          }
        }

        if (!options.verbose) {
          console.log(
            chalk.green(`✅ Successfully saved ${savedCount} files.`),
          );
        }
      }

      // 4. Logic: Print to Console
      // Print if:
      // a) No output directory is specified (Default behavior)
      // b) Output is specified BUT user explicitly asked to --print
      if (!options.output || options.print) {
        // Add a separator if we just finished saving files
        if (options.output) {
          console.log(chalk.gray('\n--- Console Output below ---\n'));
        }

        results.forEach((res) => {
          // Print header if processing multiple files or if verbose
          if (results.length > 1 || options.verbose || options.output) {
            console.log(
              chalk.bold.white(`\n--- ${res.source} (H:${res.lineCount}) ---`),
            );
          }
          console.log(res.ascii);
        });
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(chalk.red('❌ Error:'), msg);
      process.exit(1);
    }
  });

program.parse();
