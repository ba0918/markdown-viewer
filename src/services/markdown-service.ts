import { parseMarkdown } from "../domain/markdown/parser.ts";
import { sanitizeHTML } from "../domain/markdown/sanitizer.ts";
import { applyTheme } from "../domain/theme/applier.ts";
import { addHeadingIds } from "../domain/toc/html-processor.ts";
import { parseFrontmatter } from "../domain/frontmatter/parser.ts";
import type { ThemeData } from "../domain/theme/types.ts";
import type { RenderResult } from "../shared/types/render.ts";

/**
 * Markdownレンダリングサービス
 * 責務: 複数のドメインロジックを組み合わせて1つのビジネスフローを実現
 *
 * 重要: この層でビジネスフローを実装。messaging層には書かない！
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
    // 0. Frontmatter解析（domain/frontmatter）
    const { data: frontmatter, content } = parseFrontmatter(markdown);

    // 1. Markdown解析（domain/markdown）
    // Frontmatter除外済みのcontentを使用
    const parsed = parseMarkdown(content);

    // 2. サニタイズ（domain/markdown）
    // セキュリティファースト: 全Markdown描画でsanitizeHTML必須
    const sanitized = sanitizeHTML(parsed);

    // 3. 見出しにID属性を付与（domain/toc）
    // TOC機能のために、H1-H3タグにid属性を追加
    const withHeadingIds = addHeadingIds(sanitized);

    // 4. テーマ適用（domain/theme）
    const html = applyTheme(withHeadingIds, theme);

    // 5. 結果を返す
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
