import type { ThemeData } from './types.ts';

/**
 * プリセットテーマ定義
 * Phase 1では light と dark のみ実装
 */
const THEMES: Record<string, ThemeData> = {
  light: {
    id: 'light',
    css: `/* Light theme CSS - 後でCSSファイルから読み込む予定 */
.markdown-viewer {
  background: #ffffff;
  color: #24292e;
}
.markdown-body h1 {
  border-bottom: 1px solid #eaecef;
}
.markdown-body a {
  color: #0366d6;
}
.markdown-body code {
  background: #f6f8fa;
}`
  },
  dark: {
    id: 'dark',
    css: `/* Dark theme CSS - 後でCSSファイルから読み込む予定 */
.markdown-viewer {
  background: #0d1117;
  color: #c9d1d9;
}
.markdown-body h1 {
  border-bottom: 1px solid #21262d;
}
.markdown-body a {
  color: #58a6ff;
}
.markdown-body code {
  background: #161b22;
}`
  }
};

/**
 * テーマデータ読み込み
 * 純粋関数として実装
 *
 * @param themeId - テーマID（未指定時はlight）
 * @returns テーマデータ
 */
export const loadTheme = (themeId?: string): ThemeData => {
  return THEMES[themeId || 'light'] || THEMES.light;
};
