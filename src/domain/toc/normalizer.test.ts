/**
 * ToC見出しレベル正規化テスト（親検出アルゴリズム）
 *
 * TDD: RED フェーズ - テストを先に書く
 *
 * アルゴリズム:
 * - 初期状態を評価（順次変換ではない）
 * - 1レベル上の親がいるかチェック
 * - 親がいない場合は h2 に変換（最上位は h2）
 */

import { assertEquals } from "@std/assert";
import { normalizeHeadingLevels } from "./normalizer.ts";
import type { TocHeading } from "./types.ts";

Deno.test("normalizeHeadingLevels: h1から始まる正常な文書 - 正規化なし", () => {
  const headings: TocHeading[] = [
    { level: 1, text: "Title", id: "Title" },
    { level: 2, text: "Section 1", id: "Section-1" },
    { level: 3, text: "Sub 1.1", id: "Sub-1.1" },
  ];

  const result = normalizeHeadingLevels(headings);

  // h1は親不要、h2は親(h1)あり、h3は親(h2)あり
  assertEquals(result.length, 3);
  assertEquals(result[0].level, 1);
  assertEquals(result[1].level, 2);
  assertEquals(result[2].level, 3);
  assertEquals(result[0].text, "Title");
  assertEquals(result[1].text, "Section 1");
  assertEquals(result[2].text, "Sub 1.1");
});

Deno.test("normalizeHeadingLevels: dig.mdケース（h3→h3→h2） - 親なし要素をh2に", () => {
  const headings: TocHeading[] = [
    { level: 3, text: "Phase 2", id: "Phase-2" },
    { level: 3, text: "Phase 3", id: "Phase-3" },
    { level: 2, text: "Decisions", id: "Decisions" },
  ];

  const result = normalizeHeadingLevels(headings);

  // h3は親(h2)いない → h2に変換
  // h3は親(h2)いない → h2に変換
  // h2は親(h1)いない → h2のまま（すでにh2）
  assertEquals(result.length, 3);
  assertEquals(result[0].level, 2); // h3 → h2
  assertEquals(result[1].level, 2); // h3 → h2
  assertEquals(result[2].level, 2); // h2 → h2
  assertEquals(result[0].text, "Phase 2");
  assertEquals(result[1].text, "Phase 3");
  assertEquals(result[2].text, "Decisions");
});

Deno.test("normalizeHeadingLevels: h1 + h3（h2欠け） - h3は親(h1)で補正", () => {
  const headings: TocHeading[] = [
    { level: 1, text: "Title", id: "Title" },
    { level: 3, text: "Detail A", id: "Detail-A" },
    { level: 3, text: "Detail B", id: "Detail-B" },
  ];

  const result = normalizeHeadingLevels(headings);

  // h1は親不要
  // h3は親(h2)いない → h2に変換
  // h3は親(h2)いない → h2に変換
  assertEquals(result.length, 3);
  assertEquals(result[0].level, 1);
  assertEquals(result[1].level, 2); // h3 → h2
  assertEquals(result[2].level, 2); // h3 → h2
});

Deno.test("normalizeHeadingLevels: h2 → h3 → h2 - 親ありh3は保持", () => {
  const headings: TocHeading[] = [
    { level: 2, text: "A", id: "A" },
    { level: 3, text: "B", id: "B" },
    { level: 2, text: "C", id: "C" },
  ];

  const result = normalizeHeadingLevels(headings);

  // h2は親(h1)いない → h2のまま
  // h3は親(h2=A)あり → h3のまま
  // h2は親(h1)いない → h2のまま
  assertEquals(result.length, 3);
  assertEquals(result[0].level, 2);
  assertEquals(result[1].level, 3); // 親ありなのでh3のまま
  assertEquals(result[2].level, 2);
});

Deno.test("normalizeHeadingLevels: 空配列 - 空配列を返す", () => {
  const headings: TocHeading[] = [];

  const result = normalizeHeadingLevels(headings);

  assertEquals(result.length, 0);
});

Deno.test("normalizeHeadingLevels: h2から始まる文書 - h2そのまま、h3は親ありで保持", () => {
  const headings: TocHeading[] = [
    { level: 2, text: "Introduction", id: "Introduction" },
    { level: 3, text: "Overview", id: "Overview" },
    { level: 3, text: "Features", id: "Features" },
    { level: 2, text: "Setup", id: "Setup" },
  ];

  const result = normalizeHeadingLevels(headings);

  // h2は親(h1)いない → h2のまま
  // h3は親(h2=Introduction)あり → h3のまま
  // h3は親(h2=Introduction)あり → h3のまま
  // h2は親(h1)いない → h2のまま
  assertEquals(result.length, 4);
  assertEquals(result[0].level, 2);
  assertEquals(result[1].level, 3); // 親ありなのでh3のまま
  assertEquals(result[2].level, 3); // 親ありなのでh3のまま
  assertEquals(result[3].level, 2);
});

Deno.test("normalizeHeadingLevels: 単一見出し（h3のみ） - h2に変換", () => {
  const headings: TocHeading[] = [
    { level: 3, text: "Only Heading", id: "Only-Heading" },
  ];

  const result = normalizeHeadingLevels(headings);

  // h3は親(h2)いない → h2に変換
  assertEquals(result.length, 1);
  assertEquals(result[0].level, 2); // h3 → h2
  assertEquals(result[0].text, "Only Heading");
});

Deno.test("normalizeHeadingLevels: id とtextは変更されない", () => {
  const headings: TocHeading[] = [
    { level: 2, text: "Test Heading", id: "test-heading-123" },
  ];

  const result = normalizeHeadingLevels(headings);

  // levelは変わるかもしれないが、textとidは保持される
  assertEquals(result[0].text, "Test Heading");
  assertEquals(result[0].id, "test-heading-123");
});
