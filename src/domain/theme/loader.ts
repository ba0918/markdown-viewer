import type { ThemeData } from './types.ts';
import type { Theme } from '../../shared/types/theme.ts';

/**
 * プリセットテーマ定義
 * Phase 3では 6テーマ実装 (light, dark, github, minimal, solarized-light, solarized-dark)
 *
 * 外部CSSファイルのパスを返す（URL解決はcontent層で行う）
 */
const THEMES: Record<Theme, ThemeData> = {
  light: {
    id: 'light',
    cssPath: 'content/styles/themes/light.css'
  },
  dark: {
    id: 'dark',
    cssPath: 'content/styles/themes/dark.css'
  },
  github: {
    id: 'github',
    cssPath: 'content/styles/themes/github.css'
  },
  minimal: {
    id: 'minimal',
    cssPath: 'content/styles/themes/minimal.css'
  },
  'solarized-light': {
    id: 'solarized-light',
    cssPath: 'content/styles/themes/solarized-light.css'
  },
  'solarized-dark': {
    id: 'solarized-dark',
    cssPath: 'content/styles/themes/solarized-dark.css'
  }
};

/**
 * テーマデータ読み込み
 * 純粋関数として実装
 *
 * @param themeId - テーマID（未指定時はlight）
 * @returns テーマデータ（外部CSSファイルのパスを含む）
 */
export const loadTheme = (themeId?: Theme): ThemeData => {
  return THEMES[themeId || 'light'] || THEMES.light;
};
