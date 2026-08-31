# Project

## Release

Canonical extension version: `manifest.json` field `version`.

`CHANGELOG.md` and `docs/STORE_LISTING.md` follow that value. Run
`deno task release:verify` before creating a release; the release workflow also
rejects a tag name that does not match the canonical version.
