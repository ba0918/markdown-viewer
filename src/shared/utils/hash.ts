/**
 * ハッシュ計算ユーティリティ
 *
 * SHA-256ハッシュを計算してHex文字列として返す。
 * Service Worker環境（SecureContext）で利用可能なcrypto.subtle.digestを使用。
 */

/**
 * 文字列のSHA-256ハッシュを計算
 *
 * @param content - ハッシュを計算する文字列
 * @returns SHA-256ハッシュ（16進数文字列）
 */
export async function computeSHA256(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
