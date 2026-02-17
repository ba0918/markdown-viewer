import { markdownService } from "../../services/markdown-service.ts";
import { exportService } from "../../services/export-service.ts";
import { loadTheme } from "../../domain/theme/loader.ts";
import { StateManager } from "../../background/state-manager.ts";
import { encodeHtmlToDataUrl } from "../../domain/export/base64-encoder.ts";
import { computeSHA256 } from "../../shared/utils/hash.ts";
import { isLocalUrl } from "../../shared/utils/url-validator.ts";
import { VALID_THEMES } from "../../shared/constants/themes.ts";
import type { Theme } from "../../shared/types/theme.ts";
import type { Message, MessageResponse } from "../types.ts";

// Chrome API型定義
declare const chrome: {
  downloads: {
    download: (options: {
      url: string;
      filename?: string;
      saveAs?: boolean;
    }) => Promise<number>;
    onDeterminingFilename: {
      addListener: (
        callback: (
          downloadItem: { id: number },
          suggest: (suggestion?: { filename: string }) => void,
        ) => void,
      ) => void;
      removeListener: (
        callback: (
          downloadItem: { id: number },
          suggest: (suggestion?: { filename: string }) => void,
        ) => void,
      ) => void;
    };
  };
};

// StateManagerのインスタンス
const stateManager = new StateManager();

/**
 * ランタイムバリデーション: テーマIDの検証
 * TypeScriptの型チェックに加え、ランタイムでも不正なテーマIDをブロック
 */
const validateThemeId = (themeId: unknown): themeId is Theme => {
  return typeof themeId === "string" &&
    VALID_THEMES.includes(themeId as Theme);
};

/**
 * background層のメッセージハンドラ
 *
 * content scriptからのメッセージを受信し、適切なserviceへルーティングする。
 * このレイヤーでビジネスロジックを記述しないこと。
 *
 * ランタイムバリデーション:
 * - 全ペイロードの型チェック（TypeScript型だけでなくランタイムでも検証）
 * - URL系はisLocalUrl()でローカル限定チェック（SSRF防止）
 * - themeIdはVALID_THEMESでバリデーション
 */
export const handleBackgroundMessage = async (
  message: Message,
  _sender?: { tab?: { id?: number } },
): Promise<MessageResponse> => {
  try {
    switch (message.type) {
      case "RENDER_MARKDOWN": {
        // ランタイムバリデーション
        if (typeof message.payload?.markdown !== "string") {
          return {
            success: false,
            error: "Invalid payload: markdown must be a string",
          };
        }
        const theme = loadTheme(message.payload.themeId);
        const result = markdownService.render(
          message.payload.markdown,
          theme,
        );
        return { success: true, data: result };
      }

      case "LOAD_THEME": {
        if (!validateThemeId(message.payload?.themeId)) {
          return { success: false, error: "Invalid payload: invalid themeId" };
        }
        const theme = loadTheme(message.payload.themeId);
        return { success: true, data: theme };
      }

      case "UPDATE_THEME": {
        if (!validateThemeId(message.payload?.themeId)) {
          return { success: false, error: "Invalid payload: invalid themeId" };
        }
        await stateManager.updateTheme(message.payload.themeId);
        return { success: true, data: null };
      }

      case "UPDATE_HOT_RELOAD": {
        const { enabled, interval, autoReload } = message.payload ?? {};
        if (
          typeof enabled !== "boolean" ||
          typeof interval !== "number" ||
          typeof autoReload !== "boolean"
        ) {
          return {
            success: false,
            error:
              "Invalid payload: enabled (boolean), interval (number), autoReload (boolean) required",
          };
        }
        await stateManager.updateHotReload({ enabled, interval, autoReload });
        return { success: true, data: null };
      }

      case "CHECK_FILE_CHANGE": {
        // Note: fetch + hash計算のロジックはmessaging層に残置。
        // ハッシュ計算はshared/utils/hash.tsに抽出済み。
        // 残りはfetch実行とエラーハンドリングのみで、services層に移動する利点は薄い。
        const rawUrl = message.payload?.url;

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
            error:
              "Invalid URL: only local URLs (file://, localhost) are allowed",
          };
        }

        try {
          const url = rawUrl + "?preventCache=" + Date.now();

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
          } catch {
            // フォールバック: ハッシュ計算失敗時はコンテンツ全体を返す
            return { success: true, data: content };
          }
        } catch (error) {
          const errorMsg = error instanceof Error
            ? error.message
            : "Unknown error";
          return {
            success: false,
            error:
              `Failed to fetch file: ${errorMsg}. Hot Reload may not be available for this file.`,
          };
        }
      }

      case "GET_SETTINGS": {
        const settings = await stateManager.load();
        return { success: true, data: settings };
      }

      case "UPDATE_SETTINGS": {
        if (!message.payload || typeof message.payload !== "object") {
          return { success: false, error: "Invalid payload: object required" };
        }
        await stateManager.save(message.payload);
        const updated = await stateManager.load();
        return { success: true, data: updated };
      }

      case "GENERATE_EXPORT_HTML": {
        if (
          typeof message.payload?.html !== "string" ||
          typeof message.payload?.filename !== "string"
        ) {
          return {
            success: false,
            error: "Invalid payload: html and filename must be strings",
          };
        }
        const exportedHTML = await exportService.generateExportHTML(
          message.payload,
        );
        return { success: true, data: exportedHTML };
      }

      case "EXPORT_AND_DOWNLOAD": {
        if (
          typeof message.payload?.html !== "string" ||
          typeof message.payload?.filename !== "string"
        ) {
          return {
            success: false,
            error: "Invalid payload: html and filename must be strings",
          };
        }
        // Content Script (Isolated World) のBlob URLはオリジンがnullで
        // <a download>が効かないため、chrome.downloads APIを使用
        const html = await exportService.generateExportHTML(message.payload);
        const downloadFilename = message.payload.filename.replace(
          /\.(md|markdown)$/,
          ".html",
        );

        const dataUrl = encodeHtmlToDataUrl(html);

        // 非ASCIIファイル名対策: onDeterminingFilenameで設定（Chromium Bug #579563）
        let handled = false;
        const listener = (
          _downloadItem: { id: number },
          suggest: (suggestion?: { filename: string }) => void,
        ) => {
          if (!handled) {
            handled = true;
            suggest({ filename: downloadFilename });
            chrome.downloads.onDeterminingFilename.removeListener(listener);
          }
        };
        chrome.downloads.onDeterminingFilename.addListener(listener);

        try {
          await chrome.downloads.download({ url: dataUrl });
        } finally {
          // removeListenerは冪等なので安全
          chrome.downloads.onDeterminingFilename.removeListener(listener);
        }

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
