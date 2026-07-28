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
