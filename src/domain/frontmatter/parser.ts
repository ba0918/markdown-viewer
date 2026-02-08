/**
 * Frontmatter Parser
 *
 * YAML Frontmatterを解析し、dataとcontentに分離する
 *
 * @module domain/frontmatter/parser
 */

import { parse } from "@std/yaml";
import type { FrontmatterResult } from "./types.ts";

/**
 * YAML Frontmatterを解析
 *
 * yamlライブラリを使用してYAML Frontmatterを解析し、
 * メタデータ（data）とコンテンツ（content）に分離する。
 *
 * Frontmatterは `---` で囲まれたYAMLブロックとして認識される。
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
    // Frontmatterの正規表現パターン: 先頭が --- で始まり、次の --- までをYAMLとして抽出
    // 最後の --- の後は改行があってもなくてもOK
    const frontmatterRegex = /^---\s*\n([\s\S]*?)---\s*(?:\n|$)([\s\S]*)$/;
    const match = markdown.match(frontmatterRegex);

    if (!match) {
      // Frontmatterがない場合は元のmarkdownをそのまま返す
      return {
        data: {},
        content: markdown,
        original: markdown,
      };
    }

    const yamlString = match[1];
    const content = match[2];

    // YAMLをパース（空の場合は空オブジェクト）
    let data = {};
    if (yamlString.trim()) {
      data = parse(yamlString) || {};
    }

    return {
      data,
      content,
      original: markdown,
    };
  } catch (error) {
    // エラー時（不正なYAMLフォーマット等）は元のテキストをそのまま返す
    console.warn("Frontmatter parse error:", error);
    return {
      data: {},
      content: markdown,
      original: markdown,
    };
  }
}
