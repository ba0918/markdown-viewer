import { parseMarkdown } from "../domain/markdown/parser.ts";
import { sanitizeHTML } from "../domain/markdown/sanitizer.ts";
import { applyTheme } from "../domain/theme/applier.ts";
import { addHeadingIds } from "../domain/toc/html-processor.ts";
import { parseFrontmatter } from "../domain/frontmatter/parser.ts";
import type { ThemeData } from "../domain/theme/types.ts";
import type { RenderResult } from "../shared/types/render.ts";
import { tocService } from "./toc-service.ts";

/**
 * Markdownレンダリングサービス（データフローオーケストレーター）
 *
 * Frontmatter解析、Markdown→HTML変換、XSSサニタイズ、見出しID付与、テーマ適用、
 * TOC生成を一連のパイプラインとして実行し、レンダリング結果を返す。
 * 各ドメインロジックは個別サービス・domain関数に委譲し、本クラスはフロー制御のみ担当。
 */
export class MarkdownService {
  /**
   * Markdownを完全にレンダリング
   *
   * ビジネスフロー:
   * 0. YAML Frontmatter解析（frontmatter）
   * 1. Markdown → HTML変換（parser）
   * 2. XSS対策サニタイズ（sanitizer）
   * 3. 見出しID付与（toc/html-processor）
   * 4. テーマ適用（theme applier）
   * 5. TOC生成（toc-service）
   *
   * @param markdown - Markdown文字列（Frontmatter含む可能性あり）
   * @param theme - テーマデータ
   * @returns RenderResult（html, rawMarkdown, content, frontmatter, tocItems）
   */
  render(markdown: string, theme: ThemeData): RenderResult {
    const { data: frontmatter, content } = parseFrontmatter(markdown);
    const parsed = parseMarkdown(content);
    // セキュリティファースト: 全Markdown描画でsanitizeHTML必須
    const sanitized = sanitizeHTML(parsed);
    const withHeadingIds = addHeadingIds(sanitized);
    const html = applyTheme(withHeadingIds, theme);
    // TOC生成をTocServiceに委譲（Frontmatter除外済みのcontentを使用）
    const tocItems = tocService.generateToc(content);

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
