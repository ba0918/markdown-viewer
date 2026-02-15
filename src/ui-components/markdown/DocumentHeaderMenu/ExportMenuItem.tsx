/**
 * ExportMenuItemコンポーネント
 *
 * 責務: HTML Export メニュー項目
 * - Background Script: 重い処理（CSS fetch、HTML生成）
 * - Content Script: 軽い処理（Blob URL化、<a>ダウンロード）
 *
 * ❌ 禁止: 重いビジネスロジック、services/domain直接呼び出し
 * ✅ OK: 軽量な処理（Blob URL変換、DOM操作）
 */

import { h as _h } from "preact";
import { useCallback } from "preact/hooks";
import type { Signal } from "@preact/signals";
import { sendMessage } from "../../../messaging/client.ts";
import type { Theme } from "../../../shared/types/theme.ts";
import { showToast } from "../../shared/Toast/index.ts";

interface Props {
  /** レンダリング済みHTML */
  html: string;
  /** テーマID Signal */
  themeId: Signal<Theme>;
  /** ファイルURL (file://..., http://localhost:..., https://...) */
  fileUrl: string;
  /** クリック後のコールバック（メニューを閉じるため） */
  onExported?: () => void;
}

/**
 * Blob URLを生成（Content Script側の軽量な処理）
 *
 * data: URLではなくBlob URLを使用する理由:
 * - リモートURL（https://）ではdata: URLのダウンロードがブロックされる
 * - Blob URLは同一オリジン制限を受けないため、全環境で動作する
 */
const toBlobUrl = (html: string): string => {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  return URL.createObjectURL(blob);
};

export const ExportMenuItem = ({
  html,
  themeId,
  fileUrl,
  onExported,
}: Props) => {
  const handleExportHTML = useCallback(async () => {
    try {
      // ファイル名を取得
      const filename = fileUrl.split("/").pop() || "document.md";
      const title = filename.replace(/\.md$/, "");

      // 1. Background ScriptでHTML生成（重い処理: CSS fetch、HTML組み立て）
      // sendMessage()はresponse.dataを直接返すため、HTML文字列が返る
      const exportedHTML = (await sendMessage({
        type: "GENERATE_EXPORT_HTML",
        payload: {
          html,
          themeId: themeId.value,
          filename,
          title,
        },
      })) as string;

      // 2. Content Script側でBlob URL化 + ダウンロード（軽い処理）
      const blobUrl = toBlobUrl(exportedHTML);

      // 3. <a>タグでダウンロード（downloads権限不要）
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename.replace(/\.md$/, ".html");
      a.click();

      // メモリリーク防止: Blob URLを解放
      URL.revokeObjectURL(blobUrl);

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
  }, [html, themeId.value, fileUrl, onExported]);

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
