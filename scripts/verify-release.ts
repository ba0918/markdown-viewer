import { verifyReleaseMetadata } from "./lib/release-version.ts";

const manifestText = await Deno.readTextFile("manifest.json");
const manifestVersion = JSON.parse(manifestText).version;
const releaseVersion = verifyReleaseMetadata({
  releaseRef: Deno.args[0] ?? `v${manifestVersion}`,
  manifestText,
  changelogText: await Deno.readTextFile("CHANGELOG.md"),
  projectText: await Deno.readTextFile("PROJECT.md"),
  storeListingText: await Deno.readTextFile("docs/STORE_LISTING.md"),
});

console.log(`Release metadata verified: v${releaseVersion}`);
