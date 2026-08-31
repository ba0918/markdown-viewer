import { assertEquals, assertThrows } from "@std/assert";
import {
  normalizeReleaseVersion,
  verifyReleaseMetadata,
} from "../../scripts/lib/release-version.ts";

const VALID_METADATA = {
  releaseRef: "v0.1.5",
  manifestText: '{"version":"0.1.5"}',
  changelogText:
    "## [0.1.5] - 2026-08-31\n[0.1.5]: https://github.com/ba0918/markdown-viewer/compare/v0.1.4...v0.1.5",
  projectText: "Canonical extension version: `manifest.json` field `version`.",
  storeListingText: "## Version (Current Release)\n\n```\n0.1.5\n```",
};

Deno.test("release tagのv prefixを正規化する", () => {
  assertEquals(normalizeReleaseVersion("v0.1.5"), "0.1.5");
  assertEquals(normalizeReleaseVersion("0.1.5"), "0.1.5");
});

Deno.test("release版がsemver形式でない場合は拒否する", () => {
  assertThrows(
    () => normalizeReleaseVersion("release-0.1.5"),
    Error,
    "Invalid release version",
  );
});

Deno.test("release版とmanifestの版が異なる場合は拒否する", () => {
  assertThrows(
    () => verifyReleaseMetadata({ ...VALID_METADATA, releaseRef: "v0.1.6" }),
    Error,
    "manifest.json",
  );
});

Deno.test("PROJECT.mdに版の正本が宣言されていない場合は拒否する", () => {
  assertThrows(
    () => verifyReleaseMetadata({ ...VALID_METADATA, projectText: "" }),
    Error,
    "PROJECT.md",
  );
});

Deno.test("CHANGELOG.mdにrelease見出しがない場合は拒否する", () => {
  assertThrows(
    () => verifyReleaseMetadata({ ...VALID_METADATA, changelogText: "" }),
    Error,
    "release heading",
  );
});

Deno.test("CHANGELOG.mdに比較リンクがない場合は拒否する", () => {
  assertThrows(
    () =>
      verifyReleaseMetadata({
        ...VALID_METADATA,
        changelogText: "## [0.1.5] - 2026-08-31",
      }),
    Error,
    "comparison link",
  );
});

Deno.test("ストア掲載文の版が異なる場合は拒否する", () => {
  assertThrows(
    () => verifyReleaseMetadata({ ...VALID_METADATA, storeListingText: "" }),
    Error,
    "STORE_LISTING.md",
  );
});

Deno.test("releaseの版宣言はmanifestの版と一致する", async () => {
  const manifestText = await Deno.readTextFile("manifest.json");
  const manifestVersion = JSON.parse(manifestText).version;

  assertEquals(
    verifyReleaseMetadata({
      releaseRef: `v${manifestVersion}`,
      manifestText,
      changelogText: await Deno.readTextFile("CHANGELOG.md"),
      projectText: await Deno.readTextFile("PROJECT.md"),
      storeListingText: await Deno.readTextFile("docs/STORE_LISTING.md"),
    }),
    manifestVersion,
  );
});
