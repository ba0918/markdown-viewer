/**
 * テーマ関連定数
 *
 * 全レイヤーで共有される定数を定義
 * DRY原則: テーマのバリデーションやデフォルト値を一元管理
 */

import type { Theme } from "../types/theme.ts";

/**
 * 有効なテーマID一覧
 *
 * StateManagerのバリデーション、型定義、テーマローダーで共有
 */
export const VALID_THEMES: readonly Theme[] = [
  "light",
  "dark",
  "github",
  "minimal",
  "solarized-light",
  "solarized-dark",
] as const;

/**
 * デフォルトテーマ
 *
 * 不正な値が入力された場合や初期状態で使用
 */
export const DEFAULT_THEME: Theme = "light";

/**
 * テーマCSSファイルの相対パスを生成
 *
 * chrome.runtime.getURL() に渡すための相対パスを返す。
 * 実際のURL変換は呼び出し側で chrome.runtime.getURL() を適用する。
 *
 * @param theme - テーマID
 * @returns テーマCSSの相対パス（例: "content/styles/themes/light.css"）
 */
export const getThemeCssPath = (theme: Theme): string => {
  return `content/styles/themes/${theme}.css`;
};
