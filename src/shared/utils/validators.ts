/**
 * バリデーションユーティリティ
 *
 * 入力値のバリデーション結果を返す純粋関数群。
 */

/** Hot Reload最小間隔（ms） */
export const HOT_RELOAD_MIN_INTERVAL = 2000;

/**
 * バリデーション結果
 */
export interface ValidationResult {
  /** バリデーション通過ならtrue */
  valid: boolean;
  /** エラーメッセージ（valid=falseの場合のみ） */
  error?: string;
}

/**
 * Hot Reloadのインターバル値をバリデーション
 *
 * ルール:
 * - NaN またはゼロ: 無効
 * - HOT_RELOAD_MIN_INTERVAL (2000ms) 未満: 無効
 * - それ以外: 有効
 *
 * @param value - 検証する値（パース済みの数値）
 * @returns バリデーション結果
 */
export const validateHotReloadInterval = (value: number): ValidationResult => {
  if (isNaN(value) || value === 0) {
    return { valid: false, error: "Please enter a value of 1 or greater" };
  }
  if (value < HOT_RELOAD_MIN_INTERVAL) {
    return {
      valid: false,
      error: `Minimum interval is ${HOT_RELOAD_MIN_INTERVAL}ms (2 seconds)`,
    };
  }
  return { valid: true };
};

/**
 * Hot Reloadのインターバル値を安全な範囲に正規化
 *
 * 最小値 HOT_RELOAD_MIN_INTERVAL ms を保証する。
 *
 * @param interval - 入力インターバル値（ms）
 * @returns 正規化されたインターバル値
 */
export const normalizeHotReloadInterval = (interval: number): number => {
  return Math.max(interval, HOT_RELOAD_MIN_INTERVAL);
};
