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
import { Jimp } from 'jimp';

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

  it('should print exactly one trailing newline', () => {
    const result = runCli([sampleImage]);

    expect(result.status).toBe(0);
    expect(result.stdout.endsWith('\n')).toBe(true);
    expect(result.stdout.endsWith('\n\n')).toBe(false);
  });

  it('should write ANSI output for a local image', () => {
    const outputDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'pixa-cli-'));
    temporaryDirectories.push(outputDirectory);

    const result = runCli([sampleImage, '--output', outputDirectory]);
    const outputFile = path.join(outputDirectory, 'sunrise.txt');

    expect(result.status).toBe(0);
    expect(fs.existsSync(outputFile)).toBe(true);
    const output = fs.readFileSync(outputFile, 'utf8');
    expect(output).toContain('▀');
    expect(output).toContain('\x1b[38;2;');
  });

  it('should resize pixel art to the requested width', () => {
    const outputDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'pixa-cli-'));
    temporaryDirectories.push(outputDirectory);

    const result = runCli([
      sampleImage,
      '--width',
      '16',
      '--pixelated',
      '--output',
      outputDirectory,
    ]);
    const output = fs.readFileSync(
      path.join(outputDirectory, 'sunrise.txt'),
      'utf8',
    );
    const escape = String.fromCharCode(27);
    const plainOutput = output.replaceAll(
      new RegExp(`${escape}\\[[0-9;]*m`, 'g'),
      '',
    );

    expect(result.status).toBe(0);
    expect(
      Math.max(
        ...plainOutput
          .trimEnd()
          .split('\n')
          .map((line) => line.length),
      ),
    ).toBe(16);
  });

  it('should crop transparent sides when artwork touches an edge', async () => {
    const inputDirectory = fs.mkdtempSync(
      path.join(os.tmpdir(), 'pixa-input-'),
    );
    const outputDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'pixa-cli-'));
    temporaryDirectories.push(inputDirectory, outputDirectory);

    const inputFile = path.join(inputDirectory, 'edge.png');
    const image = new Jimp({ width: 8, height: 8, color: 0x11223308 });
    for (let y = 2; y <= 5; y++) {
      for (let x = 0; x <= 3; x++) {
        image.setPixelColor(0x3366ccff, x, y);
      }
    }
    await image.write(inputFile);

    const result = runCli([inputFile, '--output', outputDirectory]);
    const output = fs.readFileSync(
      path.join(outputDirectory, 'edge.txt'),
      'utf8',
    );
    const escape = String.fromCharCode(27);
    const plainOutput = output.replaceAll(
      new RegExp(`${escape}\\[[0-9;]*m`, 'g'),
      '',
    );
    const lines = plainOutput.trimEnd().split('\n');

    expect(result.status).toBe(0);
    expect(lines).toHaveLength(2);
    expect(Math.max(...lines.map((line) => line.length))).toBe(4);
  });

  it('should preserve files with duplicate base names in one batch', async () => {
    const inputDirectory = fs.mkdtempSync(
      path.join(os.tmpdir(), 'pixa-input-'),
    );
    const outputDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'pixa-cli-'));
    temporaryDirectories.push(inputDirectory, outputDirectory);

    const image = new Jimp({ width: 2, height: 2, color: 0x3366ccff });
    await image.write(path.join(inputDirectory, 'same-2.png'));
    await image.write(path.join(inputDirectory, 'same.jpg'));
    await image.write(path.join(inputDirectory, 'Same.png'));

    const result = runCli([inputDirectory, '--output', outputDirectory]);

    expect(result.status).toBe(0);
    expect(fs.readdirSync(outputDirectory).sort()).toEqual([
      'Same-3.txt',
      'same-2.txt',
      'same.txt',
    ]);
  });

  it('should fail for an invalid local path', () => {
    const result = runCli(['/definitely/not/a/pixa-image.png']);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Invalid source');
  });

  it('should reject partially numeric option values', () => {
    const result = runCli([sampleImage, '--width', '16px']);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Expected an integer');
  });
});
