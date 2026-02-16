/**
 * エンコーディングユーティリティのテスト
 */

import { assertEquals } from "@std/assert";
import { getContentScriptId, toUrlSafeBase64 } from "./encode.ts";

Deno.test("toUrlSafeBase64", async (t) => {
  await t.step("基本的な文字列をエンコード", () => {
    const result = toUrlSafeBase64("hello");
    // btoa("hello") = "aGVsbG8=" → "=" 削除 → "aGVsbG8"
    assertEquals(result, "aGVsbG8");
  });

  await t.step("'+' を '-' に置換", () => {
    // btoa(">>>") = "Pj4+" → "+" → "-"
    const result = toUrlSafeBase64(">>>");
    assertEquals(result.includes("+"), false);
    assertEquals(result.includes("-"), true);
  });

  await t.step("'/' を '_' に置換", () => {
    // btoa("??") = "Pz8=" → "Pz8"（/が含まれないケース）
    // btoa("???") = "Pz8/" → "/" → "_"
    const result = toUrlSafeBase64("???");
    assertEquals(result.includes("/"), false);
    assertEquals(result.includes("_"), true);
  });

  await t.step("'=' パディングを削除", () => {
    // btoa("a") = "YQ==" → "YQ"
    const result = toUrlSafeBase64("a");
    assertEquals(result, "YQ");
    assertEquals(result.includes("="), false);
  });

  await t.step("空文字列をエンコード", () => {
    const result = toUrlSafeBase64("");
    assertEquals(result, "");
  });

  await t.step("URLを含む文字列をエンコード", () => {
    const result = toUrlSafeBase64("https://example.com/*");
    // URLセーフ文字のみで構成されること
    assertEquals(/^[A-Za-z0-9_-]*$/.test(result), true);
  });

  await t.step("パディングなしの文字列（3の倍数長）", () => {
    // btoa("abc") = "YWJj"（パディングなし）
    const result = toUrlSafeBase64("abc");
    assertEquals(result, "YWJj");
  });

  await t.step("長い文字列でもURLセーフ文字のみ", () => {
    const longStr = "https://very-long-domain.example.com/path/to/resource/*";
    const result = toUrlSafeBase64(longStr);
    assertEquals(/^[A-Za-z0-9_-]*$/.test(result), true);
  });
});

Deno.test("getContentScriptId", async (t) => {
  await t.step("'custom-origin-' プレフィックスが付与される", () => {
    const result = getContentScriptId("https://example.com/*");
    assertEquals(result.startsWith("custom-origin-"), true);
  });

  await t.step("オリジンをBase64エンコードしてIDを生成", () => {
    const origin = "https://example.com/*";
    const result = getContentScriptId(origin);
    const expected = `custom-origin-${toUrlSafeBase64(origin)}`;
    assertEquals(result, expected);
  });

  await t.step("異なるオリジンで異なるIDを生成", () => {
    const id1 = getContentScriptId("https://example.com/*");
    const id2 = getContentScriptId("https://other.com/*");
    assertEquals(id1 !== id2, true);
  });

  await t.step("同じオリジンで同じIDを生成（決定性）", () => {
    const origin = "https://example.com/*";
    const id1 = getContentScriptId(origin);
    const id2 = getContentScriptId(origin);
    assertEquals(id1, id2);
  });
});
