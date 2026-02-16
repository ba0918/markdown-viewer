/**
 * オリジンバリデーションユーティリティのテスト
 */

import { assertEquals } from "@std/assert";
import { validateOrigin } from "./origin-validator.ts";

Deno.test("validateOrigin", async (t) => {
  // 有効な値
  await t.step("https://example.com/* は有効", () => {
    assertEquals(validateOrigin("https://example.com/*", []), {
      valid: true,
    });
  });

  await t.step("https://raw.githubusercontent.com/* は有効", () => {
    assertEquals(
      validateOrigin("https://raw.githubusercontent.com/*", []),
      { valid: true },
    );
  });

  await t.step("https://sub.domain.example.com/* は有効", () => {
    assertEquals(
      validateOrigin("https://sub.domain.example.com/*", []),
      { valid: true },
    );
  });

  // 空文字
  await t.step("空文字は無効", () => {
    assertEquals(
      validateOrigin("", []),
      { valid: false, error: "Origin cannot be empty" },
    );
  });

  await t.step("スペースのみは無効", () => {
    assertEquals(
      validateOrigin("   ", []),
      { valid: false, error: "Origin cannot be empty" },
    );
  });

  // プロトコル
  await t.step("http:// は無効（httpsのみ許可）", () => {
    assertEquals(
      validateOrigin("http://example.com/*", []),
      { valid: false, error: "Origin must start with https://" },
    );
  });

  await t.step("ftp:// は無効", () => {
    assertEquals(
      validateOrigin("ftp://example.com/*", []),
      { valid: false, error: "Origin must start with https://" },
    );
  });

  await t.step("プロトコルなしは無効", () => {
    assertEquals(
      validateOrigin("example.com/*", []),
      { valid: false, error: "Origin must start with https://" },
    );
  });

  // ワイルドカード
  await t.step("/* なしは無効", () => {
    assertEquals(
      validateOrigin("https://example.com", []),
      {
        valid: false,
        error: "Origin must end with /* (e.g., https://example.com/*)",
      },
    );
  });

  await t.step("https://example.com/ は無効（/* なし）", () => {
    assertEquals(
      validateOrigin("https://example.com/", []),
      {
        valid: false,
        error: "Origin must end with /* (e.g., https://example.com/*)",
      },
    );
  });

  // 重複チェック
  await t.step("既に追加済みのオリジンは無効", () => {
    assertEquals(
      validateOrigin("https://example.com/*", ["https://example.com/*"]),
      { valid: false, error: "This origin is already added" },
    );
  });

  await t.step("未追加のオリジンは有効", () => {
    assertEquals(
      validateOrigin("https://new.example.com/*", ["https://example.com/*"]),
      { valid: true },
    );
  });

  await t.step("空の既存リストでは重複なし", () => {
    assertEquals(
      validateOrigin("https://example.com/*", []),
      { valid: true },
    );
  });

  await t.step("existingOriginsデフォルト値で重複なし", () => {
    assertEquals(validateOrigin("https://example.com/*"), { valid: true });
  });
});
