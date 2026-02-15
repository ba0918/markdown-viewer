/**
 * Export Service
 *
 * 責務: エクスポート機能のフロー制御
 * - domain層のexportAsHTML()を呼び出し
 * - テーマCSSをfetch
 * - スタンドアロンHTML文字列を生成
 *
 * ダウンロード実行はbackground-handler.tsで
 * chrome.downloads APIを使用して行う
 */

import { exportAsHTML } from "../domain/export/html-exporter.ts";
import { loadTheme } from "../domain/theme/loader.ts";
import type { Theme } from "../shared/types/theme.ts";

// Chrome API型定義
declare const chrome: {
  runtime: {
    getURL: (path: string) => string;
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
   * エクスポート用HTMLを生成
   *
   * 1. テーマCSSを fetch
   * 2. domain層でスタンドアロンHTML生成
   * 3. HTML文字列を返す（ダウンロードはbackground-handler側でchrome.downloads APIで実行）
   *
   * @param params - エクスポートパラメータ
   * @returns エクスポートされたHTML文字列
   */
  async generateExportHTML(params: ExportParams): Promise<string> {
    const { html, themeId, title } = params;

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

    return exportedHTML;
  }
}

// Singleton インスタンス
export const exportService = new ExportService();
