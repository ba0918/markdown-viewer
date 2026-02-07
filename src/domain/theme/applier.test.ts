import { assertEquals, assertStringIncludes } from '@std/assert';
import { applyTheme } from './applier.ts';
import type { ThemeData } from './types.ts';

/**
 * テーマ適用テスト
 */

Deno.test('applyTheme: テーマCSSが適用される', () => {
  const html = '<h1>Hello</h1>';
  const theme: ThemeData = {
    id: 'light',
    css: '.markdown-body { color: #000; }'
  };

  const result = applyTheme(html, theme);

  assertStringIncludes(result, '<style>');
  assertStringIncludes(result, '.markdown-body { color: #000; }');
  assertStringIncludes(result, '</style>');
});

Deno.test('applyTheme: テーマクラスが付与される', () => {
  const html = '<p>Content</p>';
  const theme: ThemeData = {
    id: 'dark',
    css: ''
  };

  const result = applyTheme(html, theme);

  assertStringIncludes(result, 'theme-dark');
  assertStringIncludes(result, 'markdown-body');
});

Deno.test('applyTheme: HTMLコンテンツが保持される', () => {
  const html = '<h1>Title</h1><p>Paragraph</p>';
  const theme: ThemeData = {
    id: 'github',
    css: ''
  };

  const result = applyTheme(html, theme);

  assertStringIncludes(result, '<h1>Title</h1>');
  assertStringIncludes(result, '<p>Paragraph</p>');
});
