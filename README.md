# Pixel-to-ASCII (`pixa`)

[![npm version](https://img.shields.io/npm/v/@cofy-x/pixel-to-ascii)](https://www.npmjs.com/package/@cofy-x/pixel-to-ascii)
[![CI](https://github.com/cofy-x/pixel-to-ascii/actions/workflows/ci.yml/badge.svg)](https://github.com/cofy-x/pixel-to-ascii/actions/workflows/ci.yml)
[![Node.js](https://img.shields.io/node/v/@cofy-x/pixel-to-ascii)](https://nodejs.org/)
[![License](https://img.shields.io/github/license/cofy-x/pixel-to-ascii)](./LICENSE)

A lightweight TypeScript library and CLI for converting images into high-fidelity ANSI TrueColor art.

`pixa` renders two vertical pixels with one half-block character (`▀` or `▄`). This preserves image proportions while producing compact, colorful terminal output.

![Original abstract sunrise example](./examples/assets/sunrise.png)

## Features

- ANSI TrueColor output with separate foreground and background colors.
- Half-block rendering for two pixels per terminal row.
- Automatic cropping of transparent borders.
- Configurable output width, resampling mode, and alpha threshold.
- Local file, directory, and HTTP(S) URL inputs.
- Exact, minimum, and maximum output-height filters.
- Terminal output or reusable ANSI text files.
- ESM TypeScript API and the `pixa` command-line tool.

## Requirements

- Node.js 20 or newer.
- An ANSI TrueColor-compatible terminal for full-color output.
- ESM for programmatic imports. CommonJS consumers can use dynamic `import()`.

## CLI

Run without installing:

```sh
npx @cofy-x/pixel-to-ascii ./image.png
```

Or install globally:

```sh
npm install --global @cofy-x/pixel-to-ascii
pixa --help
```

Convert one image, a directory, or an image URL:

```sh
pixa ./image.png
pixa ./images/
pixa https://example.com/image.png
```

Save ANSI output to text files instead of printing it:

```sh
pixa ./images/ --output ./output
```

Save and print at the same time:

```sh
pixa ./image.png --output ./output --print
```

Resize an image to a compact terminal width. Use nearest-neighbor scaling for
pixel art:

```sh
pixa ./sprite.png --width 32 --pixelated --output ./output
```

### Options

| Option                     | Alias | Description                                                         |
| -------------------------- | ----- | ------------------------------------------------------------------- |
| `--width <number>`         | `-w`  | Resize to this many terminal columns while preserving aspect ratio. |
| `--pixelated`              |       | Use nearest-neighbor resizing with `--width`.                       |
| `--alpha-threshold <n>`    |       | Treat alpha values below `n` (1–255, default 16) as transparent.    |
| `--target-height <number>` | `-t`  | Keep results with exactly this terminal line count.                 |
| `--min-height <number>`    | `-m`  | Keep results at or above this line count.                           |
| `--max-height <number>`    | `-M`  | Keep results at or below this line count.                           |
| `--output <path>`          | `-o`  | Save each result as an ANSI `.txt` file.                            |
| `--print`                  | `-p`  | Print results even when `--output` is used.                         |
| `--verbose`                | `-v`  | Report input discovery, skipped images, and processing failures.    |
| `--help`                   | `-h`  | Show CLI help.                                                      |

An invalid local source exits with an error. Individual unreadable or unsupported images are skipped; enable `--verbose` to see those failures. A successful scan with no images matching the height filters is not an error.

## Library

Install the package:

```sh
npm install @cofy-x/pixel-to-ascii
```

Import the ESM API:

```ts
import { generateAscii } from '@cofy-x/pixel-to-ascii';

const [result] = await generateAscii('./image.png');

if (result) {
  console.log(result.ascii);
}
```

Process a directory with output-height filters:

```ts
const icons = await generateAscii('./images', {
  minHeight: 8,
  maxHeight: 16,
  verbose: true,
});
```

### `generateAscii(source, options?)`

`source` is a local file path, a local directory, or an HTTP(S) URL. The function returns `Promise<AsciiResult[]>`.

```ts
interface GenerateOptions {
  width?: number;
  pixelated?: boolean;
  alphaThreshold?: number;
  targetHeight?: number;
  minHeight?: number;
  maxHeight?: number;
  verbose?: boolean;
}

interface AsciiResult {
  source: string;
  ascii: string;
  lineCount: number;
  originalWidth: number;
  originalHeight: number;
}
```

When `targetHeight` is set, it takes precedence over `minHeight` and `maxHeight`. Per-image decoding failures are omitted from the returned array and reported only when `verbose` is enabled.

`width` resizes the cropped image before rendering and preserves its aspect ratio. `pixelated` switches that resize to nearest-neighbor sampling and requires `width`. Pixels below `alphaThreshold` are cleared before cropping and rendering, preventing nearly invisible edge pixels from creating halos or extra blank rows. Generated `ascii` always contains ANSI TrueColor sequences, including when called from CI or redirected to a file. `originalWidth` and `originalHeight` continue to describe the decoded source image before cropping or resizing.

## Used by pokefetch

[`cofy-x/pokefetch`](https://github.com/cofy-x/pokefetch) uses `pixel-to-ascii` to prepare pre-colored ANSI terminal assets. Pokémon source artwork used by that separate project is third-party material and is not part of this package or covered by this project's Apache-2.0 license.

## Development

```sh
pnpm install
pnpm check
pnpm dev:demo
pnpm dev:cli ./examples/assets/sunrise.png
```

`pnpm check` runs linting, tests, TypeScript compilation, package metadata checks, ESM type-resolution checks, and an npm tarball contents audit.

To test the globally linked command:

```sh
pnpm cli:link
pixa --help
pnpm cli:unlink
```

## Security and contributing

Bug reports and feature requests are welcome in [GitHub Issues](https://github.com/cofy-x/pixel-to-ascii/issues). Follow the cofy-x organization contribution and security policies; do not report vulnerabilities in public issues.

## License

Copyright © 2025 cofy-x.

Licensed under the [Apache License 2.0](./LICENSE).
