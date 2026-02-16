/**
 * URL種別判定ユーティリティのテスト
 */

import { assertEquals } from "@std/assert";
import { isLocalUrl } from "./url-validator.ts";

Deno.test("isLocalUrl", async (t) => {
  // file:// プロトコル
  await t.step("file:// プロトコルはローカルURL", () => {
    assertEquals(isLocalUrl("file:///home/user/test.md"), true);
  });

  await t.step("file:// Windowsパスもローカル URL", () => {
    assertEquals(isLocalUrl("file:///C:/Users/test.md"), true);
  });

  // localhost
  await t.step("http://localhost はローカルURL", () => {
    assertEquals(isLocalUrl("http://localhost"), true);
  });

  await t.step("http://localhost:8000 はローカルURL", () => {
    assertEquals(isLocalUrl("http://localhost:8000"), true);
  });

  await t.step("https://localhost はローカルURL", () => {
    assertEquals(isLocalUrl("https://localhost"), true);
  });

  await t.step("http://localhost/path/to/file.md はローカルURL", () => {
    assertEquals(isLocalUrl("http://localhost/path/to/file.md"), true);
  });

  // 127.0.0.1
  await t.step("http://127.0.0.1 はローカルURL", () => {
    assertEquals(isLocalUrl("http://127.0.0.1"), true);
  });

  await t.step("http://127.0.0.1:3000 はローカルURL", () => {
    assertEquals(isLocalUrl("http://127.0.0.1:3000"), true);
  });

  // IPv6 ループバック
  await t.step("http://[::1] はローカルURL", () => {
    assertEquals(isLocalUrl("http://[::1]"), true);
  });

  await t.step("http://[::1]:8080 はローカルURL", () => {
    assertEquals(isLocalUrl("http://[::1]:8080"), true);
  });

  // リモートURL (false)
  await t.step("https://example.com はローカルURLではない", () => {
    assertEquals(isLocalUrl("https://example.com"), false);
  });

  await t.step(
    "https://raw.githubusercontent.com はローカルURLではない",
    () => {
      assertEquals(
        isLocalUrl(
          "https://raw.githubusercontent.com/user/repo/main/README.md",
        ),
        false,
      );
    },
  );

  // エッジケース
  await t.step("空文字列はfalse", () => {
    assertEquals(isLocalUrl(""), false);
  });

  await t.step("不正なURLはfalse", () => {
    assertEquals(isLocalUrl("not-a-url"), false);
  });

  await t.step("data: URLはfalse", () => {
    assertEquals(isLocalUrl("data:text/html,<h1>test</h1>"), false);
  });

  await t.step("ftp:// はfalse", () => {
    assertEquals(isLocalUrl("ftp://localhost/file"), false);
  });
});
