/**
 * オリジンバリデーションユーティリティ
 *
 * リモートURL設定でのカスタムオリジン入力値を検証する純粋関数。
 * セキュリティ上、httpsのみ許可しワイルドカードパターンを要求する。
 */

import type { ValidationResult } from "./validators.ts";

/**
 * カスタムオリジンの入力値をバリデーション
 *
 * チェック項目（順序通り）:
 * 1. 空文字チェック
 * 2. https:// で始まるか
 * 3. /* で終わるか（ワイルドカードパターン）
 * 4. 既存オリジンとの重複チェック
 *
 * @param origin - 検証するオリジン文字列
 * @param existingOrigins - 既に登録済みのオリジン文字列配列
 * @returns バリデーション結果（valid: true/false, error?: エラーメッセージ）
 */
export const validateOrigin = (
  origin: string,
  existingOrigins: string[] = [],
): ValidationResult => {
  // 基本的なバリデーション
  if (!origin.trim()) {
    return { valid: false, error: "Origin cannot be empty" };
  }

  // httpsのみ許可（セキュリティ）
  if (!origin.startsWith("https://")) {
    return { valid: false, error: "Origin must start with https://" };
  }

  // ワイルドカードパターンチェック
  if (!origin.endsWith("/*")) {
    return {
      valid: false,
      error: "Origin must end with /* (e.g., https://example.com/*)",
    };
  }

  // 既に追加済みかチェック
  if (existingOrigins.includes(origin)) {
    return { valid: false, error: "This origin is already added" };
  }

  return { valid: true };
};
