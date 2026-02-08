/**
 * TOCツリー構築ロジック
 *
 * 責務: フラットな見出しリストから階層構造のTOCツリーを構築
 * ✅ OK: 純粋関数、単一責任
 * ❌ NG: DOM操作、副作用
 */

import type { TocHeading, TocItem } from "./types.ts";

/**
 * フラットな見出しリストから階層構造のTOCツリーを構築
 *
 * H1 → H2 → H3 の階層構造を作成。
 * - H1の下にH2を配置
 * - H2の下にH3を配置
 * - 同じレベルの見出しは兄弟関係
 *
 * 例:
 * ```
 * H1: Introduction
 *   H2: Overview
 *     H3: Features
 *     H3: Benefits
 *   H2: Getting Started
 * H1: Advanced
 *   H2: Configuration
 * ```
 *
 * @param headings フラットな見出しリスト
 * @returns TOCツリー(階層構造)
 */
export const buildTocTree = (headings: TocHeading[]): TocItem[] => {
  const root: TocItem[] = [];
  const stack: TocItem[] = [];

  for (const heading of headings) {
    const item: TocItem = { ...heading, children: [] };

    // 現在のレベルより深い階層をスタックから削除
    while (stack.length > 0 && stack[stack.length - 1].level >= heading.level) {
      stack.pop();
    }

    if (stack.length === 0) {
      // ルートレベル(H1 または 最初の見出し)
      root.push(item);
    } else {
      // 親要素の子として追加
      stack[stack.length - 1].children.push(item);
    }

    // 現在の項目をスタックに追加
    stack.push(item);
  }

  return root;
};
