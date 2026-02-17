// deno-lint-ignore-file no-explicit-any
/**
 * check-file-change アクション単体テスト
 */

import { assertEquals } from "@std/assert";
import { createCheckFileChangeAction } from "./check-file-change.ts";

(globalThis as any).DEBUG = false;

const action = createCheckFileChangeAction();

Deno.test("check-file-change: URLが空文字の場合エラー", async () => {
  const result = await action({ url: "" });
  assertEquals(result.success, false);
  if (!result.success) {
    assertEquals(result.error.includes("non-empty string"), true);
  }
});

Deno.test("check-file-change: URLが数値の場合エラー", async () => {
  const result = await action({ url: 12345 });
  assertEquals(result.success, false);
});

Deno.test("check-file-change: リモートURLはSSRF防止でエラー", async () => {
  const result = await action({ url: "https://evil.example.com/secret" });
  assertEquals(result.success, false);
  if (!result.success) {
    assertEquals(result.error.includes("only local URLs"), true);
  }
});

Deno.test("check-file-change: WSL2ファイルパスはエラー", async () => {
  const result = await action({
    url: "file://wsl.localhost/Ubuntu/home/user/file.md",
  });
  assertEquals(result.success, false);
  if (!result.success) {
    assertEquals(result.error.includes("WSL2"), true);
  }
});

Deno.test("check-file-change: payloadがundefinedの場合エラー", async () => {
  const result = await action(undefined);
  assertEquals(result.success, false);
});

Deno.test("check-file-change: URLがスペースのみの場合エラー", async () => {
  const result = await action({ url: "   " });
  assertEquals(result.success, false);
});
