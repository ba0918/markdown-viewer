import { marked } from "marked";
import { markedHighlight } from "marked-highlight";
import { highlightCode } from "./highlighter.ts";

/**
 * marked 初期化（シングルトンパターン）
 * 拡張機能を登録
 */
let initialized = false;

const initializeMarked = () => {
  if (initialized) return;

  marked.use(markedHighlight({
    langPrefix: "hljs language-",
    highlight: highlightCode,
  }));

  marked.use({
    gfm: true,
    breaks: true,
  });

  initialized = true;
};

/**
 * Markdown → HTML 変換
 * 純粋関数として実装
 *
 * @param markdown - Markdown文字列
 * @returns HTML文字列（サニタイズ前、シンタックスハイライト済み）
 *
 * 機能:
 * - GitHub Flavored Markdown (GFM) サポート
 * - テーブル、タスクリスト、打ち消し線対応
 * - 改行をbrタグに変換
 * - コードブロックのシンタックスハイライト（highlight.js）
 *
 * 注意:
 * - サニタイズはsanitizeHTML()で行うため、ここでは行わない
 * - シンタックスハイライトは marked-highlight 拡張で実行
 */
export const parseMarkdown = (markdown: string): string => {
  initializeMarked();
  return marked.parse(markdown) as string;
};
