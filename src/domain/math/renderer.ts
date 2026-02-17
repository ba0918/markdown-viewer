/**
 * MathJax Math Renderer (mathjax-full + SVG)
 *
 * Renders LaTeX math expressions to SVG using mathjax-full.
 * - Input: TeX (LaTeX syntax)
 * - Output: SVG (font information embedded)
 * - Integration: ES Modules import → esbuild bundle
 *
 * Layer: domain/math (Pure rendering logic, browser-only)
 *
 * パフォーマンス: MathJax初期化（RegisterHTMLHandler, mathjax.document）は
 * 初回renderMath()呼び出しまで遅延。数式のないMarkdownでは初期化コストゼロ。
 *
 * バンドルサイズ注記: mathjax-fullは約1730KB（content.jsの38.7%）。
 * esbuildのcode splitting（splitting: true + outdir）でチャンク分離可能だが、
 * Content Scriptのビルド構成変更が必要なため将来タスクとして保留。
 * 現時点ではモジュール読み込みは含まれるが、初期化は遅延される。
 */

// deno-lint-ignore-file no-import-prefix
import { mathjax } from "npm:mathjax-full@3.2.2/js/mathjax.js";
import { TeX } from "npm:mathjax-full@3.2.2/js/input/tex.js";
import { SVG } from "npm:mathjax-full@3.2.2/js/output/svg.js";
import { browserAdaptor } from "npm:mathjax-full@3.2.2/js/adaptors/browserAdaptor.js";
import { RegisterHTMLHandler } from "npm:mathjax-full@3.2.2/js/handlers/html.js";
import { AllPackages } from "npm:mathjax-full@3.2.2/js/input/tex/AllPackages.js";

// MathJax documentのシングルトン（遅延初期化）
// deno-lint-ignore no-explicit-any
let mathDocument: any = null;

/**
 * MathJaxを遅延初期化
 * 初回renderMath()呼び出し時のみ実行される
 */
function ensureInitialized(): void {
  if (mathDocument) return;

  // Register browser adaptor (enables window/document recognition)
  RegisterHTMLHandler(browserAdaptor());

  // Create MathJax document (singleton, input: TeX → output: SVG)
  mathDocument = mathjax.document(document, {
    InputJax: new TeX({
      packages: AllPackages, // Equivalent to \usepackage{amsmath}
      inlineMath: [["$", "$"], ["\\(", "\\)"]], // Inline math delimiters
      displayMath: [["$$", "$$"], ["\\[", "\\]"]], // Display math delimiters
    }),
    OutputJax: new SVG({
      fontCache: "local", // Embed font paths in SVG (important!)
    }),
  });
}

/**
 * Renders LaTeX math expressions within the specified element to SVG
 *
 * @param element - DOM element containing LaTeX math expressions
 *
 * @example
 * ```ts
 * const container = document.getElementById('markdown-preview');
 * if (container) {
 *   renderMath(container);
 * }
 * ```
 */
export function renderMath(element: HTMLElement): void {
  ensureInitialized();
  mathDocument.clear();
  mathDocument.findMath({ elements: [element] });
  mathDocument.compile();
  mathDocument.getMetrics();
  mathDocument.typeset();
  mathDocument.updateDocument();
}
