/**
 * TOC抽出ロジックのテスト
 */

import { assertEquals } from "@std/assert";
import { extractHeadings, generateHeadingId } from "./extractor.ts";
import { buildTocTree } from "./tree-builder.ts";

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

Deno.test("extractHeadings: H1のみ", () => {
  const markdown = "# Title\n\nSome content.";
  const result = extractHeadings(markdown);

  assertEquals(result.length, 1);
  assertEquals(result[0].level, 1);
  assertEquals(result[0].text, "Title");
  assertEquals(result[0].id, "Title");
});

Deno.test("extractHeadings: H1-H3混在", () => {
  const markdown = `
# Main Title
## Section 1
### Subsection 1.1
## Section 2
### Subsection 2.1
### Subsection 2.2
  `.trim();

  const result = extractHeadings(markdown);

  assertEquals(result.length, 6);
  assertEquals(result[0], { level: 1, text: "Main Title", id: "Main-Title" });
  assertEquals(result[1], { level: 2, text: "Section 1", id: "Section-1" });
  assertEquals(result[2], {
    level: 3,
    text: "Subsection 1.1",
    id: "Subsection-1.1",
  });
  assertEquals(result[3], { level: 2, text: "Section 2", id: "Section-2" });
  assertEquals(result[4], {
    level: 3,
    text: "Subsection 2.1",
    id: "Subsection-2.1",
  });
  assertEquals(result[5], {
    level: 3,
    text: "Subsection 2.2",
    id: "Subsection-2.2",
  });
});

Deno.test("extractHeadings: H4-H6を無視", () => {
  const markdown = `
# H1 Title
## H2 Title
### H3 Title
#### H4 Title
##### H5 Title
###### H6 Title
  `.trim();

  const result = extractHeadings(markdown);

  assertEquals(result.length, 3);
  assertEquals(result[0].level, 1);
  assertEquals(result[1].level, 2);
  assertEquals(result[2].level, 3);
});

Deno.test("extractHeadings: 見出しなし", () => {
  const markdown = "Just a paragraph.\n\nAnother paragraph.";
  const result = extractHeadings(markdown);

  assertEquals(result.length, 0);
});

Deno.test("extractHeadings: 特殊文字を含む見出し", () => {
  const markdown = `
# API Reference (v2.0)
## Getting Started!
### C++ Programming
  `.trim();

  const result = extractHeadings(markdown);

  assertEquals(result.length, 3);
  assertEquals(result[0].id, "API-Reference-v2.0");
  assertEquals(result[1].id, "Getting-Started!");
  assertEquals(result[2].id, "C++-Programming");
});

Deno.test("extractHeadings: 重複する見出しに連番を付与", () => {
  const markdown = `
# ステータス
## ステータス
### ステータス
## 別の見出し
## ステータス
  `.trim();

  const result = extractHeadings(markdown);

  assertEquals(result.length, 5);
  // 1つ目の「ステータス」はそのまま
  assertEquals(result[0], { level: 1, text: "ステータス", id: "ステータス" });
  // 2つ目の「ステータス」は連番-1
  assertEquals(result[1], { level: 2, text: "ステータス", id: "ステータス-1" });
  // 3つ目の「ステータス」は連番-2
  assertEquals(result[2], { level: 3, text: "ステータス", id: "ステータス-2" });
  // 異なる見出しはそのまま
  assertEquals(result[3], { level: 2, text: "別の見出し", id: "別の見出し" });
  // 4つ目の「ステータス」は連番-3
  assertEquals(result[4], { level: 2, text: "ステータス", id: "ステータス-3" });
});

Deno.test("extractHeadings: 異なる見出しは連番なし", () => {
  const markdown = `
# Introduction
## Getting Started
### Prerequisites
  `.trim();

  const result = extractHeadings(markdown);

  assertEquals(result.length, 3);
  assertEquals(result[0].id, "Introduction");
  assertEquals(result[1].id, "Getting-Started");
  assertEquals(result[2].id, "Prerequisites");
});

