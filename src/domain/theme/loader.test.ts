import { assertEquals, assertStringIncludes } from '@std/assert';
import { loadTheme } from './loader.ts';

/**
 * テーマ読み込みテスト
 */

Deno.test('loadTheme: lightテーマ読み込み', () => {
  const theme = loadTheme('light');

  assertEquals(theme.id, 'light');
  assertEquals(theme.cssPath, 'content/styles/themes/light.css');
});

Deno.test('loadTheme: darkテーマ読み込み', () => {
  const theme = loadTheme('dark');

  assertEquals(theme.id, 'dark');
  assertEquals(theme.cssPath, 'content/styles/themes/dark.css');
});

Deno.test('loadTheme: テーマID未指定時はlight', () => {
  const theme = loadTheme();

  assertEquals(theme.id, 'light');
  assertEquals(theme.cssPath, 'content/styles/themes/light.css');
});

Deno.test('loadTheme: 存在しないテーマIDはlight', () => {
  // @ts-expect-error - Testing invalid theme ID
  const theme = loadTheme('nonexistent');

  assertEquals(theme.id, 'light');
  assertEquals(theme.cssPath, 'content/styles/themes/light.css');
});

// Phase 3: 新規テーマのテスト

Deno.test('loadTheme: GitHubテーマ読み込み', () => {
  const theme = loadTheme('github');

  assertEquals(theme.id, 'github');
  assertEquals(theme.cssPath, 'content/styles/themes/github.css');
});

Deno.test('loadTheme: Minimalテーマ読み込み', () => {
  const theme = loadTheme('minimal');

  assertEquals(theme.id, 'minimal');
  assertEquals(theme.cssPath, 'content/styles/themes/minimal.css');
});

Deno.test('loadTheme: Solarized Lightテーマ読み込み', () => {
  const theme = loadTheme('solarized-light');

  assertEquals(theme.id, 'solarized-light');
  assertEquals(theme.cssPath, 'content/styles/themes/solarized-light.css');
});

Deno.test('loadTheme: Solarized Darkテーマ読み込み', () => {
  const theme = loadTheme('solarized-dark');

  assertEquals(theme.id, 'solarized-dark');
  assertEquals(theme.cssPath, 'content/styles/themes/solarized-dark.css');
});

Deno.test('loadTheme: 全テーマのcssPathが正しいフォーマット', () => {
  const themes = ['light', 'dark', 'github', 'minimal', 'solarized-light', 'solarized-dark'] as const;

  for (const themeId of themes) {
    const theme = loadTheme(themeId);
    assertStringIncludes(theme.cssPath, 'content/styles/themes/');
    assertStringIncludes(theme.cssPath, '.css');
    assertStringIncludes(theme.cssPath, themeId);
  }
});
