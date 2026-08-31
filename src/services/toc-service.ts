/**
 * TOC生成サービス
 *
 * 見出しリストから目次（Table of Contents）の階層構造を組み立てるサービス。
 * domain層の純粋関数（normalizeHeadingLevels → buildTocTree）を
 * パイプラインとして組み合わせる。
 *
 * 見出しの抽出そのものは domain/toc/html-processor.ts の addHeadingIds() が担う。
 * ToCのIDとHTMLのid属性を同一の走査結果から生成し、両者のズレを構造的に防ぐため。
 *
 * MarkdownServiceから呼ばれ、RenderResult.tocItemsとして結果を返す。
 */

import { normalizeHeadingLevels } from "../domain/toc/normalizer.ts";
import { buildTocTree } from "../domain/toc/tree-builder.ts";
import type { TocHeading, TocItem } from "../shared/types/toc.ts";

/**
 * TOC生成サービスクラス
 */
export class TocService {
  /**
   * 見出しリストからTOCアイテムツリーを生成
   *
   * 処理フロー:
   * 1. レベル正規化（normalizeHeadingLevels） - 欠けたレベルを補正
   * 2. ツリー構築（buildTocTree） - フラットリストを階層構造に変換
   *
   * @param headings ドキュメント順の見出しリスト（H1-H3）
   * @returns TOCアイテムの階層構造
   */
  generateToc(headings: TocHeading[]): TocItem[] {
    return buildTocTree(normalizeHeadingLevels(headings));
  }
}

/**
 * シングルトンインスタンス
 * MarkdownServiceから利用
 */
export const tocService = new TocService();
