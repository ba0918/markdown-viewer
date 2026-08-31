/**
 * URL解決ユーティリティ
 *
 * 相対リンク（例: docs/README.md）を絶対URL（例: file://path/docs/README.md）に解決する。
 */

import { getUrlScheme, normalizeUrlAttributeValue } from "./url-scheme.ts";

/**
 * content層で解決した相対リンクの遷移先として許可するスキーム
 *
 * Markdownドキュメント間の移動に必要なものだけを許可する。
 */
export const NAVIGABLE_SCHEMES = ["http:", "https:", "file:"] as const;

/**
 * リンクが相対リンクかどうかを判定
 *
 * スキームを持つURL（http:, javascript: など）と同一ページ内リンク（#）は対象外。
 * 判定前に実体参照・制御文字を正規化するため、`java<TAB>script:` のような
 * 難読化されたスキームも「相対リンクではない」と正しく判定できる。
 *
 * @param href - リンクのhref属性
 * @returns 相対リンクならtrue
 */
export const isRelativeLink = (href: string): boolean => {
  const normalized = normalizeUrlAttributeValue(href);
  if (normalized.startsWith("#")) {
    return false;
  }
  return getUrlScheme(normalized) === null;
};

/**
 * 解決済み絶対URLが遷移先として安全かを判定
 *
 * `new URL()` は `java<TAB>script:alert(1)` のような値を `javascript:alert(1)`
 * に正規化してしまうため、解決「後」のスキームを許可リストで検証する
 * （多層防御: サニタイザを通過した値であっても再検証する）。
 *
 * @param url - 解決済みの絶対URL
 * @returns 遷移して良い場合true
 */
export const isNavigableUrl = (url: string): boolean => {
  const scheme = getUrlScheme(url);
  return scheme !== null &&
    (NAVIGABLE_SCHEMES as readonly string[]).includes(scheme);
};

/**
 * 相対リンクを絶対URLに解決する純粋関数
 *
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
