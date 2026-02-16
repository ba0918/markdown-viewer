/**
 * ファイル名解析ユーティリティ
 *
 * URLからファイル名を抽出し、表示用タイトルに変換する純粋関数群。
 * ExportMenuItem.tsx からビジネスロジックを分離。
 */

import { MARKDOWN_EXTENSIONS } from "../constants/markdown.ts";

/**
 * Markdown拡張子マッチパターン（大文字小文字不問）
 *
 * MARKDOWN_EXTENSIONS 定数から動的生成して一貫性を保つ。
 */
const MARKDOWN_TITLE_PATTERN = new RegExp(
  `(${MARKDOWN_EXTENSIONS.map((ext) => ext.replace(".", "\\.")).join("|")})$`,
  "i",
);

/**
 * URLからファイル名を抽出
 *
 * URLエンコードされたマルチバイト文字をデコードする。
 * GitHub Gist RAW等での二重エンコード（%25E6... 等）にも対応し、
 * 変化がなくなるまで繰り返しデコードする。
 *
 * @param url - ファイルURL
 * @param fallback - 抽出失敗時のデフォルトファイル名
 * @returns デコード済みファイル名
 */
export const extractFilenameFromUrl = (
  url: string,
  fallback = "document.md",
): string => {
  const rawFilename = url.split("/").pop() || fallback;
  let filename = rawFilename;
  try {
    let decoded = decodeURIComponent(filename);
    while (decoded !== filename) {
      filename = decoded;
      decoded = decodeURIComponent(filename);
    }
    filename = decoded;
  } catch {
    // decodeURIComponent が失敗する場合はそのまま使用
  }
  return filename;
};

/**
 * ファイル名からタイトルを抽出（Markdown拡張子を除去）
 *
 * MARKDOWN_EXTENSIONS 定数と同期した拡張子パターンを使用。
 *
 * @param filename - ファイル名
 * @returns 拡張子を除去したタイトル
 */
export const extractTitleFromFilename = (filename: string): string => {
  return filename.replace(MARKDOWN_TITLE_PATTERN, "");
};
