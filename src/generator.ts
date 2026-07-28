/**
 * @license
 * Copyright 2025 cofy-x
 * SPDX-License-Identifier: Apache-2.0
 */

import { Jimp } from 'jimp';
import chalk from 'chalk';
import fs from 'node:fs';
import path from 'node:path';
import { intToRGBA } from './utils.js';
import type { AsciiResult, GenerateOptions } from './types.js';

/**
 * Internal function to process a single Jimp image instance into ASCII.
 * Explicitly typed 'image' instead of any.
 */
function processBitmapToAscii(
  image: Awaited<ReturnType<typeof Jimp.read>>,
): string {
  const width = image.bitmap.width;
  const height = image.bitmap.height;
  let ascii = '';

  for (let y = 0; y < height; y += 2) {
    let line = '';
    for (let x = 0; x < width; x++) {
      const topColor = intToRGBA(image.getPixelColor(x, y));

      let bottomColor = { r: 0, g: 0, b: 0, a: 0 };
      if (y + 1 < height) {
        bottomColor = intToRGBA(image.getPixelColor(x, y + 1));
      }

      const topVisible = topColor.a > 0;
      const bottomVisible = bottomColor.a > 0;

      if (!topVisible && !bottomVisible) {
        line += ' '; // Transparent
      } else if (topVisible && !bottomVisible) {
        // Only top pixel visible -> Upper half block
        line += chalk.rgb(topColor.r, topColor.g, topColor.b)('▀');
      } else if (!topVisible && bottomVisible) {
        // Only bottom pixel visible -> Lower half block
        line += chalk.rgb(bottomColor.r, bottomColor.g, bottomColor.b)('▄');
      } else {
        // Both visible -> Top color fg, Bottom color bg, Upper block char
        line += chalk
          .rgb(topColor.r, topColor.g, topColor.b)
          .bgRgb(bottomColor.r, bottomColor.g, bottomColor.b)('▀');
      }
    }
    ascii += line + '\n';
  }
  return ascii;
}

/**
 * Validates if the current height meets the criteria defined in options.
 */
function isHeightValid(
  currentHeight: number,
  options: GenerateOptions,
): boolean {
  const { targetHeight, minHeight, maxHeight } = options;

  // 1. Exact match strategy
  if (targetHeight !== undefined) {
    return currentHeight === targetHeight;
  }

  // 2. Range strategy
  if (minHeight !== undefined && currentHeight < minHeight) {
    return false;
  }

  if (maxHeight !== undefined && currentHeight > maxHeight) {
    return false;
  }

  return true;
}

/**
 * Main entry point to generate ASCII art.
 * @param source - Can be a file path, a directory path, or a URL.
 * @param options - Configuration options.
 */
export async function generateAscii(
  source: string,
  options: GenerateOptions = {},
): Promise<AsciiResult[]> {
  const { verbose } = options;
  const results: AsciiResult[] = [];

  let sourcesToProcess: string[] = [];

  // 1. Determine Input Type
  try {
    if (source.startsWith('http://') || source.startsWith('https://')) {
      // URL processing
      sourcesToProcess = [source];
      if (verbose) {
        console.log(chalk.blue(`🌐 Processing URL: ${source}`));
      }
    } else {
      // File System processing
      const stats = fs.statSync(source);
      if (stats.isDirectory()) {
        const files = fs.readdirSync(source);
        // Filter for common image extensions
        sourcesToProcess = files
          .filter((f) => /\.(png|jpeg|jpg|bmp)$/i.test(f))
          .map((f) => path.join(source, f));

        if (verbose) {
          console.log(
            chalk.blue(
              `📂 Processing Directory: ${source} (${sourcesToProcess.length} images)`,
            ),
          );
        }
      } else if (stats.isFile()) {
        sourcesToProcess = [source];
        if (verbose) {
          console.log(chalk.blue(`📄 Processing File: ${source}`));
        }
      }
    }
  } catch (err: unknown) {
    // Safer error handling than 'any'
    const errorMessage = err instanceof Error ? err.message : String(err);
    throw new Error(`Invalid source: ${errorMessage}`, { cause: err });
  }

  // 2. Process Loop
  for (const src of sourcesToProcess) {
    try {
      if (verbose) {
        process.stdout.write(`⏳ Reading ${path.basename(src)}... `);
      }

      const image = await Jimp.read(src);

      // Auto-crop to remove transparent borders
      image.autocrop();

      const height = image.bitmap.height;
      const currentLineCount = Math.ceil(height / 2);

      // Check validation logic
      if (!isHeightValid(currentLineCount, options)) {
        if (verbose) {
          console.log(chalk.gray(`Skipped (H:${currentLineCount})`));
        }
        continue;
      }

      const ascii = processBitmapToAscii(image);

      results.push({
        source: src,
        ascii,
        lineCount: currentLineCount,
        originalWidth: image.bitmap.width,
        originalHeight: image.bitmap.height,
      });

      if (verbose) {
        console.log(chalk.green(`Done!`));
      }
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (verbose) {
        console.error(chalk.red(`\n❌ Failed to process ${src}: ${errorMsg}`));
      }
    }
  }

  return results;
}
