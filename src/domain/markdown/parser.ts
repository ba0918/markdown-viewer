import { marked } from 'marked';

/**
 * Markdown → HTML 変換
 * 純粋関数として実装
 *
 * @param markdown - Markdown文字列
 * @returns HTML文字列（サニタイズ前）
 *
 * 機能:
 * - GitHub Flavored Markdown (GFM) サポート
 * - テーブル、タスクリスト、打ち消し線対応
 * - 改行をbrタグに変換
 *
 * 注意:
 * - サニタイズはsanitizeHTML()で行うため、ここでは行わない
 */
export const parseMarkdown = (markdown: string): string => {
  marked.setOptions({
    gfm: true,           // GitHub Flavored Markdown有効化
    breaks: true,        // 改行をbrタグに変換
    sanitize: false      // DOMPurifyで処理するため無効化
  });

  return marked.parse(markdown) as string;
};
