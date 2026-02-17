import { markdownService } from "../../../services/markdown-service.ts";
import { loadTheme } from "../../../domain/theme/loader.ts";
import { validateThemeId } from "./validate-theme.ts";
import type { Theme } from "../../../shared/types/theme.ts";
import type { ActionHandler } from "../action-types.ts";

/**
 * RENDER_MARKDOWN アクション
 *
 * Markdownテキストを受け取り、テーマ適用済みHTMLにレンダリングする。
 */
export const createRenderMarkdownAction = (): ActionHandler => {
  return (payload: unknown) => {
    const p = payload as { markdown?: unknown; themeId?: unknown } | undefined;
    if (typeof p?.markdown !== "string") {
      return {
        success: false,
        error: "Invalid payload: markdown must be a string",
      };
    }
    // themeIdが指定された場合はバリデーション（他アクションと一貫性を保つ）
    if (p.themeId !== undefined && !validateThemeId(p.themeId)) {
      return {
        success: false,
        error: "Invalid payload: invalid themeId",
      };
    }
    const theme = loadTheme(p.themeId as Theme | undefined);
    const result = markdownService.render(p.markdown, theme);
    return { success: true, data: result };
  };
};
