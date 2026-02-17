/**
 * TOC生成サービス
 *
 * Markdownコンテンツからの目次（Table of Contents）生成を担当するサービス。
 * domain層の純粋関数（extractHeadings → normalizeHeadingLevels → buildTocTree）を
 * パイプラインとして組み合わせ、TOCの階層構造を構築する。
 *
 * MarkdownServiceから呼ばれ、RenderResult.tocItemsとして結果を返す。
 */

import { extractHeadings } from "../domain/toc/extractor.ts";
import { normalizeHeadingLevels } from "../domain/toc/normalizer.ts";
import { buildTocTree } from "../domain/toc/tree-builder.ts";
import type { TocItem } from "../shared/types/toc.ts";

/**
 * TOC生成サービスクラス
 */
export class TocService {
  /**
   * MarkdownコンテンツからTOCアイテムツリーを生成
   *
   * 処理フロー:
   * 1. 見出し抽出（extractHeadings） - H1-H3のATX見出しを検出
   * 2. レベル正規化（normalizeHeadingLevels） - 欠けたレベルを補正
   * 3. ツリー構築（buildTocTree） - フラットリストを階層構造に変換
   *
   * @param markdown - Frontmatter除外済みのMarkdownテキスト
   * @returns TOCアイテムの階層構造
   */
  generateToc(markdown: string): TocItem[] {
    const headings = extractHeadings(markdown);
    const normalized = normalizeHeadingLevels(headings);
    return buildTocTree(normalized);
  }
}

/**
 * シングルトンインスタンス
 * MarkdownServiceから利用
 */
export const tocService = new TocService();
