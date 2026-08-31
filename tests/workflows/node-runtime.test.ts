import { assert, assertEquals } from "@std/assert";

const DENO_VERSION = "2.9.5";

const MINIMUM_NODE24_MAJOR = new Map([
  ["actions/checkout", 5],
  ["actions/cache", 5],
  ["actions/upload-artifact", 6],
  ["codecov/codecov-action", 6],
  ["softprops/action-gh-release", 3],
]);

Deno.test("GitHub ActionsはNode.js 24対応版を使う", async () => {
  for await (const entry of Deno.readDir(".github/workflows")) {
    if (!entry.isFile || !/\.ya?ml$/.test(entry.name)) continue;

    const workflow = await Deno.readTextFile(`.github/workflows/${entry.name}`);
    for (const match of workflow.matchAll(/uses:\s+([^@\s]+)@v(\d+)/g)) {
      const [, action, majorText] = match;
      const minimumMajor = MINIMUM_NODE24_MAJOR.get(action);
      if (minimumMajor === undefined) continue;

      const actualMajor = Number(majorText);
      assert(
        actualMajor >= minimumMajor,
        `${entry.name}: ${action}@v${actualMajor} はNode.js 20世代。v${minimumMajor}以上が必要`,
      );
    }
  }
});

Deno.test("GitHub Actionsとローカルは同じDenoバージョンを使う", async () => {
  const miseConfig = await Deno.readTextFile("mise.toml");
  const miseVersion = miseConfig.match(/^deno\s*=\s*"([^"]+)"$/m)?.[1];
  assertEquals(miseVersion, DENO_VERSION, "mise.tomlのDenoバージョン");

  for await (const entry of Deno.readDir(".github/workflows")) {
    if (!entry.isFile || !/\.ya?ml$/.test(entry.name)) continue;

    const workflow = await Deno.readTextFile(`.github/workflows/${entry.name}`);
    if (!workflow.includes("denoland/setup-deno")) continue;

    assert(
      !workflow.includes("2.x"),
      `${entry.name}に可変のDeno 2.x指定が残っている`,
    );
    const versions = [
      ...workflow.matchAll(/deno-version:\s*(?:\[)?["']([^"']+)["']/g),
    ]
      .map((match) => match[1]);
    assert(versions.length > 0, `${entry.name}にDenoバージョン指定がない`);

    for (const version of versions) {
      assertEquals(version, DENO_VERSION, `${entry.name}のDenoバージョン`);
    }
  }
});
