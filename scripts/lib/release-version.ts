export interface ReleaseMetadata {
  releaseRef: string;
  manifestText: string;
  changelogText: string;
  projectText: string;
  storeListingText: string;
}

const CANONICAL_VERSION_DECLARATION =
  "Canonical extension version: `manifest.json` field `version`.";

export function normalizeReleaseVersion(releaseRef: string): string {
  const version = releaseRef.startsWith("v") ? releaseRef.slice(1) : releaseRef;
  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    throw new Error(`Invalid release version: ${releaseRef}`);
  }
  return version;
}

export function verifyReleaseMetadata(metadata: ReleaseMetadata): string {
  const releaseVersion = normalizeReleaseVersion(metadata.releaseRef);
  const manifestVersion = JSON.parse(metadata.manifestText).version;

  if (manifestVersion !== releaseVersion) {
    throw new Error(
      `manifest.json version ${manifestVersion} does not match release ${releaseVersion}`,
    );
  }

  if (!metadata.projectText.includes(CANONICAL_VERSION_DECLARATION)) {
    throw new Error("PROJECT.md does not declare manifest.json as canonical");
  }

  if (!metadata.changelogText.includes(`## [${releaseVersion}]`)) {
    throw new Error(`CHANGELOG.md has no ${releaseVersion} release heading`);
  }

  const comparisonSuffix = `...v${releaseVersion}`;
  if (!metadata.changelogText.includes(comparisonSuffix)) {
    throw new Error(
      `CHANGELOG.md has no comparison link for ${releaseVersion}`,
    );
  }

  const listingVersion =
    `## Version (Current Release)\n\n\`\`\`\n${releaseVersion}\n\`\`\``;
  if (!metadata.storeListingText.includes(listingVersion)) {
    throw new Error(
      `STORE_LISTING.md version does not match ${releaseVersion}`,
    );
  }

  return releaseVersion;
}
