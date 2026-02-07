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
  // @ts-expect-error - Testing invalid theme ID
  const theme = loadTheme('nonexistent');

  assertEquals(theme.id, 'light');
});

// Phase 3: 新規テーマのテスト

Deno.test('loadTheme: GitHubテーマ読み込み', () => {
  const theme = loadTheme('github');

  assertEquals(theme.id, 'github');
  assertEquals(typeof theme.css, 'string');
});

Deno.test('loadTheme: Minimalテーマ読み込み', () => {
  const theme = loadTheme('minimal');

  assertEquals(theme.id, 'minimal');
  assertEquals(typeof theme.css, 'string');
});

Deno.test('loadTheme: Solarized Lightテーマ読み込み', () => {
  const theme = loadTheme('solarized-light');

  assertEquals(theme.id, 'solarized-light');
  assertEquals(typeof theme.css, 'string');
});

Deno.test('loadTheme: Solarized Darkテーマ読み込み', () => {
  const theme = loadTheme('solarized-dark');

  assertEquals(theme.id, 'solarized-dark');
  assertEquals(typeof theme.css, 'string');
});
