/**
 * URL解決ユーティリティ
 *
 * 相対リンク（例: docs/README.md）を絶対URL（例: file://path/docs/README.md）に解決する。
 */

/**
 * リンクが相対リンクかどうかを判定
 * @param href - リンクのhref属性
 * @returns 相対リンクならtrue
 */
export const isRelativeLink = (href: string): boolean => {
  const lower = href.toLowerCase();
  if (
    lower.startsWith("http://") ||
    lower.startsWith("https://") ||
    lower.startsWith("file://") ||
    lower.startsWith("#") ||
    lower.startsWith("mailto:") ||
    lower.startsWith("tel:") ||
    lower.startsWith("data:") ||
    lower.startsWith("javascript:") ||
    lower.startsWith("vbscript:")
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
