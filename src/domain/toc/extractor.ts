/**
 * TOC抽出ロジック
 *
 * 責務: Markdownテキストから見出し（H1-H3）を抽出し、TOC用データを生成
 * ✅ OK: 純粋関数、単一責任
 * ❌ NG: DOM操作、副作用
 */

import { marked } from 'marked';
import type { TocHeading, TocItem } from './types.ts';

/**
 * 見出しテキストからURLフレンドリーなIDを生成
 *
 * ルール:
 * - 小文字化
 * - 英数字とハイフン以外を削除
 * - 空白とアンダースコアをハイフンに変換
 * - 先頭/末尾のハイフンを削除
 *
 * 例:
 * - "Hello World!" → "hello-world"
 * - "API Reference (v2.0)" → "api-reference-v20"
 * - "日本語見出し" → ""（空文字）
 *
 * @param text 見出しテキスト
 * @returns URLフレンドリーなID
 */
export const generateHeadingId = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // 英数字、空白、ハイフン以外を削除
    .replace(/[\s_]+/g, '-') // 空白とアンダースコアをハイフンに
    .replace(/^-+|-+$/g, ''); // 先頭/末尾のハイフン削除
};

/**
 * Markdownテキストから見出し（H1-H3）を抽出
 *
 * marked.lexer()を使用してトークン解析し、heading tokenのみを抽出。
 * DOM操作不要で、純粋関数として実装。
 *
 * @param markdown Markdownテキスト
 * @returns 見出しリスト（フラット構造）
 */
export const extractHeadings = (markdown: string): TocHeading[] => {
  const tokens = marked.lexer(markdown);
  const headings: TocHeading[] = [];

  for (const token of tokens) {
    if (token.type === 'heading' && token.depth <= 3) {
      const text = token.text;
      const id = generateHeadingId(text);

      // IDが空の場合はスキップ（日本語のみの見出しなど）
      if (!id) continue;

      headings.push({
        level: token.depth as 1 | 2 | 3,
        text,
        id,
      });
    }
  }

  return headings;
};

/**
 * フラットな見出しリストから階層構造のTOCツリーを構築
 *
 * 現在の実装: シンプルにフラットリストをそのまま返す
 * TODO: 将来的に階層構造を構築する場合はこの関数を拡張
 *
 * @param headings フラットな見出しリスト
 * @returns TOCツリー（現状はフラット）
 */
export const buildTocTree = (headings: TocHeading[]): TocItem[] => {
  return headings.map((h) => ({ ...h, children: [] }));
};
