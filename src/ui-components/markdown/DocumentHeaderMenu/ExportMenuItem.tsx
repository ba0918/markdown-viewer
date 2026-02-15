/**
 * ExportMenuItemコンポーネント
 *
 * 責務: HTML Export メニュー項目
 * - Background Script: 重い処理（CSS fetch、HTML生成）
 * - Content Script: 軽い処理（Data URL化、<a>ダウンロード）
 *
 * ❌ 禁止: 重いビジネスロジック、services/domain直接呼び出し
 * ✅ OK: 軽量な処理（Data URL変換、DOM操作）
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

/**
 * Data URLを生成（Content Script側の軽量な処理）
 */
const toDataUrl = (html: string): string => {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(html);
  const binaryString = Array.from(bytes, (byte) => String.fromCharCode(byte))
    .join("");
  const base64 = btoa(binaryString);
  return `data:text/html;charset=utf-8;base64,${base64}`;
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

      // 2. Content Script側でData URL化 + ダウンロード（軽い処理）
      const dataUrl = toDataUrl(exportedHTML);

      // 3. <a>タグでダウンロード（downloads権限不要）
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = filename.replace(/\.md$/, ".html");
      a.click();

      // エクスポート完了後のコールバック
      onExported?.();
    } catch (error) {
      console.error("Export error:", error);
      // ユーザーにエラーを通知
      alert(
        `Export failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
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
