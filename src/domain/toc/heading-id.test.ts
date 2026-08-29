/**
 * 見出しID生成のテスト
 */

import { assertEquals } from "@std/assert";
import { generateHeadingId } from "./heading-id.ts";

Deno.test("generateHeadingId: 基本的な変換", () => {
  assertEquals(generateHeadingId("Hello World"), "Hello-World");
  assertEquals(generateHeadingId("API Reference"), "API-Reference");
  assertEquals(generateHeadingId("Getting Started"), "Getting-Started");
});

Deno.test("generateHeadingId: 危険な記号を削除", () => {
  assertEquals(generateHeadingId("Hello World!"), "Hello-World!");
  assertEquals(generateHeadingId("API (v2.0)"), "API-v2.0");
  assertEquals(generateHeadingId("C++ Programming"), "C++-Programming");
  assertEquals(generateHeadingId("$100 Budget"), "$100-Budget");
  assertEquals(
    generateHeadingId("ADR-001: domain/層の導入"),
    "ADR-001-domain層の導入",
  );
  assertEquals(generateHeadingId("~~議題: ui/層の命名~~"), "議題-ui層の命名");
});

Deno.test("generateHeadingId: 連続する空白とアンダースコア", () => {
  assertEquals(generateHeadingId("Hello   World"), "Hello-World");
  assertEquals(generateHeadingId("snake_case_example"), "snake-case-example");
  assertEquals(generateHeadingId("mixed _ spaces"), "mixed-spaces");
});

Deno.test("generateHeadingId: 先頭/末尾のハイフン削除", () => {
  assertEquals(generateHeadingId("-leading"), "leading");
  assertEquals(generateHeadingId("trailing-"), "trailing");
  assertEquals(generateHeadingId("--both--"), "both");
});

Deno.test("generateHeadingId: 日本語見出し", () => {
  assertEquals(
    generateHeadingId("アーキテクチャ決定記録"),
    "アーキテクチャ決定記録",
  );
  assertEquals(
    generateHeadingId("ADR-002: settings/層による popup/ と options/ の統合"),
    "ADR-002-settings層による-popup-と-options-の統合",
  );
  assertEquals(generateHeadingId("日本語 + English"), "日本語-+-English");
});
