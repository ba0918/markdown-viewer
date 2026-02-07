/**
 * テーマデータ型定義
 */
export interface ThemeData {
  /** テーマID */
  id: string;
  /** テーマCSSファイルのパス（chrome.runtime.getURL() で解決する相対パス） */
  cssPath: string;
}
