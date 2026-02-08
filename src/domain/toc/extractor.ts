/**
 * TOC抽出ロジック
 *
 * 責務: Markdownテキストから見出し(H1-H3)を抽出し、TOC用データを生成
 * ✅ OK: 純粋関数、単一責任
 * ❌ NG: DOM操作、副作用
 */

import { marked } from 'marked';
import type { TocHeading, TocItem } from './types.ts';

/**
 * 見出しテキストからURLフレンドリーなIDを生成
 *
 * ルール:
 * - 空白とアンダースコアをハイフンに変換
 * - 危険な記号のみ削除(/, :, ~, *, ?, ", <, >, |, \, 括弧類)
 * - 連続ハイフンを1つに
 * - 先頭/末尾のハイフンを削除
 * - 日本語・英数字・一般的な記号は保持
 *
 * 例:
 * - "Hello World!" → "Hello-World!"
 * - "ADR-001: domain/層の導入" → "ADR-001-domain層の導入"
 * - "~~議題: ui/層の命名~~" → "議題-ui層の命名"
 * - "API Reference (v2.0)" → "API-Reference-v2.0"
 *
 * @param text 見出しテキスト
 * @returns URLフレンドリーなID
 */
export const generateHeadingId = (text: string): string => {
  return text
    .trim()
    // 空白とアンダースコアをハイフンに
    .replace(/[\s_]+/g, '-')
    // 危険な記号のみ削除(/, :, ~, *, ?, ", <, >, |, \, 括弧類)
    .replace(/[/:~*?"<>|\\()[\]{}]+/g, '')
    // 連続ハイフンを1つに
    .replace(/-+/g, '-')
    // 先頭/末尾のハイフン削除
    .replace(/^-+|-+$/g, '');
};

/**
 * Markdownテキストから見出し(H1-H3)を抽出
 *
 * marked.lexer()を使用してトークン解析し、heading tokenのみを抽出。
 * DOM操作不要で、純粋関数として実装。
 *
 * 重複ID対策: 同じIDが既に存在する場合、GitHubと同様に連番を付与
 * 例: "ステータス", "ステータス-1", "ステータス-2"
 * ※ 連番は`id`フィールドのみに付与され、`text`(表示文言)には影響しない
 *
 * @param markdown Markdownテキスト
 * @returns 見出しリスト(フラット構造、重複IDは連番付き)
 */
export const extractHeadings = (markdown: string): TocHeading[] => {
  const tokens = marked.lexer(markdown);
  const headings: TocHeading[] = [];
  const idCounts = new Map<string, number>(); // ID重複カウント用

  for (const token of tokens) {
    if (token.type === 'heading' && token.depth <= 3) {
      const text = token.text;
      let baseId = generateHeadingId(text);
      let id = baseId;

      // 重複ID検出: 既に同じIDが存在する場合、連番を付与
      if (idCounts.has(baseId)) {
        const count = idCounts.get(baseId)!;
        id = `${baseId}-${count}`;
        idCounts.set(baseId, count + 1);
      } else {
        idCounts.set(baseId, 1);
      }

      headings.push({
        level: token.depth as 1 | 2 | 3,
        text, // 表示文言はそのまま(連番なし)
        id,   // IDには必要に応じて連番付き
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
 * @returns TOCツリー(現状はフラット)
 */
export const buildTocTree = (headings: TocHeading[]): TocItem[] => {
  return headings.map((h) => ({ ...h, children: [] }));
};
