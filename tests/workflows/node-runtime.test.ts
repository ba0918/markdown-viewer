import { assert } from "@std/assert";

const MINIMUM_NODE24_MAJOR = new Map([
  ["actions/checkout", 5],
  ["actions/cache", 5],
  ["actions/upload-artifact", 6],
  ["codecov/codecov-action", 6],
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
