import { assertEquals, assertStringIncludes } from '@std/assert';
import { parseMarkdown } from './parser.ts';

/**
 * Markdownパーサーテスト
 * GFM (GitHub Flavored Markdown) サポート
 */

Deno.test('基本的なMarkdown変換: 見出し', () => {
  const markdown = '# Hello World';
  const html = parseMarkdown(markdown);
  assertStringIncludes(html, '<h1');
  assertStringIncludes(html, 'Hello World');
});

Deno.test('基本的なMarkdown変換: 太字', () => {
  const markdown = 'This is **bold**.';
  const html = parseMarkdown(markdown);
  assertStringIncludes(html, '<strong>bold</strong>');
});

Deno.test('基本的なMarkdown変換: 斜体', () => {
  const markdown = 'This is *italic*.';
  const html = parseMarkdown(markdown);
  assertStringIncludes(html, '<em>italic</em>');
});

Deno.test('GFM: テーブル', () => {
  const markdown = '| A | B |\n|---|---|\n| 1 | 2 |';
  const html = parseMarkdown(markdown);
  assertStringIncludes(html, '<table');
  assertStringIncludes(html, '<thead');
  assertStringIncludes(html, '<tbody');
});

Deno.test('GFM: コードブロック', () => {
  const markdown = '```javascript\nconsole.log("hello");\n```';
  const html = parseMarkdown(markdown);
  assertStringIncludes(html, '<code');
  // シンタックスハイライトで分割されるため、個別に確認
  assertStringIncludes(html, 'console');
  assertStringIncludes(html, 'log');
});

Deno.test('シンタックスハイライト: JavaScriptコードブロック', () => {
  const markdown = '```javascript\nconst x = 42;\n```';
  const html = parseMarkdown(markdown);
  // highlight.js が <span> タグでハイライトを適用
  assertStringIncludes(html, '<span');
  assertStringIncludes(html, 'const');
  // class属性に hljs が含まれる
  assertStringIncludes(html, 'hljs');
});

Deno.test('シンタックスハイライト: 言語指定なしのコードブロック', () => {
  const markdown = '```\nplain text\n```';
  const html = parseMarkdown(markdown);
  // コードブロックは生成される
  assertStringIncludes(html, '<code');
  assertStringIncludes(html, 'plain text');
});

Deno.test('GFM: リンク', () => {
  const markdown = '[Example](https://example.com)';
  const html = parseMarkdown(markdown);
  assertStringIncludes(html, '<a');
  assertStringIncludes(html, 'https://example.com');
});

Deno.test('複雑なMarkdown: 混合要素', () => {
  const markdown = `# Title

This is **bold** and *italic*.

- Item 1
- Item 2

\`\`\`javascript
const x = 1;
\`\`\`
`;
  const html = parseMarkdown(markdown);
  assertStringIncludes(html, '<h1');
  assertStringIncludes(html, '<strong>');
  assertStringIncludes(html, '<em>');
  assertStringIncludes(html, '<ul');
  assertStringIncludes(html, '<code');
});
