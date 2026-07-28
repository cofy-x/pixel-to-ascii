/**
 * @license
 * Copyright 2025 cofy-x
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateAscii } from './generator.js';
import fs from 'node:fs';
import { Jimp } from 'jimp';

// --- Mocks ---
// 1. Mock 'node:fs' to simulate file system operations
vi.mock('node:fs');

// 2. Mock 'jimp' to simulate image processing without real images
vi.mock('jimp', () => ({
  Jimp: {
    read: vi.fn(),
  },
}));

// Helper to create a mock Jimp image instance
const createMockImage = (
  width: number,
  height: number,
  colorAt: (x: number, y: number) => number = () => 0xffffffff,
) => ({
  bitmap: { width, height },
  autocrop: vi.fn().mockReturnThis(), // allow chaining
  getPixelColor: vi.fn(colorAt),
});

describe('generateAscii', () => {
  // Clear mocks after each test to ensure isolation
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Input Source Handling', () => {
    it('should process a single local file', async () => {
      // Mock fs.statSync to say "this is a file"
      vi.mocked(fs.statSync).mockReturnValue({
        isFile: () => true,
        isDirectory: () => false,
      } as unknown as fs.Stats);

      // Mock Jimp to return a 10x10 image
      vi.mocked(Jimp.read).mockResolvedValue(
        createMockImage(10, 10) as unknown as Awaited<
          ReturnType<typeof Jimp.read>
        >,
      );

      const results = await generateAscii('test.png');

      expect(results).toHaveLength(1);
      expect(results[0].source).toBe('test.png');
      expect(results[0].lineCount).toBe(5); // 10px height / 2 = 5 lines
      expect(Jimp.read).toHaveBeenCalledWith('test.png');
    });

    it('should process a directory and filter for images', async () => {
      // Mock fs.statSync to say "this is a directory"
      vi.mocked(fs.statSync).mockReturnValue({
        isFile: () => false,
        isDirectory: () => true,
      } as unknown as fs.Stats);

      // Mock fs.readdirSync to return a mix of files
      vi.mocked(fs.readdirSync).mockReturnValue([
        'icon.png',
        'photo.jpg',
        'notes.txt',
        '.DS_Store',
      ] as unknown as ReturnType<typeof fs.readdirSync>);

      vi.mocked(Jimp.read).mockResolvedValue(
        createMockImage(10, 10) as unknown as Awaited<
          ReturnType<typeof Jimp.read>
        >,
      );

      const results = await generateAscii('./images');

      // Should check only png and jpg
      expect(results).toHaveLength(2);
      expect(results.map((r) => r.source)).toEqual(
        expect.arrayContaining(['images/icon.png', 'images/photo.jpg']),
      );
    });

    it('should process a URL', async () => {
      const url = 'https://example.com/sprite.png';
      vi.mocked(Jimp.read).mockResolvedValue(
        createMockImage(20, 20) as unknown as Awaited<
          ReturnType<typeof Jimp.read>
        >,
      );

      const results = await generateAscii(url);

      expect(results).toHaveLength(1);
      expect(results[0].source).toBe(url);
      expect(fs.statSync).not.toHaveBeenCalled(); // URL shouldn't check file system
    });
  });

  describe('Height Filtering Logic', () => {
    beforeEach(() => {
      // Default: File setup for filtering tests
      vi.mocked(fs.statSync).mockReturnValue({
        isFile: () => true,
        isDirectory: () => false,
      } as unknown as fs.Stats);
    });

    it('should filter by targetHeight (exact match)', async () => {
      // Image is 20px high -> 10 lines
      vi.mocked(Jimp.read).mockResolvedValue(
        createMockImage(20, 20) as unknown as Awaited<
          ReturnType<typeof Jimp.read>
        >,
      );

      // Case 1: Match
      const matchResults = await generateAscii('img.png', { targetHeight: 10 });
      expect(matchResults).toHaveLength(1);

      // Case 2: No Match
      const noMatchResults = await generateAscii('img.png', {
        targetHeight: 12,
      });
      expect(noMatchResults).toHaveLength(0);
    });

    it('should filter by minHeight', async () => {
      // Image is 20px high -> 10 lines
      vi.mocked(Jimp.read).mockResolvedValue(
        createMockImage(20, 20) as unknown as Awaited<
          ReturnType<typeof Jimp.read>
        >,
      );

      // Case 1: minHeight 5 (10 >= 5) -> Pass
      const passResults = await generateAscii('img.png', { minHeight: 5 });
      expect(passResults).toHaveLength(1);

      // Case 2: minHeight 15 (10 < 15) -> Fail
      const failResults = await generateAscii('img.png', { minHeight: 15 });
      expect(failResults).toHaveLength(0);
    });

    it('should filter by maxHeight', async () => {
      // Image is 20px high -> 10 lines
      vi.mocked(Jimp.read).mockResolvedValue(
        createMockImage(20, 20) as unknown as Awaited<
          ReturnType<typeof Jimp.read>
        >,
      );

      // Case 1: maxHeight 15 (10 <= 15) -> Pass
      const passResults = await generateAscii('img.png', { maxHeight: 15 });
      expect(passResults).toHaveLength(1);

      // Case 2: maxHeight 5 (10 > 5) -> Fail
      const failResults = await generateAscii('img.png', { maxHeight: 5 });
      expect(failResults).toHaveLength(0);
    });
  });

  describe('Rendering', () => {
    beforeEach(() => {
      vi.mocked(fs.statSync).mockReturnValue({
        isFile: () => true,
        isDirectory: () => false,
      } as unknown as fs.Stats);
    });

    it('should preserve transparent pixels and render a visible bottom pixel', async () => {
      vi.mocked(Jimp.read).mockResolvedValue(
        createMockImage(2, 2, (x, y) =>
          x === 1 && y === 1 ? 0xffffffff : 0x00000000,
        ) as unknown as Awaited<ReturnType<typeof Jimp.read>>,
      );

      const [result] = await generateAscii('transparent.png');

      expect(result.ascii).toContain(' ▄');
      expect(result.lineCount).toBe(1);
    });

    it('should render the final row of an odd-height image', async () => {
      vi.mocked(Jimp.read).mockResolvedValue(
        createMockImage(1, 3) as unknown as Awaited<
          ReturnType<typeof Jimp.read>
        >,
      );

      const [result] = await generateAscii('odd.png');

      expect(result.lineCount).toBe(2);
      expect(result.ascii.split('\n')).toHaveLength(3);
    });
  });

  describe('Error Handling', () => {
    it('should handle Jimp read errors gracefully', async () => {
      vi.mocked(fs.statSync).mockReturnValue({
        isFile: () => true,
        isDirectory: () => false,
      } as unknown as fs.Stats);

      // Simulate corrupt image or read error
      vi.mocked(Jimp.read).mockRejectedValue(new Error('Corrupt file'));

      // Should catch error internally and return empty results, NOT throw
      const results = await generateAscii('bad.png', { verbose: false });

      expect(results).toHaveLength(0);
    });

    it('should throw error for invalid local path', async () => {
      // Mock statSync to throw (file not found)
      vi.mocked(fs.statSync).mockImplementation(() => {
        throw new Error('ENOENT');
      });

      await expect(generateAscii('non-existent.png')).rejects.toThrow(
        /Invalid source/,
      );
    });
  });
});
