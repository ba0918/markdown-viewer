import { exportService } from "../../../services/export-service.ts";
import type { ActionHandler } from "../action-types.ts";

/**
 * GENERATE_EXPORT_HTML アクション
 *
 * レンダリング済みHTMLからスタンドアロンHTMLを生成する。
 */
export const createGenerateExportHtmlAction = (): ActionHandler => {
  return async (payload: unknown) => {
    const p = payload as
      | { html?: unknown; filename?: unknown }
      | undefined;
    if (
      typeof p?.html !== "string" ||
      typeof p?.filename !== "string"
    ) {
      return {
        success: false,
        error: "Invalid payload: html and filename must be strings",
      };
    }
    const exportedHTML = await exportService.generateExportHTML(
      payload as Parameters<typeof exportService.generateExportHTML>[0],
    );
    return { success: true, data: exportedHTML };
  };
};
