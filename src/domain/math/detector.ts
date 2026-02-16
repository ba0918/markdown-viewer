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
export function hasMathExpression(text: string): boolean {
  const inlinePattern = /(?<!\\)\$[^\$]+\$|\\\(.*?\\\)/s;
  const displayPattern = /(?<!\\)\$\$[^\$]+\$\$|\\\[.*?\\\]/s;

  return inlinePattern.test(text) || displayPattern.test(text);
}
