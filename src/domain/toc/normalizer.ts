/**
 * ToC見出しレベル正規化ロジック（親検出アルゴリズム）
 *
 * 責務: 不正な見出しレベル（親がいない子要素）を検出し、
 *      違和感のない階層構造を実現
 *
 * ✅ OK: 純粋関数、単一責任
 * ❌ NG: DOM操作、副作用
 */

import type { TocHeading } from "./types.ts";

/**
 * 見出しレベルを正規化（親検出アルゴリズム）
 *
 * アルゴリズム:
 * 1. 初期状態を評価（順次変換ではない）
 * 2. 各見出しについて「1レベル上の親」が存在するかチェック
 * 3. 親がいない場合は h2 に変換（最上位は h2）
 *
 * 親の定義:
 * - h1: 親不要（常にOK）
 * - h2: 前方に h1 が必要
 * - h3: 前方に h2 が必要
 *
 * 例:
 * - h3, h3, h2 → 全て親なし → h2, h2, h2（全てフラット）
 * - h1, h3, h2 → h3は親(h2)なし → h1, h2, h2
 * - h2, h3, h2 → h3は親(h2)あり → h2, h3, h2（h3保持）
 *
 * @param headings フラットな見出しリスト
 * @returns 正規化された見出しリスト
 *
 * @example
 * ```ts
 * // dig.md ケース
 * const headings = [
 *   { level: 3, text: 'Phase 2', id: 'phase-2' },
 *   { level: 3, text: 'Phase 3', id: 'phase-3' },
 *   { level: 2, text: 'Decisions', id: 'decisions' },
 * ];
 *
 * const normalized = normalizeHeadingLevels(headings);
 * // => [
 * //   { level: 2, text: 'Phase 2', id: 'phase-2' },    // h3 → h2 (親なし)
 * //   { level: 2, text: 'Phase 3', id: 'phase-3' },    // h3 → h2 (親なし)
 * //   { level: 2, text: 'Decisions', id: 'decisions' }, // h2 → h2 (親なし、そのまま)
 * // ]
 * ```
 */
export function normalizeHeadingLevels(headings: TocHeading[]): TocHeading[] {
  // 空配列の場合はそのまま返す
  if (headings.length === 0) {
    return [];
  }

  // 過去に出現した「元の(変換前の)」レベルを O(1) でチェックするための Set
  // ※重要: 変換前の元のレベルを記録することで、正しく親の存在を判定
  const seenOriginalLevels = new Set<number>();

  // 親がいない場合は h2 に変換
  return headings.map((h) => {
    // 現在の見出しの元のレベルを記録
    seenOriginalLevels.add(h.level);

    // h1 は親不要
    if (h.level === 1) {
      return h;
    }

    // 1レベル上の親が「元の文書」に存在するかチェック
    const parentLevel = h.level - 1;
    const hasParent = seenOriginalLevels.has(parentLevel);

    if (hasParent) {
      // 親が存在する場合はそのまま保持
      return h;
    } else {
      // 親がいない場合は h2 に変換（最上位は h2）
      return { ...h, level: 2 as 1 | 2 | 3 };
    }
  });
}
