/**
 * Export Service
 *
 * 責務: エクスポート機能のフロー制御
 * - domain層のexportAsHTML()を呼び出し
 * - テーマCSSをfetch
 * - Data URL生成
 * - chrome.downloads.download()でダウンロード
 */

import { exportAsHTML } from "../domain/export/html-exporter.ts";
import { loadTheme } from "../domain/theme/loader.ts";
import type { Theme } from "../shared/types/theme.ts";

// Chrome API型定義
declare const chrome: {
  runtime: {
    getURL: (path: string) => string;
  };
  downloads: {
    download: (options: {
      url: string;
      filename: string;
      saveAs?: boolean;
    }) => Promise<number>;
  };
};

export interface ExportParams {
  /** レンダリング済みHTML */
  html: string;
  /** テーマID */
  themeId: Theme;
  /** ファイル名 (.md拡張子) */
  filename: string;
  /** ドキュメントタイトル */
  title?: string;
}

/**
 * Export Service Class
 */
export class ExportService {
  /**
   * HTMLファイルとしてエクスポート
   *
   * 1. テーマCSSを fetch
   * 2. domain層でスタンドアロンHTML生成
   * 3. Data URL化
   * 4. chrome.downloads.download()でダウンロード
   *
   * @param params - エクスポートパラメータ
   * @returns エクスポートされたHTML文字列
   */
  async exportAsHTMLFile(params: ExportParams): Promise<string> {
    const { html, themeId, filename, title } = params;

    // 1. テーマデータを取得
    const theme = loadTheme(themeId);

    // 2. テーマCSSをfetch（background scriptなのでchrome.runtime.getURL使える）
    const cssUrl = chrome.runtime.getURL(theme.cssPath);
    const response = await fetch(cssUrl);
    const themeCss = await response.text();

    // 3. domain層でスタンドアロンHTML生成
    const exportedHTML = exportAsHTML({
      html,
      themeId,
      themeCss,
      title,
    });

    // 4. Data URL化（日本語対応のためbase64エンコード）
    const dataUrl = this.toDataUrl(exportedHTML);

    // 5. chrome.downloads.download()でダウンロード
    const downloadFilename = filename.replace(/\.md$/, ".html");
    await chrome.downloads.download({
      url: dataUrl,
      filename: downloadFilename,
      saveAs: true, // ユーザーに保存先を選択させる
    });

    return exportedHTML;
  }

  /**
   * HTML文字列をData URLに変換
   *
   * 日本語などのマルチバイト文字を含む場合、
   * TextEncoder → btoa でbase64エンコード
   *
   * @param html - HTML文字列
   * @returns Data URL
   */
  private toDataUrl(html: string): string {
    // UTF-8バイト列に変換
    const encoder = new TextEncoder();
    const bytes = encoder.encode(html);

    // バイト列を文字列に変換してbase64エンコード
    const binaryString = Array.from(bytes, (byte) => String.fromCharCode(byte))
      .join("");
    const base64 = btoa(binaryString);

    return `data:text/html;charset=utf-8;base64,${base64}`;
  }
}

// Singleton インスタンス
export const exportService = new ExportService();
