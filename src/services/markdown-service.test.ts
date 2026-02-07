import { assertEquals, assertStringIncludes } from '@std/assert';
import { MarkdownService } from './markdown-service.ts';
import type { ThemeData } from '../domain/theme/types.ts';

/**
 * Markdown Service テスト
 * ドメイン層の組み合わせをテスト
 */

Deno.test('MarkdownService: 基本的なレンダリング', async () => {
  const service = new MarkdownService();
  const markdown = '# Hello\n\nThis is **bold**.';
  const theme: ThemeData = {
    id: 'light',
    css: '.markdown-body { color: #000; }'
  };

  const html = await service.render(markdown, theme);

  // テーマが適用されているか
  assertStringIncludes(html, 'theme-light');
  // Markdown変換されているか
  assertStringIncludes(html, '<h1');
  assertStringIncludes(html, '<strong>bold</strong>');
  // CSSが含まれているか
  assertStringIncludes(html, '<style>');
});

Deno.test('MarkdownService: XSS防御統合テスト', async () => {
  const service = new MarkdownService();
  const malicious = '[Click me](javascript:alert("XSS"))';
  const theme: ThemeData = {
    id: 'light',
    css: ''
  };

  const html = await service.render(malicious, theme);

  // javascript:がサニタイズされているか
  assertEquals(html.includes('javascript:'), false);
  // リンクテキストは保持されているか
  assertStringIncludes(html, 'Click me');
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
    css: ''
  };

  const html = await service.render(markdown, theme);

  // 全ての要素が含まれているか
  assertStringIncludes(html, '<h1');
  assertStringIncludes(html, '<h2');
  assertStringIncludes(html, '<strong>');
  assertStringIncludes(html, '<em>');
  assertStringIncludes(html, '<ul');
  assertStringIncludes(html, '<code');
  assertStringIncludes(html, 'https://example.com');
  // テーマが適用されているか
  assertStringIncludes(html, 'theme-dark');
});

Deno.test('MarkdownService: 空文字列処理', async () => {
  const service = new MarkdownService();
  const markdown = '';
  const theme: ThemeData = {
    id: 'light',
    css: ''
  };

  const html = await service.render(markdown, theme);

  // テーマコンテナは存在するか
  assertStringIncludes(html, 'markdown-body');
  assertStringIncludes(html, 'theme-light');
});
