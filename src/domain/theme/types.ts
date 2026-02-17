import type { Theme } from "../../shared/types/theme.ts";

/**
 * テーマデータ型定義
 */
export interface ThemeData {
  /** テーマID */
  id: Theme;
  /** テーマCSSファイルのパス（chrome.runtime.getURL() で解決する相対パス） */
  cssPath: string;
}
