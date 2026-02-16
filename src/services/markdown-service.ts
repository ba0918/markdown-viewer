import { parseMarkdown } from "../domain/markdown/parser.ts";
import { sanitizeHTML } from "../domain/markdown/sanitizer.ts";
import { applyTheme } from "../domain/theme/applier.ts";
import { addHeadingIds } from "../domain/toc/html-processor.ts";
import { parseFrontmatter } from "../domain/frontmatter/parser.ts";
import type { ThemeData } from "../domain/theme/types.ts";
import type { RenderResult } from "../shared/types/render.ts";

/**
 * Markdownレンダリングサービス
 *
 * Frontmatter解析、Markdown→HTML変換、XSSサニタイズ、見出しID付与、テーマ適用を
 * 一連のパイプラインとして実行し、レンダリング結果を返す。
 */
export class MarkdownService {
  /**
   * Markdownを完全にレンダリング
   *
   * ビジネスフロー:
   * 0. YAML Frontmatter解析（frontmatter）
   * 1. Markdown → HTML変換（parser）
   * 2. XSS対策サニタイズ（sanitizer）
   * 3. 見出しID付与（toc）
   * 4. テーマ適用（theme applier）
   *
   * @param markdown - Markdown文字列（Frontmatter含む可能性あり）
   * @param theme - テーマデータ
   * @returns RenderResult（html, rawMarkdown, content, frontmatter）
   */
  render(markdown: string, theme: ThemeData): RenderResult {
    const { data: frontmatter, content } = parseFrontmatter(markdown);
    const parsed = parseMarkdown(content);
    // セキュリティファースト: 全Markdown描画でsanitizeHTML必須
    const sanitized = sanitizeHTML(parsed);
    const withHeadingIds = addHeadingIds(sanitized);
    const html = applyTheme(withHeadingIds, theme);

    return {
      html,
      rawMarkdown: markdown,
      content,
      frontmatter,
    };
  }
}

/**
 * シングルトンインスタンス
 * messaging層から利用
 */
export const markdownService = new MarkdownService();
