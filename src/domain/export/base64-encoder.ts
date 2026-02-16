/**
 * HTML Data URLエンコーダ
 *
 * HTML文字列をBase64エンコードしてData URLに変換する。
 * チャンク分割処理でスタック溢れを防止。
 */

/**
 * HTML文字列をBase64 Data URLに変換
 *
 * UTF-8バイト列をチャンク分割+Array.join()でO(n)文字列結合を実現。
 * String.fromCharCode(...chunk)のスプレッド構文はチャンクサイズ制限で
 * スタック溢れを防止する。
 *
 * @param html - 変換するHTML文字列
 * @returns Base64エンコードされたData URL
 */
export function encodeHtmlToDataUrl(html: string): string {
  const utf8Bytes = new TextEncoder().encode(html);
  const CHUNK_SIZE = 8192;
  const chunks: string[] = [];
  for (let i = 0; i < utf8Bytes.length; i += CHUNK_SIZE) {
    const chunk = utf8Bytes.subarray(i, i + CHUNK_SIZE);
    chunks.push(String.fromCharCode(...chunk));
  }
  const binary = chunks.join("");
  return "data:text/html;base64," + btoa(binary);
}
