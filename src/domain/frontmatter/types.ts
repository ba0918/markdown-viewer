/**
 * YAML Frontmatter型定義
 *
 * gray-matterライブラリで解析されるYAML Frontmatterの型定義
 */

/**
 * Frontmatter解析結果
 */
export interface FrontmatterResult {
  /**
   * 解析されたYAMLデータ（オブジェクト）
   * Frontmatterがない場合は空オブジェクト {}
   */
  data: Record<string, unknown>;

  /**
   * Frontmatter除外済みのコンテンツ
   * Frontmatterがない場合は元のテキストそのまま
   */
  content: string;

  /**
   * 元のテキスト（Frontmatter含む）
   */
  original: string;
}

/**
 * 一般的なFrontmatterデータ構造（オプショナル）
 * Jekyll/Hugo等でよく使われるフィールド
 */
export interface CommonFrontmatterData {
  title?: string;
  date?: string | Date;
  tags?: string[];
  description?: string;
  author?: string;
  draft?: boolean;
  [key: string]: unknown; // その他のカスタムフィールド
}
