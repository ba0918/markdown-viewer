/**
 * エンコーディングユーティリティ
 *
 * URLセーフなBase64エンコード、Content Script ID生成などの共通処理を提供。
 */

/**
 * URLセーフなBase64エンコード
 *
 * 標準のBase64文字を以下のようにURLセーフに変換:
 * - "+" → "-"
 * - "/" → "_"
 * - "=" → "" (パディング削除)
 *
 * btoa()はLatin-1範囲外の文字でthrowするため、先にUTF-8バイト列へ変換する。
 * （IDNドメイン等の非ASCIIオリジンでもIDを生成できるようにするため）
 *
 * @param str エンコードする文字列
 * @returns URLセーフなBase64エンコード済み文字列
 */
export const toUrlSafeBase64 = (str: string): string => {
  const bytes = new TextEncoder().encode(str);
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join(
    "",
  );
  return btoa(binary).replace(
    /[+/=]/g,
    (c) => ({ "+": "-", "/": "_", "=": "" }[c] ?? c),
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
