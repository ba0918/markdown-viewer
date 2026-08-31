# Changelog

## [Unreleased]

## [0.1.5] - 2026-08-31

### Security

- Blocks URL schemes obscured with HTML entities or control characters before
  Markdown links and images are rendered.
- Keeps custom-domain content scripts aligned with the optional host permissions
  that the user has granted.
- Updates bundled dependencies to versions containing upstream security fixes.

### Fixed

- Table of Contents links now work for headings containing punctuation, existing
  IDs, and duplicate names without generating conflicting IDs.
- Hot Reload no longer starts duplicate timers, leaks timers after stopping, or
  writes unchanged interval settings repeatedly.
- Custom remote domains register reliably when permission state and saved
  settings temporarily disagree.
- Non-ASCII domain names no longer cause Content Script ID generation to fail.

[Unreleased]: https://github.com/ba0918/markdown-viewer/compare/v0.1.5...HEAD
[0.1.5]: https://github.com/ba0918/markdown-viewer/compare/v0.1.4...v0.1.5
