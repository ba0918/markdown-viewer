import { assertEquals, assertStringIncludes } from '@std/assert';
import { MarkdownService } from './markdown-service.ts';
import type { ThemeData } from '../domain/theme/types.ts';

/**
 * Markdown Service テスト
 * ドメイン層の組み合わせをテスト
 *
 * 注: CSSファイルの読み込みはcontent層の責務。
 * services層ではテーマクラスの付与のみをテスト。
 */

Deno.test('MarkdownService: 基本的なレンダリング', async () => {
  const service = new MarkdownService();
  const markdown = '# Hello\n\nThis is **bold**.';
  const theme: ThemeData = {
    id: 'light',
    cssPath: 'content/styles/themes/light.css'
  };

  const result = await service.render(markdown, theme);

  // テーマが適用されているか
  assertStringIncludes(result.html, 'theme-light');
  assertStringIncludes(result.html, 'markdown-body');
  // Markdown変換されているか
  assertStringIncludes(result.html, '<h1');
  assertStringIncludes(result.html, '<strong>bold</strong>');
  // rawMarkdownが保存されているか
  assertEquals(result.rawMarkdown, markdown);
});

Deno.test('MarkdownService: XSS防御統合テスト', async () => {
  const service = new MarkdownService();
  const malicious = '[Click me](javascript:alert("XSS"))';
  const theme: ThemeData = {
    id: 'light',
    cssPath: 'content/styles/themes/light.css'
  };

  const result = await service.render(malicious, theme);

  // javascript:がサニタイズされているか
  assertEquals(result.html.includes('javascript:'), false);
  // リンクテキストは保持されているか
  assertStringIncludes(result.html, 'Click me');
});

Deno.test('MarkdownService: 複雑なMarkdown統合テスト', async () => {
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
    id: 'dark',
    cssPath: 'content/styles/themes/dark.css'
  };

  const result = await service.render(markdown, theme);

  // 全ての要素が含まれているか
  assertStringIncludes(result.html, '<h1');
  assertStringIncludes(result.html, '<h2');
  assertStringIncludes(result.html, '<strong>');
  assertStringIncludes(result.html, '<em>');
  assertStringIncludes(result.html, '<ul');
  assertStringIncludes(result.html, '<code');
  assertStringIncludes(result.html, 'https://example.com');
  // テーマが適用されているか
  assertStringIncludes(result.html, 'theme-dark');
});

Deno.test('MarkdownService: 空文字列処理', async () => {
  const service = new MarkdownService();
  const markdown = '';
  const theme: ThemeData = {
    id: 'light',
    cssPath: 'content/styles/themes/light.css'
  };

  const result = await service.render(markdown, theme);

  // テーマコンテナは存在するか
  assertStringIncludes(result.html, 'markdown-body');
  assertStringIncludes(result.html, 'theme-light');
});

Deno.test('MarkdownService: シンタックスハイライト統合テスト', async () => {
  const service = new MarkdownService();
  const markdown = `\`\`\`javascript
const hello = "world";
console.log(hello);
\`\`\``;
  const theme: ThemeData = {
    id: 'github',
    cssPath: 'content/styles/themes/github.css'
  };

  const result = await service.render(markdown, theme);

  // シンタックスハイライトが適用されているか（highlight.jsのクラスが含まれる）
  assertStringIncludes(result.html, 'hljs');
  // コードブロックの内容が保持されているか
  assertStringIncludes(result.html, 'hello');
  assertStringIncludes(result.html, 'world');
});

Deno.test('MarkdownService: Frontmatter統合テスト - Frontmatter除外', async () => {
  const service = new MarkdownService();
  const markdown = `---
title: Test Document
date: 2026-02-08
tags: [test, frontmatter]
---

# Main Content

This is the actual content.`;
  const theme: ThemeData = {
    id: 'github',
    cssPath: 'content/styles/themes/github.css',
  };

  const result = await service.render(markdown, theme);

  // HTMLにはFrontmatterが含まれない
  assertEquals(result.html.includes('title: Test Document'), false);
  assertEquals(result.html.includes('---'), false);
  // Markdownコンテンツのみがレンダリングされる
  assertStringIncludes(result.html, '<h1');
  assertStringIncludes(result.html, 'Main Content');
  assertStringIncludes(result.html, 'actual content');
  // rawMarkdownには元のテキスト全文が含まれる
  assertEquals(result.rawMarkdown, markdown);
  // Frontmatterデータが解析されている
  assertEquals(result.frontmatter.title, 'Test Document');
  assertEquals(result.frontmatter.date instanceof Date, true);
  assertEquals(Array.isArray(result.frontmatter.tags), true);
});

Deno.test('MarkdownService: Frontmatter統合テスト - Frontmatterなし', async () => {
  const service = new MarkdownService();
  const markdown = '# No Frontmatter\n\nJust regular content.';
  const theme: ThemeData = {
    id: 'light',
    cssPath: 'content/styles/themes/light.css',
  };

  const result = await service.render(markdown, theme);

  // HTMLが正しくレンダリングされる
  assertStringIncludes(result.html, '<h1');
  assertStringIncludes(result.html, 'No Frontmatter');
  // rawMarkdownには元のテキストが含まれる
  assertEquals(result.rawMarkdown, markdown);
  // Frontmatterデータは空オブジェクト
  assertEquals(result.frontmatter, {});
});
