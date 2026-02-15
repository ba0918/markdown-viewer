/**
 * ExportMenuItemコンポーネント
 *
 * 責務: HTML Export メニュー項目、messaging経由でエクスポート実行
 * ❌ 禁止: ビジネスロジック、services/domain直接呼び出し
 */

import { h as _h } from "preact";
import { useCallback } from "preact/hooks";
import type { Signal } from "@preact/signals";
import { sendMessage } from "../../../messaging/client.ts";
import type { Theme } from "../../../shared/types/theme.ts";

interface Props {
  /** レンダリング済みHTML */
  html: string;
  /** テーマID Signal */
  themeId: Signal<Theme>;
  /** ファイルURL (file://... または http://localhost:...) */
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
      // ファイル名を取得
      const filename = fileUrl.split("/").pop() || "document.md";
      const title = filename.replace(/\.md$/, "");

      // messaging経由でエクスポート実行
      await sendMessage({
        type: "EXPORT_HTML",
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
