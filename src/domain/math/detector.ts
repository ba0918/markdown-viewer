/**
 * Math Expression Detector
 *
 * Detects LaTeX math expressions in text:
 * - Inline: $...$ or \(...\)
 * - Display: $$...$$ or \[...\]
 *
 * Layer: domain/math (Pure function, no side effects)
 */

/**
 * Checks if the given text contains any LaTeX math expressions
 *
 * @param text - The text to check for math expressions
 * @returns true if math expressions are found, false otherwise
 *
 * @example
 * ```ts
 * hasMathExpression('Hello $x^2$ world'); // true
 * hasMathExpression('No math here'); // false
 * ```
 */
// モジュールスコープで正規表現をキャッシュ（呼び出しごとの再生成を防止）
const INLINE_PATTERN = /(?<!\\)\$[^\$]+\$|\\\(.*?\\\)/s;
const DISPLAY_PATTERN = /(?<!\\)\$\$[^\$]+\$\$|\\\[.*?\\\]/s;

export function hasMathExpression(text: string): boolean {
  return INLINE_PATTERN.test(text) || DISPLAY_PATTERN.test(text);
}
