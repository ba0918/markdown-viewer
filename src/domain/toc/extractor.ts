/**
 * TOC抽出ロジック
 *
 * Markdownテキストから見出し(H1-H3)を抽出し、TOC用データ（テキスト、レベル、ID）を生成する。
 * marked.lexer()によるトークン解析を使用し、重複IDには連番を付与。
 */

import { marked } from "marked";
import type { TocHeading } from "./types.ts";
import { makeUniqueId } from "../../shared/utils/unique-id.ts";

/**
 * Markdownインライン記法を除去してプレーンテキストを取得
 *
 * marked.lexer()のtoken.textはMarkdown記法を含むため（例: "[link](url)"）、
 * html-processor側の「HTMLタグ除去後テキスト」と入力を揃える必要がある。
 *
 * 処理順序が重要:
 * 1. 画像を先に除去（インライン `![alt](url)` → ``、参照 `![alt][ref]` → ``）
 *    ※markedは`<img>`自己閉じタグに変換し、HTMLタグ除去でalt含め全て消えるため空文字
 * 2. リンク（インライン `[text](url)` → `text`、参照 `[text][ref]` → `text`）
 * 3. HTMLタグ除去（`<em>text</em>` → `text`）
 *
 * @param text marked.lexer()のtoken.text
 * @returns インライン記法を除去したプレーンテキスト
 */
const stripMarkdownInline = (text: string): string => {
  return text
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "")
    .replace(/!\[([^\]]*)\]\[[^\]]*\]/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]*)\]\[[^\]]*\]/g, "$1")
    .replace(/<[^>]+>/g, "");
};

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
      // html-processor側のID生成（HTMLタグ除去後テキスト）と一致させるため、
      // Markdownインライン記法を除去してからID生成する
      const baseId = generateHeadingId(stripMarkdownInline(text));
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
