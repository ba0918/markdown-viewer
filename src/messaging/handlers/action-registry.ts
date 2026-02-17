import { StateManager } from "../../background/state-manager.ts";
import type { ActionHandler } from "./action-types.ts";
import { createRenderMarkdownAction } from "./actions/render-markdown.ts";
import { createLoadThemeAction } from "./actions/load-theme.ts";
import { createUpdateThemeAction } from "./actions/update-theme.ts";
import { createUpdateHotReloadAction } from "./actions/update-hot-reload.ts";
import { createCheckFileChangeAction } from "./actions/check-file-change.ts";
import { createGetSettingsAction } from "./actions/get-settings.ts";
import { createUpdateSettingsAction } from "./actions/update-settings.ts";
import { createGenerateExportHtmlAction } from "./actions/generate-export-html.ts";
import { createExportAndDownloadAction } from "./actions/export-and-download.ts";

/**
 * メッセージタイプ → アクション関数のレジストリ
 *
 * StateManagerインスタンスを生成し、必要なアクションに注入する。
 * 各アクション関数はファクトリパターンで生成され、依存関係が明示的。
 */
export const createActionRegistry = (): Record<string, ActionHandler> => {
  const stateManager = new StateManager();

  return {
    RENDER_MARKDOWN: createRenderMarkdownAction(),
    LOAD_THEME: createLoadThemeAction(),
    UPDATE_THEME: createUpdateThemeAction(stateManager),
    UPDATE_HOT_RELOAD: createUpdateHotReloadAction(stateManager),
    CHECK_FILE_CHANGE: createCheckFileChangeAction(),
    GET_SETTINGS: createGetSettingsAction(stateManager),
    UPDATE_SETTINGS: createUpdateSettingsAction(stateManager),
    GENERATE_EXPORT_HTML: createGenerateExportHtmlAction(),
    EXPORT_AND_DOWNLOAD: createExportAndDownloadAction(),
  };
};
