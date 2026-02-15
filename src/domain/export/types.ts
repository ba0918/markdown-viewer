/**
 * Export domain types
 *
 * 責務: エクスポート機能の型定義
 */

import type { Theme } from "../../shared/types/theme.ts";

/**
 * HTMLエクスポートオプション
 */
export interface ExportOptions {
  /** レンダリング済みHTML */
  html: string;
  /** テーマID */
  themeId: Theme;
  /** テーマCSS本文 */
  themeCss: string;
  /** ドキュメントタイトル */
  title?: string;
  /** メタデータ */
  metadata?: {
    author?: string;
    description?: string;
  };
}
