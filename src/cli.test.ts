/**
 * @license
 * Copyright 2025 cofy-x
 * SPDX-License-Identifier: Apache-2.0
 */

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const tsxCli = path.join(projectRoot, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const pixaCli = path.join(projectRoot, 'src', 'cli.ts');
const sampleImage = path.join(projectRoot, 'examples', 'assets', 'sunrise.png');
const temporaryDirectories: string[] = [];

function runCli(args: string[]) {
  const env = { ...process.env, NO_COLOR: '1' };
  delete env.FORCE_COLOR;

  return spawnSync(process.execPath, [tsxCli, pixaCli, ...args], {
    cwd: projectRoot,
    encoding: 'utf8',
    env,
  });
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    fs.rmSync(directory, { force: true, recursive: true });
  }
});

describe('pixa CLI', () => {
  it('should show help', () => {
    const result = runCli(['--help']);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Usage: pixa');
  });

  it('should write ANSI output for a local image', () => {
    const outputDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'pixa-cli-'));
    temporaryDirectories.push(outputDirectory);

    const result = runCli([sampleImage, '--output', outputDirectory]);
    const outputFile = path.join(outputDirectory, 'sunrise.txt');

    expect(result.status).toBe(0);
    expect(fs.existsSync(outputFile)).toBe(true);
    expect(fs.readFileSync(outputFile, 'utf8')).toContain('▀');
  });

  it('should fail for an invalid local path', () => {
    const result = runCli(['/definitely/not/a/pixa-image.png']);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Invalid source');
  });
});
