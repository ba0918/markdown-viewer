/**
 * Mermaid Detector Tests
 *
 * Tests for detecting Mermaid code blocks in HTML.
 * These are pure functions that can be tested in Deno environment.
 */

import { assertEquals } from "@std/assert";
import {
  detectMermaidBlocks,
  hasMermaidBlocks,
  type MermaidBlock as _MermaidBlock,
} from "./mermaid-detector.ts";

Deno.test("detectMermaidBlocks: detects single Mermaid code block", () => {
  const html = `
    <pre><code class="language-mermaid">graph TD
    A[Start] --> B[End]</code></pre>
  `;

  const blocks = detectMermaidBlocks(html);

  assertEquals(blocks.length, 1);
  assertEquals(blocks[0].code, "graph TD\n    A[Start] --> B[End]");
  assertEquals(blocks[0].index, 0);
});

Deno.test("detectMermaidBlocks: detects multiple Mermaid code blocks", () => {
  const html = `
    <h1>Diagrams</h1>
    <pre><code class="language-mermaid">graph LR
    A --> B</code></pre>
    <p>Some text</p>
    <pre><code class="language-mermaid">sequenceDiagram
    Alice->>John: Hello</code></pre>
  `;

  const blocks = detectMermaidBlocks(html);

  assertEquals(blocks.length, 2);
  assertEquals(blocks[0].code.trim(), "graph LR\n    A --> B");
  assertEquals(blocks[0].index, 0);
  assertEquals(
    blocks[1].code.trim(),
    "sequenceDiagram\n    Alice->>John: Hello",
  );
  assertEquals(blocks[1].index, 1);
});

Deno.test("detectMermaidBlocks: ignores non-Mermaid code blocks", () => {
  const html = `
    <pre><code class="language-javascript">console.log('hello');</code></pre>
    <pre><code class="language-python">print('hello')</code></pre>
  `;

  const blocks = detectMermaidBlocks(html);

  assertEquals(blocks.length, 0);
});

Deno.test("detectMermaidBlocks: handles empty code blocks", () => {
  const html = `
    <pre><code class="language-mermaid"></code></pre>
  `;

  const blocks = detectMermaidBlocks(html);

  // Empty blocks are ignored
  assertEquals(blocks.length, 0);
});

Deno.test("detectMermaidBlocks: handles HTML-escaped content", () => {
  const html = `
    <pre><code class="language-mermaid">graph TD
    A[Start] --&gt; B[End]</code></pre>
  `;

  const blocks = detectMermaidBlocks(html);

  assertEquals(blocks.length, 1);
  // HTML entities should be decoded
  assertEquals(blocks[0].code.includes("-->"), true);
});

Deno.test("detectMermaidBlocks: returns empty array for HTML without Mermaid", () => {
  const html = `
    <h1>No diagrams here</h1>
    <p>Just some text</p>
  `;

  const blocks = detectMermaidBlocks(html);

  assertEquals(blocks.length, 0);
});

Deno.test("detectMermaidBlocks: handles mixed case class names", () => {
  const html = `
    <pre><code class="Language-Mermaid">graph TD
    A --> B</code></pre>
    <pre><code class="LANGUAGE-MERMAID">graph LR
    C --> D</code></pre>
  `;

  const blocks = detectMermaidBlocks(html);

  // Should be case-insensitive
  assertEquals(blocks.length, 2);
});

Deno.test("hasMermaidBlocks: returns true when Mermaid blocks exist", () => {
  const html = `
    <pre><code class="language-mermaid">graph TD
    A --> B</code></pre>
  `;

  assertEquals(hasMermaidBlocks(html), true);
});

Deno.test("hasMermaidBlocks: returns false when no Mermaid blocks", () => {
  const html = `
    <pre><code class="language-javascript">console.log('hello');</code></pre>
  `;

  assertEquals(hasMermaidBlocks(html), false);
});

Deno.test("hasMermaidBlocks: returns false for empty HTML", () => {
  assertEquals(hasMermaidBlocks(""), false);
});

Deno.test("detectMermaidBlocks: preserves original code indentation", () => {
  const html = `
    <pre><code class="language-mermaid">  graph TD
      A --> B
        C --> D</code></pre>
  `;

  const blocks = detectMermaidBlocks(html);

  assertEquals(blocks.length, 1);
  // Indentation should be preserved
  assertEquals(blocks[0].code.includes("  graph TD"), true);
  assertEquals(blocks[0].code.includes("    C --> D"), true);
});
