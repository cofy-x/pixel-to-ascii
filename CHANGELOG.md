# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-08-24

### Added

- Output-width resizing with optional nearest-neighbor sampling for pixel art.
- Configurable alpha thresholding for cleaner transparent edges.

### Fixed

- ANSI TrueColor output is now deterministic when generated from CI, redirected processes, or file-output commands.
- Transparent-border cropping now works independently on every side, including when artwork touches another image edge.
- Numeric rendering and height options now reject invalid or conflicting values instead of silently producing unexpected results.
- Directory processing is deterministic, duplicate base names no longer overwrite one another, and direct console output no longer adds an extra blank line.

## [0.1.0] - 2026-07-28

### Added

- Initial public release of the `pixa` CLI and ESM TypeScript API.
- Local file, directory, and HTTP(S) image inputs.
- ANSI TrueColor half-block rendering, transparent-border cropping, height filters, and text-file output.
- CI, dependency review, CodeQL analysis, Dependabot updates, and npm release automation.

[0.2.0]: https://github.com/cofy-x/pixel-to-ascii/releases/tag/v0.2.0
[0.1.0]: https://github.com/cofy-x/pixel-to-ascii/releases/tag/v0.1.0
