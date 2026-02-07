/**
 * MathJax Math Renderer (mathjax-full + SVG)
 *
 * Renders LaTeX math expressions to SVG using mathjax-full.
 * - Input: TeX (LaTeX syntax)
 * - Output: SVG (font information embedded)
 * - Integration: ES Modules import → esbuild bundle
 *
 * Layer: domain/math (Pure rendering logic, browser-only)
 */

import { mathjax } from 'npm:mathjax-full@3.2.2/js/mathjax.js';
import { TeX } from 'npm:mathjax-full@3.2.2/js/input/tex.js';
import { SVG } from 'npm:mathjax-full@3.2.2/js/output/svg.js';
import { browserAdaptor } from 'npm:mathjax-full@3.2.2/js/adaptors/browserAdaptor.js';
import { RegisterHTMLHandler } from 'npm:mathjax-full@3.2.2/js/handlers/html.js';
import { AllPackages } from 'npm:mathjax-full@3.2.2/js/input/tex/AllPackages.js';

// Register browser adaptor (enables window/document recognition)
RegisterHTMLHandler(browserAdaptor());

// Create MathJax document (singleton, input: TeX → output: SVG)
const mathDocument = mathjax.document(document, {
  InputJax: new TeX({
    packages: AllPackages, // Equivalent to \usepackage{amsmath}
    inlineMath: [['$', '$'], ['\\(', '\\)']], // Inline math delimiters
    displayMath: [['$$', '$$'], ['\\[', '\\]']], // Display math delimiters
  }),
  OutputJax: new SVG({
    fontCache: 'local', // Embed font paths in SVG (important!)
  }),
});

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
  // Clear, scan, compile, measure, typeset, and update
  mathDocument.clear();
  mathDocument.findMath({ elements: [element] });
  mathDocument.compile();
  mathDocument.getMetrics();
  mathDocument.typeset();
  mathDocument.updateDocument();
}

/**
 * Converts a LaTeX string to an SVG element
 *
 * @param latex - LaTeX math expression string
 * @param display - true for display mode (block), false for inline mode
 * @returns HTMLElement containing the SVG representation
 *
 * @example
 * ```ts
 * const svg = texToSvg('x^2 + y^2 = z^2', false);
 * document.body.appendChild(svg);
 * ```
 */
export function texToSvg(latex: string, display = false): HTMLElement {
  const node = mathDocument.convert(latex, {
    display: display,
    em: 16,
    ex: 8,
    containerWidth: 80 * 16,
  });
  return node; // Returns <mjx-container>...<svg>...</mjx-container>
}
