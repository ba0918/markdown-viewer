/**
 * TOCツリー構築ロジック
 *
 * フラットな見出しリストから階層構造のTOCツリーを構築する。
 * H1 → H2 → H3の親子関係を自動的に判定し、ネスト構造を生成。
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

    while (stack.length > 0 && stack[stack.length - 1].level >= heading.level) {
      stack.pop();
    }

    if (stack.length === 0) {
      root.push(item);
    } else {
      stack[stack.length - 1].children.push(item);
    }

    stack.push(item);
  }

  return root;
};
