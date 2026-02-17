import { exportService } from "../../../services/export-service.ts";
import { encodeHtmlToDataUrl } from "../../../domain/export/base64-encoder.ts";
import { MARKDOWN_EXTENSION_PATTERN } from "../../../shared/constants/markdown.ts";
import type { ActionHandler } from "../action-types.ts";

// Chrome Downloads API型定義
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

/**
 * EXPORT_AND_DOWNLOAD アクション
 *
 * スタンドアロンHTMLを生成し、chrome.downloads APIでダウンロードする。
 * Content Script (Isolated World) のBlob URLはオリジンがnullで
 * <a download>が効かないため、chrome.downloads APIを使用。
 */
export const createExportAndDownloadAction = (): ActionHandler => {
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

    const html = await exportService.generateExportHTML(
      payload as Parameters<typeof exportService.generateExportHTML>[0],
    );
    const downloadFilename = p.filename.replace(
      MARKDOWN_EXTENSION_PATTERN,
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
  };
};
