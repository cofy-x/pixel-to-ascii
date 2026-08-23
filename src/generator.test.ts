/**
 * @license
 * Copyright 2025 cofy-x
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateAscii } from './generator.js';
import fs from 'node:fs';
import { Jimp, ResizeStrategy } from 'jimp';

// --- Mocks ---
// 1. Mock 'node:fs' to simulate file system operations
vi.mock('node:fs');

// 2. Mock 'jimp' to simulate image processing without real images
vi.mock('jimp', () => ({
  Jimp: {
    read: vi.fn(),
  },
  ResizeStrategy: {
    BILINEAR: 'bilinearInterpolation',
    NEAREST_NEIGHBOR: 'nearestNeighbor',
  },
}));

// Helper to create a mock Jimp image instance
const createMockImage = (
  width: number,
  height: number,
  colorAt: (x: number, y: number) => number = () => 0xffffffff,
) => {
  const image = {
    bitmap: {
      width,
      height,
      data: Buffer.alloc(width * height * 4, 0xff),
    },
    crop: vi.fn(({ w, h }: { x: number; y: number; w: number; h: number }) => {
      image.bitmap.width = w;
      image.bitmap.height = h;
      image.bitmap.data = Buffer.alloc(w * h * 4, 0xff);
      return image;
    }),
    resize: vi.fn(({ w }: { w: number; mode?: ResizeStrategy }) => {
      image.bitmap.height = Math.round((image.bitmap.height * w) / width);
      image.bitmap.width = w;
      image.bitmap.data = Buffer.alloc(
        image.bitmap.width * image.bitmap.height * 4,
        0xff,
      );
      return image;
    }),
    getPixelColor: vi.fn(colorAt),
  };

  return image;
};

function stripAnsi(value: string): string {
  const escape = String.fromCharCode(27);
  return value.replaceAll(new RegExp(`${escape}\\[[0-9;]*m`, 'g'), '');
}

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
      expect(results.map((r) => r.source)).toEqual([
        'images/icon.png',
        'images/photo.jpg',
      ]);
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

      expect(stripAnsi(result.ascii)).toContain(' ▄');
      expect(result.lineCount).toBe(1);
    });

    it('should always emit ANSI TrueColor sequences', async () => {
      vi.mocked(Jimp.read).mockResolvedValue(
        createMockImage(1, 1, () => 0x3366ccff) as unknown as Awaited<
          ReturnType<typeof Jimp.read>
        >,
      );

      const [result] = await generateAscii('color.png');

      expect(result.ascii).toContain('\x1b[38;2;51;102;204m');
    });

    it('should treat low-alpha pixels as transparent', async () => {
      vi.mocked(Jimp.read).mockResolvedValue(
        createMockImage(2, 2, (x, y) =>
          x === 1 && y === 0 ? 0x3366cc0f : 0x3366ccff,
        ) as unknown as Awaited<ReturnType<typeof Jimp.read>>,
      );

      const [result] = await generateAscii('soft-edge.png');

      expect(stripAnsi(result.ascii)).toBe('▀▄\n');
    });

    it('should crop transparent sides independently', async () => {
      const image = createMockImage(4, 4, (x, y) =>
        x >= 1 && x <= 2 && y >= 1 && y <= 2 ? 0x3366ccff : 0x00000000,
      );
      image.bitmap.data.fill(0);
      for (let y = 1; y <= 2; y++) {
        for (let x = 1; x <= 2; x++) {
          const index = (y * 4 + x) * 4;
          image.bitmap.data.set([0x33, 0x66, 0xcc, 0xff], index);
        }
      }
      vi.mocked(Jimp.read).mockResolvedValue(
        image as unknown as Awaited<ReturnType<typeof Jimp.read>>,
      );

      await generateAscii('transparent-border.png');

      expect(image.crop).toHaveBeenCalledWith({
        x: 1,
        y: 1,
        w: 2,
        h: 2,
      });
    });

    it('should keep an all-transparent image at the minimum size', async () => {
      const image = createMockImage(4, 4, () => 0x00000000);
      image.bitmap.data.fill(0);
      vi.mocked(Jimp.read).mockResolvedValue(
        image as unknown as Awaited<ReturnType<typeof Jimp.read>>,
      );

      const [result] = await generateAscii('empty.png', { width: 32 });

      expect(image.crop).toHaveBeenCalledWith({ x: 0, y: 0, w: 1, h: 1 });
      expect(image.resize).not.toHaveBeenCalled();
      expect(result.lineCount).toBe(1);
      expect(stripAnsi(result.ascii)).toBe(' \n');
    });

    it('should resize with nearest-neighbor when pixelated is enabled', async () => {
      const image = createMockImage(20, 10);
      vi.mocked(Jimp.read).mockResolvedValue(
        image as unknown as Awaited<ReturnType<typeof Jimp.read>>,
      );

      const [result] = await generateAscii('pixel-art.png', {
        width: 10,
        pixelated: true,
      });

      expect(image.resize).toHaveBeenCalledWith({
        w: 10,
        mode: ResizeStrategy.NEAREST_NEIGHBOR,
      });
      expect(result.originalWidth).toBe(20);
      expect(result.originalHeight).toBe(10);
      expect(result.lineCount).toBe(3);
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
    it('should reject invalid rendering options', async () => {
      await expect(generateAscii('image.png', { width: 0 })).rejects.toThrow(
        'width must be a positive integer',
      );
      await expect(
        generateAscii('image.png', { alphaThreshold: 256 }),
      ).rejects.toThrow('alphaThreshold must be an integer from 1 to 255');
      await expect(
        generateAscii('image.png', { pixelated: true }),
      ).rejects.toThrow('pixelated requires width');
      await expect(
        generateAscii('image.png', { targetHeight: -1 }),
      ).rejects.toThrow('targetHeight must be a positive integer');
      await expect(
        generateAscii('image.png', { minHeight: 10, maxHeight: 5 }),
      ).rejects.toThrow('minHeight must be less than or equal to maxHeight');
    });

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
