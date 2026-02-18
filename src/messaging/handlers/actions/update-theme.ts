import type { StateManager } from "../../../background/state-manager.ts";
import { validateThemeId } from "./validate-theme.ts";
import type { ActionHandler } from "../action-types.ts";

/**
 * UPDATE_THEME アクション
 *
 * テーマIDを受け取り、ストレージに保存する。
 */
export const createUpdateThemeAction = (
  stateManager: StateManager,
): ActionHandler => {
  return async (payload: unknown) => {
    const p = payload as { themeId?: unknown } | undefined;
    const themeId = p?.themeId;
    if (!validateThemeId(themeId)) {
      return { success: false, error: "Invalid payload: invalid themeId" };
    }
    // validateThemeId type guardでTheme型に絞り込み済み
    await stateManager.updateTheme(themeId);
    return { success: true, data: null };
  };
};
