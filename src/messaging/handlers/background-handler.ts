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
  _sender?: { tab?: { id?: number } },
): Promise<MessageResponse> => {
  try {
    switch (message.type) {
      case "RENDER_MARKDOWN": {
        // ✅ OK: serviceに委譲するだけ
        const theme = loadTheme(message.payload.themeId);
        const result = markdownService.render(
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

          // WSL2ファイルはChromeのセキュリティポリシーでfetch不可
          if (url.includes("file://wsl.localhost/")) {
            return {
              success: false,
              error:
                "Hot Reload is not supported for WSL2 files (file://wsl.localhost/...). " +
                "Please use a localhost HTTP server instead.",
            };
          }

          const response = await fetch(url);

          // HTTPステータスチェック
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

      case "GENERATE_EXPORT_HTML": {
        // ✅ エクスポート用HTML生成（serviceに委譲）
        const exportedHTML = await exportService.generateExportHTML(
          message.payload,
        );
        return { success: true, data: exportedHTML };
      }

      case "EXPORT_AND_DOWNLOAD": {
        // ✅ HTML生成 + chrome.downloads APIでダウンロード実行
        // Content Script (Isolated World) の Blob URL はオリジンが null になり
        // <a download> が効かない。chrome.downloads API はページのオリジンに
        // 依存せず、拡張機能の権限でダウンロードを実行できる。

        // 1. HTML生成
        const html = await exportService.generateExportHTML(message.payload);
        const downloadFilename = message.payload.filename.replace(
          /\.(md|markdown)$/,
          ".html",
        );

        // 2. Data URL に変換
        // btoa() はバイナリ文字列のみ受け付けるため、UTF-8エンコード経由で変換
        const utf8Bytes = new TextEncoder().encode(html);
        let binary = "";
        for (let i = 0; i < utf8Bytes.length; i++) {
          binary += String.fromCharCode(utf8Bytes[i]);
        }
        const dataUrl = "data:text/html;base64," + btoa(binary);

        // 3. onDeterminingFilename で非ASCIIファイル名を設定
        // chrome.downloads.download() の filename パラメータは Data URL 使用時に
        // 非ASCII文字をエスケープする既知の問題がある（Chromium Bug #579563）。
        // onDeterminingFilename イベントリスナーでファイル名を差し替えることで回避。
        //
        // 注: リスナーはdownload()呼び出し前に登録する。
        // download()のPromise解決とonDeterminingFilenameイベント発火は
        // 同じマイクロタスクキュー内で順序が保証されないため、
        // downloadIdの代わりにフラグベースでワンショット制御する。
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

        await chrome.downloads.download({ url: dataUrl });

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
