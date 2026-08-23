/**
 * @license
 * Copyright 2025 cofy-x
 * SPDX-License-Identifier: Apache-2.0
 */

import { Jimp, ResizeStrategy } from 'jimp';
import chalk, { Chalk } from 'chalk';
import fs from 'node:fs';
import path from 'node:path';
import { intToRGBA } from './utils.js';
import type { AsciiResult, GenerateOptions } from './types.js';

const DEFAULT_ALPHA_THRESHOLD = 16;
const ansi = new Chalk({ level: 3 });

function validatePositiveInteger(value: number, name: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive integer`);
  }
}

function validateOptions(options: GenerateOptions): void {
  const {
    maxHeight,
    minHeight,
    pixelated = false,
    targetHeight,
    width,
  } = options;

  for (const [name, value] of [
    ['width', width],
    ['targetHeight', targetHeight],
    ['minHeight', minHeight],
    ['maxHeight', maxHeight],
  ] as const) {
    if (value !== undefined) {
      validatePositiveInteger(value, name);
    }
  }

  if (
    minHeight !== undefined &&
    maxHeight !== undefined &&
    minHeight > maxHeight
  ) {
    throw new RangeError('minHeight must be less than or equal to maxHeight');
  }

  if (pixelated && width === undefined) {
    throw new RangeError('pixelated requires width');
  }
}

function resolveAlphaThreshold(value: number | undefined): number {
  const threshold = value ?? DEFAULT_ALPHA_THRESHOLD;

  if (!Number.isInteger(threshold) || threshold < 1 || threshold > 255) {
    throw new RangeError('alphaThreshold must be an integer from 1 to 255');
  }

  return threshold;
}

function clearLowAlphaPixels(
  image: Awaited<ReturnType<typeof Jimp.read>>,
  alphaThreshold: number,
): void {
  const data = image.bitmap.data;

  for (let index = 3; index < data.length; index += 4) {
    if (data[index] < alphaThreshold) {
      data.fill(0, index - 3, index + 1);
    }
  }
}

function cropTransparentBorders(
  image: Awaited<ReturnType<typeof Jimp.read>>,
  alphaThreshold: number,
): boolean {
  const { data, height, width } = image.bitmap;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = data[(y * width + x) * 4 + 3];

      if (alpha >= alphaThreshold) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (maxX < 0 || maxY < 0) {
    image.crop({ x: 0, y: 0, w: 1, h: 1 });
    return false;
  }

  const croppedWidth = maxX - minX + 1;
  const croppedHeight = maxY - minY + 1;

  if (
    minX !== 0 ||
    minY !== 0 ||
    croppedWidth !== width ||
    croppedHeight !== height
  ) {
    image.crop({
      x: minX,
      y: minY,
      w: croppedWidth,
      h: croppedHeight,
    });
  }

  return true;
}

/**
 * Internal function to process a single Jimp image instance into ASCII.
 * Explicitly typed 'image' instead of any.
 */
function processBitmapToAscii(
  image: Awaited<ReturnType<typeof Jimp.read>>,
  alphaThreshold: number,
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

      const topVisible = topColor.a >= alphaThreshold;
      const bottomVisible = bottomColor.a >= alphaThreshold;

      if (!topVisible && !bottomVisible) {
        line += ' '; // Transparent
      } else if (topVisible && !bottomVisible) {
        // Only top pixel visible -> Upper half block
        line += ansi.rgb(topColor.r, topColor.g, topColor.b)('▀');
      } else if (!topVisible && bottomVisible) {
        // Only bottom pixel visible -> Lower half block
        line += ansi.rgb(bottomColor.r, bottomColor.g, bottomColor.b)('▄');
      } else {
        // Both visible -> Top color fg, Bottom color bg, Upper block char
        line += ansi
          .rgb(topColor.r, topColor.g, topColor.b)
          .bgRgb(
            bottomColor.r,
            bottomColor.g,
            bottomColor.b,
          )('▀');
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
  const { pixelated = false, verbose, width } = options;
  validateOptions(options);
  const alphaThreshold = resolveAlphaThreshold(options.alphaThreshold);

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
          .sort((a, b) => a.localeCompare(b))
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
      const originalWidth = image.bitmap.width;
      const originalHeight = image.bitmap.height;

      // Remove near-transparent edge noise before cropping.
      clearLowAlphaPixels(image, alphaThreshold);

      // Crop each transparent side independently, including when the subject
      // touches one or more image edges.
      const hasVisiblePixels = cropTransparentBorders(image, alphaThreshold);

      if (
        hasVisiblePixels &&
        width !== undefined &&
        image.bitmap.width !== width
      ) {
        image.resize({
          w: width,
          mode: pixelated
            ? ResizeStrategy.NEAREST_NEIGHBOR
            : ResizeStrategy.BILINEAR,
        });

        // Resampling can create new low-alpha edge pixels.
        clearLowAlphaPixels(image, alphaThreshold);
      }

      const height = image.bitmap.height;
      const currentLineCount = Math.ceil(height / 2);

      // Check validation logic
      if (!isHeightValid(currentLineCount, options)) {
        if (verbose) {
          console.log(chalk.gray(`Skipped (H:${currentLineCount})`));
        }
        continue;
      }

      const ascii = processBitmapToAscii(image, alphaThreshold);

      results.push({
        source: src,
        ascii,
        lineCount: currentLineCount,
        originalWidth,
        originalHeight,
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
