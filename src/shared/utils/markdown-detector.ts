/**
 * Markdownファイル判定ユーティリティ
 *
 * URL・パス・Content-TypeからファイルがMarkdown形式かどうかを判定する。
 * content/index.ts のエントリーポイントから分離し、テスト可能にした純粋関数。
 */

import { MARKDOWN_EXTENSION_PATTERN } from "../constants/markdown.ts";

/**
 * Markdownファイル判定に必要なパラメータ
 */
export interface MarkdownDetectionParams {
  /** ページの完全URL（例: "file:///home/user/doc.md"） */
  url: string;
  /** URLのパス部分（例: "/home/user/doc.md"） */
  pathname: string;
  /** レスポンスの Content-Type（例: "text/markdown"）。取得不可の場合は空文字列 */
  contentType: string;
}

/**
 * Markdownファイル判定（ローカル＋リモートURL対応）
 *
 * 判定ルール:
 * - ローカルファイル（file://）とlocalhost: パスの拡張子で判定
 * - リモートURL: URL拡張子優先、拡張子なしの場合のみContent-Typeで判定
 * - text/plain は誤検知が多いため判定に使用しない
 *
 * @param params - 判定に必要なパラメータ
 * @returns Markdownファイルの場合true
 */
export const isMarkdownByContext = (
  params: MarkdownDetectionParams,
): boolean => {
  const { url, pathname, contentType } = params;

  // ローカルファイルとlocalhost: パスの拡張子で判定
  if (url.startsWith("file://") || url.startsWith("http://localhost")) {
    return MARKDOWN_EXTENSION_PATTERN.test(pathname);
  }

  // リモートURL: 拡張子で判定
  const hasMarkdownExtension = MARKDOWN_EXTENSION_PATTERN.test(url);
  if (hasMarkdownExtension) {
    return true;
  }

  // 拡張子なしの場合: Content-Typeで判定
  return contentType.includes("text/markdown");
};
