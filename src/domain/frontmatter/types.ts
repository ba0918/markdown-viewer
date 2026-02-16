/**
 * YAML Frontmatter型定義
 *
 * @std/yaml で解析される YAML Frontmatter の型定義
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
