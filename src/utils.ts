/**
 * @license
 * Copyright 2025 cofy-x
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Converts a 32-bit integer color (0xRRGGBBAA) to an RGBA object.
 */
export function intToRGBA(hex: number) {
  return {
    r: (hex >>> 24) & 0xff,
    g: (hex >>> 16) & 0xff,
    b: (hex >>> 8) & 0xff,
    a: hex & 0xff,
  };
}
