import type { StateManager } from "../../../background/state-manager.ts";
import { normalizeHotReloadInterval } from "../../../shared/utils/validators.ts";
import type { ActionHandler } from "../action-types.ts";

/**
 * UPDATE_HOT_RELOAD アクション
 *
 * Hot Reload設定（enabled, interval, autoReload）を更新する。
 *
 * intervalは有限数チェックの上、最小値（2000ms）へ正規化してから保存する。
 * NaN/Infinity/負値がストレージへ書き込まれるのを防ぐため。
 */
export const createUpdateHotReloadAction = (
  stateManager: StateManager,
): ActionHandler => {
  return async (payload: unknown) => {
    const p = payload as
      | { enabled?: unknown; interval?: unknown; autoReload?: unknown }
      | undefined;
    const { enabled, interval, autoReload } = p ?? {};
    if (
      typeof enabled !== "boolean" ||
      typeof interval !== "number" || !Number.isFinite(interval) ||
      typeof autoReload !== "boolean"
    ) {
      return {
        success: false,
        error:
          "Invalid payload: enabled (boolean), interval (number), autoReload (boolean) required",
      };
    }
    await stateManager.updateHotReload({
      enabled,
      interval: normalizeHotReloadInterval(interval),
      autoReload,
    });
    return { success: true, data: null };
  };
};
