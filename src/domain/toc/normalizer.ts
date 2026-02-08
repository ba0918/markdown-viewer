/**
 * ToC見出しレベル正規化ロジック
 *
 * 責務: 不正な見出しレベル（h3やh2から始まる文書）を正規化し、
 *      相対的な階層構造を保持しつつ自然な表示を実現
 *
 * ✅ OK: 純粋関数、単一責任
 * ❌ NG: DOM操作、副作用
 */

import type { TocHeading } from './types.ts';

/**
 * 見出しレベルを正規化
 *
 * 最小レベルを検出し、それを基準（level=1）として全ての見出しレベルを正規化する。
 * 相対的な階層構造は保持される。
 *
 * アルゴリズム:
 * 1. 最小レベルを検出（例: h2から始まる場合、minLevel=2）
 * 2. 各見出しレベルを正規化: `normalizedLevel = level - minLevel + 1`
 *
 * 例:
 * - h2から始まる文書: h2→h1, h3→h2
 * - h3から始まる文書: h3→h1（最小レベルがh3の場合）
 * - h1から始まる正常な文書: 変更なし（minLevel=1）
 *
 * @param headings フラットな見出しリスト
 * @returns 正規化された見出しリスト
 *
 * @example
 * ```ts
 * const headings = [
 *   { level: 2, text: 'Introduction', id: 'intro' },
 *   { level: 3, text: 'Overview', id: 'overview' },
 * ];
 *
 * const normalized = normalizeHeadingLevels(headings);
 * // => [
 * //   { level: 1, text: 'Introduction', id: 'intro' },    // h2 → h1
 * //   { level: 2, text: 'Overview', id: 'overview' },     // h3 → h2
 * // ]
 * ```
 */
export function normalizeHeadingLevels(headings: TocHeading[]): TocHeading[] {
  // 空配列の場合はそのまま返す
  if (headings.length === 0) {
    return [];
  }

  // 1. 最小レベルを検出
  const minLevel = Math.min(...headings.map((h) => h.level));

  // 2. 正規化（最小レベル = 1として扱う）
  return headings.map((h) => ({
    ...h,
    level: (h.level - minLevel + 1) as 1 | 2 | 3,
  }));
}
