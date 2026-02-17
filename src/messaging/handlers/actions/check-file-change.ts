import { computeSHA256 } from "../../../shared/utils/hash.ts";
import { isLocalUrl } from "../../../shared/utils/url-validator.ts";
import type { ActionHandler } from "../action-types.ts";

/**
 * CHECK_FILE_CHANGE アクション
 *
 * ローカルファイルをfetchし、SHA-256ハッシュを返す。
 * Hot Reload用のファイル変更検知に使用。
 *
 * Note: fetch + hash計算のロジックはmessaging層に残置。
 * ハッシュ計算はshared/utils/hash.tsに抽出済み。
 * 残りはfetch実行とエラーハンドリングのみで、services層に移動する利点は薄い。
 */
export const createCheckFileChangeAction = (): ActionHandler => {
  return async (payload: unknown) => {
    const p = payload as { url?: unknown } | undefined;
    const rawUrl = p?.url;

    // ランタイムバリデーション: URL文字列チェック
    if (typeof rawUrl !== "string" || rawUrl.trim() === "") {
      return {
        success: false,
        error: "Invalid payload: url must be a non-empty string",
      };
    }

    // SSRF防止: ローカルURLのみ許可
    if (!isLocalUrl(rawUrl)) {
      return {
        success: false,
        error: "Invalid URL: only local URLs (file://, localhost) are allowed",
      };
    }

    try {
      // クエリパラメータが既に存在するURLにも対応するため、URL APIを使用
      const urlObj = new URL(rawUrl);
      urlObj.searchParams.set("preventCache", String(Date.now()));
      const url = urlObj.href;

      // WSL2ファイルはChrome制限でfetch不可
      if (url.includes("file://wsl.localhost/")) {
        return {
          success: false,
          error:
            "Hot Reload is not supported for WSL2 files (file://wsl.localhost/...). " +
            "Please use a localhost HTTP server instead.",
        };
      }

      const response = await fetch(url);

      if (!response.ok) {
        return {
          success: false,
          error:
            `Failed to fetch file: HTTP ${response.status} ${response.statusText}`,
        };
      }

      const content = await response.text();
      try {
        const hash = await computeSHA256(content);
        return { success: true, data: hash };
      } catch (error) {
        const errorMsg = error instanceof Error
          ? error.message
          : "Unknown error";
        return {
          success: false,
          error:
            `Hash computation failed: ${errorMsg}. Hot Reload is unavailable in this environment.`,
        };
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      return {
        success: false,
        error:
          `Failed to fetch file: ${errorMsg}. Hot Reload may not be available for this file.`,
      };
    }
  };
};
