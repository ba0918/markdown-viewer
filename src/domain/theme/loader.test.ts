import { assertEquals } from '@std/assert';
import { loadTheme } from './loader.ts';

/**
 * テーマ読み込みテスト
 */

Deno.test('loadTheme: lightテーマ読み込み', () => {
  const theme = loadTheme('light');

  assertEquals(theme.id, 'light');
  assertEquals(typeof theme.css, 'string');
});

Deno.test('loadTheme: darkテーマ読み込み', () => {
  const theme = loadTheme('dark');

  assertEquals(theme.id, 'dark');
  assertEquals(typeof theme.css, 'string');
});

Deno.test('loadTheme: テーマID未指定時はlight', () => {
  const theme = loadTheme();

  assertEquals(theme.id, 'light');
});

Deno.test('loadTheme: 存在しないテーマIDはlight', () => {
  const theme = loadTheme('nonexistent');

  assertEquals(theme.id, 'light');
});
