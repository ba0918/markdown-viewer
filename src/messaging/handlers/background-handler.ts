import { markdownService } from "../../services/markdown-service.ts";
import { exportService } from "../../services/export-service.ts";
import { loadTheme } from "../../domain/theme/loader.ts";
import { StateManager } from "../../background/state-manager.ts";
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
 * background層のメッセージハンドラ
 *
 * content scriptからのメッセージを受信し、適切なserviceへルーティングする。
 * このレイヤーでビジネスロジックを記述しないこと。
 */
export const handleBackgroundMessage = async (
  message: Message,
  _sender?: { tab?: { id?: number } },
): Promise<MessageResponse> => {
  try {
    switch (message.type) {
      case "RENDER_MARKDOWN": {
        const theme = loadTheme(message.payload.themeId);
        const result = markdownService.render(
          message.payload.markdown,
          theme,
        );
        return { success: true, data: result };
      }

      case "LOAD_THEME": {
        const theme = loadTheme(message.payload.themeId);
        return { success: true, data: theme };
      }

      case "UPDATE_THEME": {
        await stateManager.updateTheme(message.payload.themeId);
        return { success: true, data: null };
      }

      case "UPDATE_HOT_RELOAD": {
        await stateManager.updateHotReload({
          enabled: message.payload.enabled,
          interval: message.payload.interval,
          autoReload: message.payload.autoReload,
        });
        return { success: true, data: null };
      }

      case "CHECK_FILE_CHANGE": {
        try {
          const url = message.payload.url + "?preventCache=" + Date.now();

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
          return { success: true, data: content };
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
        await stateManager.save(message.payload);
        const updated = await stateManager.load();
        return { success: true, data: updated };
      }

      case "GENERATE_EXPORT_HTML": {
        const exportedHTML = await exportService.generateExportHTML(
          message.payload,
        );
        return { success: true, data: exportedHTML };
      }

      case "EXPORT_AND_DOWNLOAD": {
        // Content Script (Isolated World) のBlob URLはオリジンがnullで
        // <a download>が効かないため、chrome.downloads APIを使用
        const html = await exportService.generateExportHTML(message.payload);
        const downloadFilename = message.payload.filename.replace(
          /\.(md|markdown)$/,
          ".html",
        );

        // btoa()はバイナリ文字列のみのためUTF-8エンコード経由で変換
        const utf8Bytes = new TextEncoder().encode(html);
        let binary = "";
        for (let i = 0; i < utf8Bytes.length; i++) {
          binary += String.fromCharCode(utf8Bytes[i]);
        }
        const dataUrl = "data:text/html;base64," + btoa(binary);

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
