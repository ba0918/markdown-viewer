/**
 * TOC抽出ロジック
 *
 * 責務: Markdownテキストから見出し(H1-H3)を抽出し、TOC用データを生成
 * ✅ OK: 純粋関数、単一責任
 * ❌ NG: DOM操作、副作用
 */

import { marked } from "marked";
import type { TocHeading } from "./types.ts";
import { makeUniqueId } from "../../shared/utils/unique-id.ts";

/**
 * 見出しテキストからURLフレンドリーなIDを生成
 *
 * ルール:
 * - 空白とアンダースコアをハイフンに変換
 * - バックティック(`)を除去（HTML側のID生成と一致させるため）
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
    // HTML側の<code>タグ変換と一致させるため
    .replace(/`/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/[/:~*?"<>|\\()[\]{}]+/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
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
  const idCounts = new Map<string, number>();

  for (const token of tokens) {
    if (token.type === "heading" && token.depth <= 3) {
      const text = token.text;
      const baseId = generateHeadingId(text);
      const id = makeUniqueId(baseId, idCounts);

      headings.push({
        level: token.depth as 1 | 2 | 3,
        text,
        id,
      });
    }
  }

  return headings;
};

// buildTocTree は tree-builder.ts に移動しました
// 後方互換性のために re-export
export { buildTocTree } from "./tree-builder.ts";
