import type { StateManager } from "../../../background/state-manager.ts";
import type { ActionHandler } from "../action-types.ts";

/**
 * UPDATE_SETTINGS アクション
 *
 * 部分的な設定更新を受け取り、既存設定とマージして保存する。
 */
export const createUpdateSettingsAction = (
  stateManager: StateManager,
): ActionHandler => {
  return async (payload: unknown) => {
    if (!payload || typeof payload !== "object") {
      return { success: false, error: "Invalid payload: object required" };
    }
    await stateManager.save(payload as Record<string, unknown>);
    const updated = await stateManager.load();
    return { success: true, data: updated };
  };
};
