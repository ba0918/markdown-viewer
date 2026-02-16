/**
 * ExportMenuItemコンポーネント
 *
 * HTML Exportメニュー項目。DOM上のレンダリング済みHTML（Mermaid SVG・MathJax SVG含む）を
 * messaging経由でBackground Scriptに送信し、chrome.downloads APIでダウンロードを実行する。
 */

import { h as _h } from "preact";
import { useCallback } from "preact/hooks";
import type { Signal } from "@preact/signals";
import { sendMessage } from "../../../messaging/client.ts";
import type { Theme } from "../../../shared/types/theme.ts";
import { showToast } from "../../shared/Toast/index.ts";
import {
  extractFilenameFromUrl,
  extractTitleFromFilename,
} from "../../../shared/utils/file-name-parser.ts";

interface Props {
  /** DOM上のレンダリング済みHTMLを取得する関数（Mermaid SVG・MathJax SVG含む） */
  getRenderedHTML: () => string;
  /** テーマID Signal */
  themeId: Signal<Theme>;
  /** ファイルURL (file://..., http://localhost:..., https://...) */
  fileUrl: string;
  /** クリック後のコールバック（メニューを閉じるため） */
  onExported?: () => void;
}

export const ExportMenuItem = ({
  getRenderedHTML,
  themeId,
  fileUrl,
  onExported,
}: Props) => {
  const handleExportHTML = useCallback(async () => {
    try {
      // ファイル名を取得（URLエンコード・二重エンコード対応）
      const filename = extractFilenameFromUrl(fileUrl);
      const title = extractTitleFromFilename(filename);

      // DOM上のレンダリング済みHTMLを取得
      // （Mermaid SVG・MathJax SVGが含まれた状態）
      const html = getRenderedHTML();

      // Background ScriptでHTML生成 + chrome.downloads APIでダウンロード
      await sendMessage({
        type: "EXPORT_AND_DOWNLOAD",
        payload: {
          html,
          themeId: themeId.value,
          filename,
          title,
        },
      });

      // エクスポート完了後のコールバック
      onExported?.();
    } catch (error) {
      console.error("Export error:", error);
      // ユーザーにエラーを通知
      showToast({
        type: "error",
        message: `Export failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      });
    }
  }, [getRenderedHTML, themeId.value, fileUrl, onExported]);

  return (
    <button
      type="button"
      class="document-header-menu-item"
      onClick={handleExportHTML}
    >
      Export HTML
    </button>
  );
};
