import { assertEquals, assertStringIncludes } from "@std/assert";
import { MarkdownService } from "./markdown-service.ts";
import type { ThemeData } from "../domain/theme/types.ts";

/**
 * Markdown Service テスト
 * ドメイン層の組み合わせをテスト
 *
 * 注: CSSファイルの読み込みはcontent層の責務。
 * services層ではテーマクラスの付与のみをテスト。
 */

Deno.test("MarkdownService: 基本的なレンダリング", async () => {
  const service = new MarkdownService();
  const markdown = "# Hello\n\nThis is **bold**.";
  const theme: ThemeData = {
    id: "light",
    cssPath: "content/styles/themes/light.css",
  };

  const result = await service.render(markdown, theme);

  assertStringIncludes(result.html, "theme-light");
  assertStringIncludes(result.html, "markdown-body");
  assertStringIncludes(result.html, "<h1");
  assertStringIncludes(result.html, "<strong>bold</strong>");
  assertEquals(result.rawMarkdown, markdown);
});

Deno.test("MarkdownService: XSS防御統合テスト", async () => {
  const service = new MarkdownService();
  const malicious = '[Click me](javascript:alert("XSS"))';
  const theme: ThemeData = {
    id: "light",
    cssPath: "content/styles/themes/light.css",
  };

  const result = await service.render(malicious, theme);

  assertEquals(result.html.includes("javascript:"), false);
  assertStringIncludes(result.html, "Click me");
});

Deno.test("MarkdownService: 複雑なMarkdown統合テスト", async () => {
  const service = new MarkdownService();
  const markdown = `# Title

## Subtitle

This is **bold** and *italic*.

- List item 1
- List item 2

\`\`\`javascript
console.log('code');
\`\`\`

[Link](https://example.com)
`;
  const theme: ThemeData = {
    id: "dark",
    cssPath: "content/styles/themes/dark.css",
  };

  const result = await service.render(markdown, theme);

  assertStringIncludes(result.html, "<h1");
  assertStringIncludes(result.html, "<h2");
  assertStringIncludes(result.html, "<strong>");
  assertStringIncludes(result.html, "<em>");
  assertStringIncludes(result.html, "<ul");
  assertStringIncludes(result.html, "<code");
  assertStringIncludes(result.html, "https://example.com");
  assertStringIncludes(result.html, "theme-dark");
});

Deno.test("MarkdownService: 空文字列処理", async () => {
  const service = new MarkdownService();
  const markdown = "";
  const theme: ThemeData = {
    id: "light",
    cssPath: "content/styles/themes/light.css",
  };

  const result = await service.render(markdown, theme);

  assertStringIncludes(result.html, "markdown-body");
  assertStringIncludes(result.html, "theme-light");
});

Deno.test("MarkdownService: シンタックスハイライト統合テスト", async () => {
  const service = new MarkdownService();
  const markdown = `\`\`\`javascript
const hello = "world";
console.log(hello);
\`\`\``;
  const theme: ThemeData = {
    id: "github",
    cssPath: "content/styles/themes/github.css",
  };

  const result = await service.render(markdown, theme);

  assertStringIncludes(result.html, "hljs");
  assertStringIncludes(result.html, "hello");
  assertStringIncludes(result.html, "world");
});

Deno.test("MarkdownService: Frontmatter統合テスト - Frontmatter除外", async () => {
  const service = new MarkdownService();
  const markdown = `---
title: Test Document
date: 2026-02-08
tags: [test, frontmatter]
---

# Main Content

This is the actual content.`;
  const theme: ThemeData = {
    id: "github",
    cssPath: "content/styles/themes/github.css",
  };

  const result = await service.render(markdown, theme);

  assertEquals(result.html.includes("title: Test Document"), false);
  assertEquals(result.html.includes("---"), false);
  assertStringIncludes(result.html, "<h1");
  assertStringIncludes(result.html, "Main Content");
  assertStringIncludes(result.html, "actual content");
  assertEquals(result.rawMarkdown, markdown);
  assertEquals(result.frontmatter.title, "Test Document");
  // @std/yaml は日付を Date オブジェクトに変換する
  assertEquals(result.frontmatter.date instanceof Date, true);
  assertEquals(Array.isArray(result.frontmatter.tags), true);
});

Deno.test("MarkdownService: Frontmatter統合テスト - Frontmatterなし", async () => {
  const service = new MarkdownService();
  const markdown = "# No Frontmatter\n\nJust regular content.";
  const theme: ThemeData = {
    id: "light",
    cssPath: "content/styles/themes/light.css",
  };

  const result = await service.render(markdown, theme);

  assertStringIncludes(result.html, "<h1");
  assertStringIncludes(result.html, "No Frontmatter");
  assertEquals(result.rawMarkdown, markdown);
  assertEquals(result.frontmatter, {});
});

/**
 * エッジケース統合テスト
 */

Deno.test("MarkdownService: 空白のみのMarkdown → クラッシュしない", async () => {
  const service = new MarkdownService();
  const markdown = "   \n\n  \t  ";
  const theme: ThemeData = {
    id: "light",
    cssPath: "content/styles/themes/light.css",
  };

  const result = await service.render(markdown, theme);

  assertStringIncludes(result.html, "markdown-body");
  assertEquals(result.rawMarkdown, markdown);
});

Deno.test("MarkdownService: 超長文Markdown（50KB相当）→ OOMしない", async () => {
  const service = new MarkdownService();
  const markdown = "# Section\n\nParagraph **bold** text.\n\n".repeat(1500);
  const theme: ThemeData = {
    id: "light",
    cssPath: "content/styles/themes/light.css",
  };

  const result = await service.render(markdown, theme);

  assertStringIncludes(result.html, "<h1");
  assertStringIncludes(result.html, "<strong>");
  assertEquals(result.html.length > 0, true);
});

Deno.test("MarkdownService: Frontmatter + XSS混在テスト", async () => {
  const service = new MarkdownService();
  const markdown = `---
title: Test
---
# Content

<script>alert('XSS')</script>

[Click](javascript:alert(1))`;
  const theme: ThemeData = {
    id: "light",
    cssPath: "content/styles/themes/light.css",
  };

  const result = await service.render(markdown, theme);

  // Frontmatterは正しく解析
  assertEquals(result.frontmatter.title, "Test");
  // XSSはブロック
  assertEquals(result.html.includes("<script"), false);
  assertEquals(result.html.includes("javascript:"), false);
  // 正常なコンテンツは保持
  assertStringIncludes(result.html, "Content");
});
