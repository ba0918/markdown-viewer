/**
 * TOC生成サービス
 *
 * Markdownテキストから目次（Table of Contents）を生成する。
 * 見出し抽出、レベル正規化、ツリー構築の順に処理を実行。
 */

import { extractHeadings } from "../domain/toc/extractor.ts";
import { normalizeHeadingLevels } from "../domain/toc/normalizer.ts";
import { buildTocTree } from "../domain/toc/tree-builder.ts";
import type { TocItem } from "../domain/toc/types.ts";

/**
 * TOC生成サービスクラス
 */
export class TocService {
  /**
   * Markdownテキストから目次を生成
   *
   * 処理フロー:
   * 1. 見出し抽出（extractHeadings）
   * 2. レベル正規化（normalizeHeadingLevels）
   * 3. ツリー構築（buildTocTree）
   *
   * @param markdown Markdownテキスト
   * @returns TOCツリー（階層構造、不正レベル補正済み）
   */
  generate(markdown: string): TocItem[] {
    const headings = extractHeadings(markdown);
    const normalizedHeadings = normalizeHeadingLevels(headings);
    const tree = buildTocTree(normalizedHeadings);
    return tree;
  }
}

/**
 * TOCサービスのシングルトンインスタンス
 */
export const tocService = new TocService();
