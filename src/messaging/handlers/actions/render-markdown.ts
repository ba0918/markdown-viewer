import { markdownService } from "../../../services/markdown-service.ts";
import { validateThemeId } from "./validate-theme.ts";
import type { ActionHandler } from "../action-types.ts";

/**
 * RENDER_MARKDOWN アクション
 *
 * Markdownテキストを受け取り、サニタイズ済みHTMLにレンダリングする。
 *
 * themeIdはレンダリング結果に影響しない（テーマ適用はcontent層の責務）が、
 * 不正な値を早期に弾くため他アクションと同様にバリデーションする。
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
    const result = markdownService.render(p.markdown);
    return { success: true, data: result };
  };
};
