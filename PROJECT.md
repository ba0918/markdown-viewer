# Project

## Release

Canonical extension version: `manifest.json` field `version`.

`CHANGELOG.md` and `docs/STORE_LISTING.md` follow that value. Run
`deno task release:verify` before creating a release; the release workflow also
rejects a tag name that does not match the canonical version.

Maintainers start a release manually from the `main` branch. After the release
checks pass, the workflow creates one checked package, attaches that same
package to the GitHub Release, uploads it to the Chrome Web Store, and submits
it for review. An approved submission is published automatically to all users.

The package upload and review submission are separate jobs, so a downstream
failure can be retried without rebuilding or uploading a successful package
again.
