/**
 * URL種別判定ユーティリティ
 *
 * Hot ReloadのローカルURL判定などで使用する共通関数。
 */

/**
 * ローカルURL判定
 *
 * Hot Reloadの対象をローカルファイル/localhostに制限するために使用。
 * リモートURLへの不必要なポーリングを防止する。
 *
 * 対象:
 * - file:// プロトコル
 * - localhost（http/https）
 * - 127.0.0.1（IPv4ループバック）
 * - [::1] / ::1（IPv6ループバック）
 *
 * @param url - 判定するURL文字列
 * @returns ローカルURLの場合true
 */
export const isLocalUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "file:") return true;
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      const hostname = parsed.hostname;
      return hostname === "localhost" ||
        hostname === "127.0.0.1" ||
        hostname === "[::1]" ||
        hostname === "::1";
    }
    return false;
  } catch {
    return false;
  }
};
