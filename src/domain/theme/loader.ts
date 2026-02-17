import type { ThemeData } from "./types.ts";
import type { Theme } from "../../shared/types/theme.ts";
import {
  getThemeCssPath,
  VALID_THEMES,
} from "../../shared/constants/themes.ts";

/**
 * テーマデータ読み込み
 * 純粋関数として実装
 *
 * CSSパスはshared/constants/themes.tsのgetThemeCssPath()で一元管理。
 * URL解決はcontent層で行う。
 *
 * @param themeId - テーマID（未指定時はlight）
 * @returns テーマデータ（外部CSSファイルのパスを含む）
 */
export const loadTheme = (themeId?: Theme): ThemeData => {
  const theme = themeId && VALID_THEMES.includes(themeId) ? themeId : "light";
  return {
    id: theme,
    cssPath: getThemeCssPath(theme),
  };
};
