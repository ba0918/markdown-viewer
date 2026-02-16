/**
 * Markdown関連の定数定義
 *
 * Markdown拡張子の一元管理。content/index.ts の isMarkdownFile() や
 * その他のMarkdownファイル判定ロジックで共通参照する。
 */

/**
 * Markdownファイルとして認識する拡張子の一覧
 *
 * ⚠️ 変更時は manifest.json の content_scripts.matches も同期すること。
 * manifest.json は静的文字列のみ対応のため、動的参照ができない。
 */
export const MARKDOWN_EXTENSIONS = [
  ".md",
  ".markdown",
  ".mdown",
  ".mkd",
] as const;

/** Markdownファイル拡張子の型 */
export type MarkdownExtension = (typeof MARKDOWN_EXTENSIONS)[number];

/**
 * URLパスの拡張子がMarkdownかどうかを判定する正規表現
 *
 * MARKDOWN_EXTENSIONS から動的に生成。
 * 大文字・小文字を区別しない（iフラグ付き）。
 */
export const MARKDOWN_EXTENSION_PATTERN = new RegExp(
  `(${MARKDOWN_EXTENSIONS.map((ext) => ext.replace(".", "\\.")).join("|")})$`,
  "i",
);
