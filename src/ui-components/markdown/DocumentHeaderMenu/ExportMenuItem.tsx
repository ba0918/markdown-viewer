/**
 * ExportMenuItemコンポーネント
 *
 * 責務: HTML Export メニュー項目
 * - Background Script: HTML生成 + chrome.downloads APIでダウンロード実行
 * - Content Script: メッセージ送信のみ
 *
 * Content Script (Isolated World) の Blob URL は blob:null になり
 * <a download> が効かないため、Background Script 経由で
 * chrome.downloads API を使用してダウンロードする。
 *
 * ❌ 禁止: 重いビジネスロジック、services/domain直接呼び出し
 * ✅ OK: messaging経由でBackground Scriptに委譲
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

export const ExportMenuItem = ({
  html,
  themeId,
  fileUrl,
  onExported,
}: Props) => {
  const handleExportHTML = useCallback(async () => {
    try {
      // ファイル名を取得（URLエンコードされたマルチバイト文字をデコード）
      // GitHub Gist RAW等では二重エンコード（%25E6...）されている場合があるため、
      // 変化がなくなるまで繰り返しデコードする
      const rawFilename = fileUrl.split("/").pop() || "document.md";
      let filename = rawFilename;
      try {
        let decoded = decodeURIComponent(filename);
        while (decoded !== filename) {
          filename = decoded;
          decoded = decodeURIComponent(filename);
        }
        filename = decoded;
      } catch {
        // decodeURIComponent が失敗する場合はそのまま使用
      }
      const title = filename.replace(/\.(md|markdown)$/, "");

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
