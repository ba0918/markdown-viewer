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
