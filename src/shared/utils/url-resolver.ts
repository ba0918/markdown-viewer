/**
 * URL解決ユーティリティ
 *
 * 責務: 相対リンクを絶対URLに解決する純粋関数
 * 禁止: 副作用、DOM操作、グローバル変数参照
 */

/**
 * リンクが相対リンクかどうかを判定
 * @param href - リンクのhref属性
 * @returns 相対リンクならtrue
 */
export const isRelativeLink = (href: string): boolean => {
  // 絶対URL（http://, https://, file://）や同一ページ内リンク（#）はスキップ
  if (
    href.startsWith("http://") ||
    href.startsWith("https://") ||
    href.startsWith("file://") ||
    href.startsWith("#")
  ) {
    return false;
  }
  return true;
};

/**
 * 相対リンクを絶対URLに解決する純粋関数
 * @param currentUrl - 現在のページのURL
 * @param relativeHref - 相対パス
 * @returns 絶対URL
 */
export const resolveRelativeLink = (
  currentUrl: string,
  relativeHref: string,
): string => {
  const baseUrl = currentUrl.substring(0, currentUrl.lastIndexOf("/") + 1);
  return new URL(relativeHref, baseUrl).href;
};
