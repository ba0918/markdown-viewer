import type { StateManager } from "../../../background/state-manager.ts";
import type { ActionHandler } from "../action-types.ts";

/**
 * GET_SETTINGS アクション
 *
 * 現在のアプリケーション設定を読み込んで返す。
 */
export const createGetSettingsAction = (
  stateManager: StateManager,
): ActionHandler => {
  return async (_payload: unknown) => {
    const settings = await stateManager.load();
    return { success: true, data: settings };
  };
};
