import { loadTheme } from "../../../domain/theme/loader.ts";
import { validateThemeId } from "./validate-theme.ts";
import type { ActionHandler } from "../action-types.ts";

/**
 * LOAD_THEME アクション
 *
 * テーマIDを受け取り、テーマ定義を返す。
 */
export const createLoadThemeAction = (): ActionHandler => {
  return (payload: unknown) => {
    const p = payload as { themeId?: unknown } | undefined;
    const themeId = p?.themeId;
    if (!validateThemeId(themeId)) {
      return { success: false, error: "Invalid payload: invalid themeId" };
    }
    // validateThemeId type guardでTheme型に絞り込み済み
    const theme = loadTheme(themeId);
    return { success: true, data: theme };
  };
};
