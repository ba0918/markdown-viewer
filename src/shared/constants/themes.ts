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
 * テーマメタデータ型
 */
export interface ThemeMetadata {
  /** テーマID */
  id: Theme;
  /** テーマ表示名 */
  label: string;
  /** テーマ絵文字 */
  emoji: string;
  /** テーマ説明文 */
  description: string;
}

/**
 * テーマメタデータ一覧
 *
 * UI表示用のテーマ情報。popup/optionsの両ThemeSelectorで共有。
 * DRY原則: テーマの追加・変更時にこの1箇所のみ修正すればよい。
 */
export const THEME_METADATA: readonly ThemeMetadata[] = [
  {
    id: "light",
    label: "Light",
    emoji: "\u2600\uFE0F",
    description: "Simple light theme",
  },
  {
    id: "dark",
    label: "Dark",
    emoji: "\uD83C\uDF19",
    description: "Simple dark theme",
  },
  {
    id: "github",
    label: "GitHub",
    emoji: "\uD83D\uDC19",
    description: "GitHub-style theme",
  },
  {
    id: "minimal",
    label: "Minimal",
    emoji: "\uD83D\uDCDD",
    description: "Minimalist design",
  },
  {
    id: "solarized-light",
    label: "Solarized Light",
    emoji: "\uD83C\uDF05",
    description: "Solarized light theme",
  },
  {
    id: "solarized-dark",
    label: "Solarized Dark",
    emoji: "\uD83C\uDF03",
    description: "Solarized dark theme",
  },
] as const;

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
