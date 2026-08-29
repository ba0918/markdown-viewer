import { parseMarkdown } from "../domain/markdown/parser.ts";
import { sanitizeHTML } from "../domain/markdown/sanitizer.ts";
import { addHeadingIds } from "../domain/toc/html-processor.ts";
import { parseFrontmatter } from "../domain/frontmatter/parser.ts";
import type { RenderResult } from "../shared/types/render.ts";
import { tocService } from "./toc-service.ts";

/**
 * Markdownレンダリングサービス（データフローオーケストレーター）
 *
 * Frontmatter解析、Markdown→HTML変換、XSSサニタイズ、見出しID付与、
 * TOC生成を一連のパイプラインとして実行し、レンダリング結果を返す。
 * 各ドメインロジックは個別サービス・domain関数に委譲し、本クラスはフロー制御のみ担当。
 *
 * テーマの適用はcontent層の責務（テーマCSSの読み込みとbodyクラス付与）であり、
 * ここではHTMLにテーマ由来のクラスを埋め込まない。
 * 埋め込むとテーマ変更時に再レンダリングしない限り値が古いままになる。
 */
export class MarkdownService {
  /**
   * Markdownを完全にレンダリング
   *
   * ビジネスフロー:
   * 0. YAML Frontmatter解析（frontmatter）
   * 1. Markdown → HTML変換（parser）
   * 2. XSS対策サニタイズ（sanitizer）
   * 3. 見出しID付与 + 見出し抽出（toc/html-processor）
   * 4. TOC生成（toc-service）
   *
   * @param markdown - Markdown文字列（Frontmatter含む可能性あり）
   * @returns RenderResult（html, rawMarkdown, content, frontmatter, tocItems）
   */
  render(markdown: string): RenderResult {
    const { data: frontmatter, content } = parseFrontmatter(markdown);
    const parsed = parseMarkdown(content);
    // セキュリティファースト: 全Markdown描画でsanitizeHTML必須
    const sanitized = sanitizeHTML(parsed);
    // 見出しIDとToCのIDを同一の走査結果から生成し、両者のズレを防ぐ
    const { html, headings } = addHeadingIds(sanitized);
    const tocItems = tocService.generateToc(headings);

    return {
      html,
      rawMarkdown: markdown,
      content,
      frontmatter,
      tocItems,
    };
  }
}

/**
 * シングルトンインスタンス
 * messaging層から利用
 */
export const markdownService = new MarkdownService();
