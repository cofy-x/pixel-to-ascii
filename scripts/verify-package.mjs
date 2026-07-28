/**
 * @license
 * Copyright 2025 cofy-x
 * SPDX-License-Identifier: Apache-2.0
 */

import { execFileSync } from 'node:child_process';

const output = execFileSync(
  'npm',
  ['pack', '--dry-run', '--json', '--ignore-scripts'],
  { encoding: 'utf8' },
);
const [{ files }] = JSON.parse(output);
const paths = files.map((file) => file.path);
const allowedRoots = new Set([
  'CHANGELOG.md',
  'LICENSE',
  'README.md',
  'dist',
  'package.json',
]);
const requiredPaths = [
  'CHANGELOG.md',
  'LICENSE',
  'README.md',
  'dist/cli.js',
  'dist/index.d.ts',
  'dist/index.js',
  'package.json',
];

for (const filePath of paths) {
  const [root] = filePath.split('/');
  if (!allowedRoots.has(root)) {
    throw new Error(`Unexpected file in npm package: ${filePath}`);
  }
}

for (const requiredPath of requiredPaths) {
  if (!paths.includes(requiredPath)) {
    throw new Error(`Required file missing from npm package: ${requiredPath}`);
  }
}

console.log(`Verified ${paths.length} files in the npm package.`);
