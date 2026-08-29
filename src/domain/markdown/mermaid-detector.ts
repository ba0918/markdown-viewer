/**
 * Mermaid Block Detector
 *
 * Detects Mermaid diagram code blocks in HTML.
 * Pure functions that can be tested in any environment.
 *
 * Layer: domain/markdown (Pure detection logic)
 */

import { decodeBasicHtmlEntities } from "../../shared/utils/html-entities.ts";

/**
 * Mermaid code block information
 */
export interface MermaidBlock {
  /** Mermaid diagram code */
  code: string;
  /** Block index (0-based, DOM position corresponding to querySelectorAll result) */
  index: number;
}

/**
 * Detects all Mermaid code blocks in HTML
 *
 * @param html - HTML string (sanitized, from marked + sanitizeHTML)
 * @returns Array of Mermaid code blocks
 *
 * @example
 * ```ts
 * const html = '<pre><code class="language-mermaid">graph TD\nA-->B</code></pre>';
 * const blocks = detectMermaidBlocks(html);
 * // blocks[0].code === 'graph TD\nA-->B'
 * ```
 */
export function detectMermaidBlocks(html: string): MermaidBlock[] {
  const blocks: MermaidBlock[] = [];

  const pattern =
    /<pre><code class="[^"]*language-mermaid[^"]*"[^>]*>([\s\S]*?)<\/code><\/pre>/gi;

  let match: RegExpExecArray | null;
  let index = 0;

  while ((match = pattern.exec(html)) !== null) {
    const rawCode = match[1];
    const code = decodeBasicHtmlEntities(rawCode);
    // DOM要素との位置対応を保つため、空ブロック含む全マッチでインクリメント
    const currentIndex = index;
    index++;

    if (code.trim().length === 0) {
      continue;
    }

    blocks.push({
      code,
      index: currentIndex,
    });
  }

  return blocks;
}

// hasMermaidBlocks() は削除されました（未使用関数）
// 必要な場合は detectMermaidBlocks(html).length > 0 を使用してください
