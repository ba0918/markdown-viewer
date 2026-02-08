/**
 * Frontmatter Parser Tests
 *
 * YAML Frontmatter解析のテスト
 * TDD: RED フェーズ - テストを先に書く
 */

import { assertEquals } from "@std/assert";
import { parseFrontmatter } from "./parser.ts";

Deno.test("parseFrontmatter: 標準的なYAML Frontmatterを正しく解析", () => {
  const markdown = `---
title: Test Document
date: 2026-02-08
tags: [yaml, frontmatter, test]
---

# Heading 1

Content here.`;

  const result = parseFrontmatter(markdown);

  assertEquals(result.data.title, "Test Document");
  // @std/yaml は日付を Date オブジェクトに変換する
  assertEquals(result.data.date instanceof Date, true);
  assertEquals(result.data.tags, ["yaml", "frontmatter", "test"]);
  assertEquals(result.content.trim(), "# Heading 1\n\nContent here.");
  assertEquals(result.original, markdown);
});

Deno.test("parseFrontmatter: Frontmatterがない場合は元のmarkdownをそのまま返す", () => {
  const markdown = "# No Frontmatter\n\nJust regular content.";

  const result = parseFrontmatter(markdown);

  assertEquals(result.data, {});
  assertEquals(result.content, markdown);
  assertEquals(result.original, markdown);
});

Deno.test("parseFrontmatter: Frontmatter + content分離が正しく動作", () => {
  const markdown = `---
author: Claude
---
Body content`;

  const result = parseFrontmatter(markdown);

  assertEquals(result.data.author, "Claude");
  assertEquals(result.content.trim(), "Body content");
  assertEquals(result.original, markdown);
});

Deno.test("parseFrontmatter: contentにFrontmatter部分が含まれない", () => {
  const markdown = `---
key: value
---
# Title`;

  const result = parseFrontmatter(markdown);

  assertEquals(result.content.includes("---"), false);
  assertEquals(result.content.includes("key:"), false);
  assertEquals(result.content.trim(), "# Title");
});

Deno.test("parseFrontmatter: 複数行のYAML値を正しく解析", () => {
  const markdown = `---
title: Multi-line Test
description: |
  This is a long
  multi-line description
  for testing purposes.
---
Content`;

  const result = parseFrontmatter(markdown);

  assertEquals(result.data.title, "Multi-line Test");
  assertEquals(typeof result.data.description, "string");
  assertEquals(
    (result.data.description as string).includes("multi-line"),
    true,
  );
});

Deno.test("parseFrontmatter: 空のFrontmatter（---のみ）を処理", () => {
  const markdown = `---
---
# Content`;

  const result = parseFrontmatter(markdown);

  assertEquals(result.data, {});
  assertEquals(result.content.trim(), "# Content");
});

Deno.test("parseFrontmatter: Frontmatter閉じタグなしでも可能な範囲でパース", () => {
  const markdown = `---
title: Valid Title
---
Content here`;

  // gray-matterは正しい閉じタグがあればちゃんとパースできる
  const result = parseFrontmatter(markdown);

  assertEquals(result.data.title, "Valid Title");
  assertEquals(result.content.trim(), "Content here");
});

Deno.test("parseFrontmatter: 不正なYAMLフォーマットのエラーハンドリング", () => {
  const markdown = `---
title: "Unclosed quote
date: invalid
---
Content`;

  // 不正なYAMLでもクラッシュせず、エラーハンドリングする
  const result = parseFrontmatter(markdown);

  // エラー時は元のテキストをそのまま返す
  assertEquals(result.content, markdown);
  assertEquals(result.data, {});
});

Deno.test("parseFrontmatter: ネストしたYAML構造を解析", () => {
  const markdown = `---
metadata:
  author: Claude
  version: 1.0
tags:
  - test
  - yaml
---
Content`;

  const result = parseFrontmatter(markdown);

  assertEquals(typeof result.data.metadata, "object");
  assertEquals(
    (result.data.metadata as Record<string, unknown>).author,
    "Claude",
  );
  assertEquals(Array.isArray(result.data.tags), true);
  assertEquals((result.data.tags as string[])[0], "test");
});
