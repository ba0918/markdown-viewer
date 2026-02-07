import type { ThemeData } from './types.ts';
import type { Theme } from '../../shared/types/theme.ts';

/**
 * プリセットテーマ定義
 * Phase 3では 6テーマ実装 (light, dark, github, minimal, solarized-light, solarized-dark)
 */
const THEMES: Record<Theme, ThemeData> = {
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
  },
  github: {
    id: 'github',
    css: `/* GitHub theme CSS - 後でCSSファイルから読み込む予定 */
.markdown-viewer {
  background: #ffffff;
  color: #24292e;
}
.markdown-body h1 {
  border-bottom: 1px solid #e1e4e8;
}
.markdown-body a {
  color: #0366d6;
}
.markdown-body code {
  background: #f6f8fa;
}`
  },
  minimal: {
    id: 'minimal',
    css: `/* Minimal theme CSS - 後でCSSファイルから読み込む予定 */
.markdown-viewer {
  background: #fafafa;
  color: #333333;
  font-family: 'Georgia', 'Times New Roman', serif;
}
.markdown-body h1 {
  font-size: 2.2rem;
}
.markdown-body a {
  color: #333333;
  text-decoration: underline;
}
.markdown-body code {
  background: #f0f0f0;
}`
  },
  'solarized-light': {
    id: 'solarized-light',
    css: `/* Solarized Light theme CSS - 後でCSSファイルから読み込む予定 */
.markdown-viewer {
  background: #fdf6e3;
  color: #657b83;
}
.markdown-body h1 {
  border-bottom: 1px solid #eee8d5;
}
.markdown-body a {
  color: #268bd2;
}
.markdown-body code {
  background: #eee8d5;
  color: #2aa198;
}`
  },
  'solarized-dark': {
    id: 'solarized-dark',
    css: `/* Solarized Dark theme CSS - 後でCSSファイルから読み込む予定 */
.markdown-viewer {
  background: #002b36;
  color: #839496;
}
.markdown-body h1 {
  border-bottom: 1px solid #073642;
}
.markdown-body a {
  color: #268bd2;
}
.markdown-body code {
  background: #073642;
  color: #2aa198;
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
export const loadTheme = (themeId?: Theme): ThemeData => {
  return THEMES[themeId || 'light'] || THEMES.light;
};
