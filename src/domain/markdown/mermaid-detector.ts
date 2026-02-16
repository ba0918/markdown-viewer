/**
 * Mermaid Block Detector
 *
 * Detects Mermaid diagram code blocks in HTML.
 * Pure functions that can be tested in any environment.
 *
 * Layer: domain/markdown (Pure detection logic)
 */

/**
 * Mermaid code block information
 */
export interface MermaidBlock {
  /** Mermaid diagram code */
  code: string;
  /** Block index (0-based) */
  index: number;
}

/**
 * Detects all Mermaid code blocks in HTML
 *
 * @param html - HTML string (sanitized, from marked + DOMPurify)
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
    const code = decodeHTMLEntities(rawCode);

    if (code.trim().length === 0) {
      continue;
    }

    blocks.push({
      code,
      index,
    });

    index++;
  }

  return blocks;
}

// hasMermaidBlocks() は削除されました（未使用関数）
// 必要な場合は detectMermaidBlocks(html).length > 0 を使用してください

/**
 * Decodes HTML entities in a string
 *
 * @param html - HTML string with entities
 * @returns Decoded string
 *
 * @example
 * ```ts
 * decodeHTMLEntities('A --&gt; B') // 'A --> B'
 * decodeHTMLEntities('&lt;div&gt;') // '<div>'
 * ```
 */
function decodeHTMLEntities(html: string): string {
  const entities: Record<string, string> = {
    "&lt;": "<",
    "&gt;": ">",
    "&amp;": "&",
    "&quot;": '"',
    "&#39;": "'",
    "&#x27;": "'",
    "&apos;": "'",
  };

  return html.replace(
    /&(?:lt|gt|amp|quot|#39|#x27|apos);/g,
    (match) => entities[match] || match,
  );
}