Deno.test("buildTocTree: H1のみ（子要素なし）", () => {
  const headings = [
    { level: 1 as const, text: "Title 1", id: "Title-1" },
    { level: 1 as const, text: "Title 2", id: "Title-2" },
  ];

  const result = buildTocTree(headings);

  assertEquals(result.length, 2);
  assertEquals(result[0].level, 1);
  assertEquals(result[0].text, "Title 1");
  assertEquals(result[0].children, []);
  assertEquals(result[1].level, 1);
  assertEquals(result[1].text, "Title 2");
  assertEquals(result[1].children, []);
});

Deno.test("buildTocTree: H1 → H2の階層構造", () => {
  const headings = [
    { level: 1 as const, text: "Title", id: "Title" },
    { level: 2 as const, text: "Section", id: "Section" },
  ];

  const result = buildTocTree(headings);

  // ルートはH1のみ
  assertEquals(result.length, 1);
  assertEquals(result[0].level, 1);
  assertEquals(result[0].text, "Title");

  // H2はH1の子要素
  assertEquals(result[0].children.length, 1);
  assertEquals(result[0].children[0].level, 2);
  assertEquals(result[0].children[0].text, "Section");
  assertEquals(result[0].children[0].children, []);
});

Deno.test("buildTocTree: H1 → H2 → H3の階層構造", () => {
  const headings = [
    { level: 1 as const, text: "Main", id: "Main" },
    { level: 2 as const, text: "Section", id: "Section" },
    { level: 3 as const, text: "Subsection", id: "Subsection" },
  ];

  const result = buildTocTree(headings);

  // ルートはH1のみ
  assertEquals(result.length, 1);
  assertEquals(result[0].text, "Main");

  // H1 → H2
  assertEquals(result[0].children.length, 1);
  assertEquals(result[0].children[0].text, "Section");

  // H2 → H3
  assertEquals(result[0].children[0].children.length, 1);
  assertEquals(result[0].children[0].children[0].text, "Subsection");
  assertEquals(result[0].children[0].children[0].children, []);
});

Deno.test("buildTocTree: 複雑な階層構造", () => {
  const headings = [
    { level: 1 as const, text: "H1-1", id: "H1-1" },
    { level: 2 as const, text: "H2-1", id: "H2-1" },
    { level: 3 as const, text: "H3-1", id: "H3-1" },
    { level: 3 as const, text: "H3-2", id: "H3-2" },
    { level: 2 as const, text: "H2-2", id: "H2-2" },
    { level: 1 as const, text: "H1-2", id: "H1-2" },
    { level: 2 as const, text: "H2-3", id: "H2-3" },
  ];

  const result = buildTocTree(headings);

  // ルートはH1が2つ
  assertEquals(result.length, 2);
  assertEquals(result[0].text, "H1-1");
  assertEquals(result[1].text, "H1-2");

  // H1-1の子要素（H2が2つ）
  assertEquals(result[0].children.length, 2);
  assertEquals(result[0].children[0].text, "H2-1");
  assertEquals(result[0].children[1].text, "H2-2");

  // H2-1の子要素（H3が2つ）
  assertEquals(result[0].children[0].children.length, 2);
  assertEquals(result[0].children[0].children[0].text, "H3-1");
  assertEquals(result[0].children[0].children[1].text, "H3-2");

  // H2-2の子要素（なし）
  assertEquals(result[0].children[1].children, []);

  // H1-2の子要素（H2が1つ）
  assertEquals(result[1].children.length, 1);
  assertEquals(result[1].children[0].text, "H2-3");
  assertEquals(result[1].children[0].children, []);
});

Deno.test("buildTocTree: H2から始まる場合", () => {
  const headings = [
    { level: 2 as const, text: "Section", id: "Section" },
    { level: 3 as const, text: "Subsection", id: "Subsection" },
  ];

  const result = buildTocTree(headings);

  // H2がルートになる
  assertEquals(result.length, 1);
  assertEquals(result[0].level, 2);
  assertEquals(result[0].text, "Section");

  // H3はH2の子要素
  assertEquals(result[0].children.length, 1);
  assertEquals(result[0].children[0].text, "Subsection");
});
