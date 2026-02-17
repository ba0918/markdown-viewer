import { VALID_THEMES } from "../../../shared/constants/themes.ts";
import type { Theme } from "../../../shared/types/theme.ts";

/**
 * ランタイムバリデーション: テーマIDの検証
 *
 * TypeScriptの型チェックに加え、ランタイムでも不正なテーマIDをブロック。
 * load-theme, update-theme アクションで共用。
 */
export const validateThemeId = (themeId: unknown): themeId is Theme => {
  return typeof themeId === "string" &&
    VALID_THEMES.includes(themeId as Theme);
};
