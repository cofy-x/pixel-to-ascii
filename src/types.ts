/**
 * @license
 * Copyright 2025 cofy-x
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Interface for the output result
 */
export interface AsciiResult {
  source: string;
  ascii: string;
  lineCount: number;
  originalWidth: number;
  originalHeight: number;
}

export interface GenerateOptions {
  /**
   * Resize the cropped image to this many terminal columns before rendering.
   * The aspect ratio is preserved.
   */
  width?: number;

  /**
   * Use nearest-neighbor resizing when width is set.
   * This is useful for pixel art and other hard-edged source images.
   */
  pixelated?: boolean;

  /**
   * Pixels with alpha below this value are treated as transparent.
   * Must be an integer from 1 to 255. Defaults to 16.
   */
  alphaThreshold?: number;

  /**
   * Exact height match. If set, this takes precedence over min/max height.
   * Only images producing ASCII art of exactly this line count are returned.
   */
  targetHeight?: number;

  /**
   * Minimum height (inclusive).
   * Only images with line count >= minHeight are returned.
   */
  minHeight?: number;

  /**
   * Maximum height (inclusive).
   * Only images with line count <= maxHeight are returned.
   */
  maxHeight?: number;

  /**
   * If true, logs progress to the console.
   */
  verbose?: boolean;
}
