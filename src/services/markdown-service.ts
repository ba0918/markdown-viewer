import { parseMarkdown } from '../domain/markdown/parser.ts';
import { sanitizeHTML } from '../domain/markdown/sanitizer.ts';
import { applyTheme } from '../domain/theme/applier.ts';
import type { ThemeData } from '../domain/theme/types.ts';

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
   * 1. Markdown → HTML変換（parser）
   * 2. XSS対策サニタイズ（sanitizer）
   * 3. テーマ適用（theme applier）
   *
   * @param markdown - Markdown文字列
   * @param theme - テーマデータ
   * @returns テーマ適用済み・サニタイズ済みHTML文字列
   */
  async render(markdown: string, theme: ThemeData): Promise<string> {
    // 1. Markdown解析（domain/markdown）
    const parsed = parseMarkdown(markdown);

    // 2. サニタイズ（domain/markdown）
    // セキュリティファースト: 全Markdown描画でDOMPurify必須
    const sanitized = sanitizeHTML(parsed);

    // 3. テーマ適用（domain/theme）
    return applyTheme(sanitized, theme);
  }
}

/**
 * シングルトンインスタンス
 * messaging層から利用
 */
export const markdownService = new MarkdownService();
