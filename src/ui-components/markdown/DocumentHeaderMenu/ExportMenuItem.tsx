/**
 * ExportMenuItemコンポーネント
 *
 * 責務: HTML Export メニュー項目
 * - DOM上のレンダリング済みHTMLを取得（Mermaid SVG・MathJax SVG含む）
 * - ローカル画像をBase64 Data URLに変換
 * - Background Script: HTML生成 + chrome.downloads APIでダウンロード実行
 * - Content Script: メッセージ送信のみ
 *
 * Content Script (Isolated World) の Blob URL は blob:null になり
 * <a download> が効かないため、Background Script 経由で
 * chrome.downloads API を使用してダウンロードする。
 *
 * ❌ 禁止: 重いビジネスロジック、services/domain直接呼び出し
 * ✅ OK: messaging経由でBackground Scriptに委譲、DOM操作（UI層の責務）
 */

import { h as _h } from "preact";
import { useCallback } from "preact/hooks";
import type { Signal } from "@preact/signals";
import { sendMessage } from "../../../messaging/client.ts";
import type { Theme } from "../../../shared/types/theme.ts";
import { showToast } from "../../shared/Toast/index.ts";

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

/**
 * ローカル画像をBase64 Data URLに変換
 *
 * HTML文字列内の<img>タグを走査し、ローカル画像（相対パス・file://）を
 * Base64 Data URLに変換する。リモート画像（http/https）はスキップ。
 *
 * @param html - 変換対象のHTML文字列
 * @param baseUrl - 相対パスの基準URL（fileUrl）
 * @returns Base64変換済みのHTML文字列
 */
const convertLocalImagesToBase64 = async (
  html: string,
  baseUrl: string,
): Promise<string> => {
  // DOMParserでHTMLを解析
  const parser = new DOMParser();
  const doc = parser.parseFromString(
    `<div>${html}</div>`,
    "text/html",
  );
  const container = doc.body.firstElementChild;
  if (!container) return html;

  const images = container.querySelectorAll("img[src]");
  const baseUrlDir = baseUrl.substring(0, baseUrl.lastIndexOf("/") + 1);

  for (const img of images) {
    const src = img.getAttribute("src");
    if (!src) continue;

    // リモート画像はスキップ（http/https）
    if (src.startsWith("http://") || src.startsWith("https://")) continue;

    // 既にData URLの場合はスキップ
    if (src.startsWith("data:")) continue;

    try {
      // 相対パスを絶対URLに解決
      const absoluteUrl = new URL(src, baseUrlDir).href;

      // 画像をfetchしてBase64に変換
      const response = await fetch(absoluteUrl);
      if (!response.ok) continue;

      const blob = await response.blob();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      img.setAttribute("src", dataUrl);
    } catch {
      // 変換失敗時は元のsrcを保持（ベストエフォート）
      console.warn(`Failed to convert image to Base64: ${src}`);
    }
  }

  return container.innerHTML;
};

export const ExportMenuItem = ({
  getRenderedHTML,
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

      // DOM上のレンダリング済みHTMLを取得（Mermaid SVG・MathJax SVG含む）
      let html = getRenderedHTML();

      // ローカル画像をBase64 Data URLに変換
      html = await convertLocalImagesToBase64(html, fileUrl);

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
