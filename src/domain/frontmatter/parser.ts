/**
 * Frontmatter Parser
 *
 * YAML Frontmatterを解析し、dataとcontentに分離する
 *
 * @module domain/frontmatter/parser
 */

import matter from 'gray-matter';
import type { FrontmatterResult } from './types.ts';

/**
 * YAML Frontmatterを解析
 *
 * gray-matterライブラリを使用してYAML Frontmatterを解析し、
 * メタデータ（data）とコンテンツ（content）に分離する。
 *
 * @param markdown - 解析するMarkdownテキスト（Frontmatter含む可能性あり）
 * @returns Frontmatter解析結果（data, content, original）
 *
 * @example
 * ```ts
 * const markdown = `---
 * title: Test
 * ---
 * # Content`;
 *
 * const result = parseFrontmatter(markdown);
 * console.log(result.data.title); // 'Test'
 * console.log(result.content); // '# Content'
 * ```
 */
export function parseFrontmatter(markdown: string): FrontmatterResult {
  try {
    const result = matter(markdown);

    return {
      data: result.data,
      content: result.content,
      original: markdown,
    };
  } catch (error) {
    // エラー時（不正なYAMLフォーマット等）は元のテキストをそのまま返す
    console.warn('Frontmatter parse error:', error);
    return {
      data: {},
      content: markdown,
      original: markdown,
    };
  }
}
