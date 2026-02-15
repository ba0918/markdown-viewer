import { markdownService } from "../../services/markdown-service.ts";
import { exportService } from "../../services/export-service.ts";
import { loadTheme } from "../../domain/theme/loader.ts";
import { StateManager } from "../../background/state-manager.ts";
import type { Message, MessageResponse } from "../types.ts";

// StateManagerのインスタンス
const stateManager = new StateManager();

/**
 * background層のメッセージハンドラ
 *
 * 責務: ルーティングのみ、serviceへの委譲
 *
 * ❌ 絶対禁止: ビジネスロジックの実装
 * ✅ OK: serviceに委譲するだけ
 *
 * これは過去の失敗（DuckDB + offscreen）から学んだ最大の教訓！
 * messaging層にビジネスロジックを書くと、offscreen対応で破綻する
 */
export const handleBackgroundMessage = async (
  message: Message,
): Promise<MessageResponse> => {
  try {
    switch (message.type) {
      case "RENDER_MARKDOWN": {
        // ✅ OK: serviceに委譲するだけ
        const theme = loadTheme(message.payload.themeId);
        const result = await markdownService.render(
          message.payload.markdown,
          theme,
        );
        return { success: true, data: result };
      }

      case "LOAD_THEME": {
        // ✅ OK: domainに委譲するだけ（軽量な処理のため直接呼び出しOK）
        const theme = loadTheme(message.payload.themeId);
        return { success: true, data: theme };
      }

      case "UPDATE_THEME": {
        // ✅ StateManagerで永続化
        await stateManager.updateTheme(message.payload.themeId);
        return { success: true, data: null };
      }

      case "UPDATE_HOT_RELOAD": {
        // ✅ Hot Reload設定を更新
        await stateManager.updateHotReload({
          enabled: message.payload.enabled,
          interval: message.payload.interval,
          autoReload: message.payload.autoReload,
        });
        return { success: true, data: null };
      }

      case "CHECK_FILE_CHANGE": {
        // ✅ Background Scriptでfile://を読み込み（キャッシュ回避）
        try {
          const url = message.payload.url + "?preventCache=" + Date.now();
          const response = await fetch(url);
          const content = await response.text();
          return { success: true, data: content };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error
              ? error.message
              : "Failed to fetch file",
          };
        }
      }

      case "GET_SETTINGS": {
        // ✅ 現在の設定を取得
        const settings = await stateManager.load();
        return { success: true, data: settings };
      }

      case "UPDATE_SETTINGS": {
        // ✅ 設定を更新
        await stateManager.save(message.payload);
        const updated = await stateManager.load();
        return { success: true, data: updated };
      }

      case "EXPORT_HTML": {
        // ✅ HTMLエクスポート（serviceに委譲）
        await exportService.exportAsHTMLFile(message.payload);
        return { success: true, data: null };
      }

      default:
        return { success: false, error: "Unknown message type" };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};
