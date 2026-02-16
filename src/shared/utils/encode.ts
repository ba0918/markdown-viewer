/**
 * エンコーディングユーティリティ
 *
 * 責務: URLセーフなBase64エンコード等の共通処理
 * DRY原則: service-worker.ts, RemoteUrlSettings.tsx で共通使用
 */

/**
 * URLセーフなBase64エンコード
 *
 * 標準のBase64文字を以下のようにURLセーフに変換:
 * - "+" → "-"
 * - "/" → "_"
 * - "=" → "" (パディング削除)
 *
 * @param str エンコードする文字列
 * @returns URLセーフなBase64エンコード済み文字列
 */
export const toUrlSafeBase64 = (str: string): string => {
  return btoa(str).replace(
    /[+/=]/g,
    (c) => ({ "+": "-", "/": "_", "=": "" }[c] || c),
  );
};

/**
 * Content Script ID を生成
 *
 * カスタムドメイン用Content Scriptの一意なIDを生成
 *
 * @param origin オリジン（例: "https://example.com/*"）
 * @returns Content Script ID（例: "custom-origin-aHR0cHM6Ly9leGFtcGxlLmNvbS8q"）
 */
export const getContentScriptId = (origin: string): string => {
  return `custom-origin-${toUrlSafeBase64(origin)}`;
};
