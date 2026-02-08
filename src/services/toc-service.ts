/**
 * TOC生成サービス
 *
 * 責務: domainロジックを組み合わせてTOC生成のビジネスフローを実現
 * ✅ OK: domainの組み合わせ、ビジネスフロー
 * ❌ NG: Chrome API、UI処理
 */

import { extractHeadings, buildTocTree } from '../domain/toc/extractor.ts';
import type { TocItem } from '../domain/toc/types.ts';

/**
 * TOC生成サービスクラス
 */
export class TocService {
  /**
   * Markdownテキストから目次を生成
   *
   * @param markdown Markdownテキスト
   * @returns TOCツリー（現状はフラット構造）
   */
  generate(markdown: string): TocItem[] {
    // 1. domain層で見出しを抽出
    const headings = extractHeadings(markdown);

    // 2. domain層でツリー構造を構築
    const tree = buildTocTree(headings);

    return tree;
  }
}

/**
 * TOCサービスのシングルトンインスタンス
 */
export const tocService = new TocService();
