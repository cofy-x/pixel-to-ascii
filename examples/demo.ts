/**
 * @license
 * Copyright 2025 cofy-x
 * SPDX-License-Identifier: Apache-2.0
 */

import { generateAscii } from '../src/index.js';
import chalk from 'chalk';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, '..');
const ASSETS_DIR = join(PROJECT_ROOT, 'examples', 'assets');
const SUNRISE_IMAGE = join(ASSETS_DIR, 'sunrise.png');

async function main() {
  console.log(chalk.bold.yellow('🚀 Pixel-to-ASCII Library Demo\n'));

  // --- Example 1: Process a single local image ---
  console.log(chalk.cyan('1. Processing the bundled sunrise image:'));
  try {
    const results = await generateAscii(SUNRISE_IMAGE, { verbose: true });

    if (results.length > 0) {
      console.log(results[0].ascii);
    }
  } catch (e) {
    console.error('URL Error:', e);
  }

  // --- Example 2: Process a Local Directory with Filtering ---
  const localDir = ASSETS_DIR;

  // Fake check to see if directory exists for this demo

  if (fs.existsSync(localDir)) {
    console.log(chalk.cyan(`\n2. Processing directory '${localDir}':`));

    const icons = await generateAscii(localDir, {
      verbose: true,
    });

    console.log(
      chalk.green(
        `\nGenerated ${icons.length} image${icons.length === 1 ? '' : 's'}.`,
      ),
    );

    // Display first 3 results
    icons.slice(0, 3).forEach((icon) => {
      console.log(chalk.white(`\n--- ${icon.source} ---`));
      console.log(icon.ascii);
    });
  } else {
    console.log(
      chalk.gray(
        `\n(Skipping directory demo: '${ICONS_DIR}' folder not found locally)`,
      ),
    );
  }
}

void main().catch(console.error);
