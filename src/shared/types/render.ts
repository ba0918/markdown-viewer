/**
 * Markdownレンダリング結果の型定義
 */

import type { TocItem } from "./toc.ts";

/**
 * Markdownレンダリング結果
 *
 * services/markdown-service.ts の render() が返すオブジェクト
 */
export interface RenderResult {
  /**
   * テーマ適用済み・サニタイズ済みHTML文字列
   * Viewモードで表示
   */
  html: string;

  /**
   * 元のMarkdownテキスト（Frontmatter含む）
   * Rawモードで表示
   */
  rawMarkdown: string;

  /**
   * Frontmatter除外済みのコンテンツ
   * （参考用、通常はhtmlを使用）
   */
  content: string;

  /**
   * 解析されたFrontmatterデータ
   * 将来的に使う可能性あり（現在は非表示）
   */
  frontmatter: Record<string, unknown>;

  /**
   * TOCアイテムの階層構造
   * TocServiceで生成されたMarkdown見出しのツリー
   */
  tocItems: TocItem[];
}
