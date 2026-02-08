/**
 * Mermaid Diagram Renderer
 *
 * Renders Mermaid diagrams to SVG.
 * - Input: Mermaid diagram code (e.g., "graph TD\nA-->B")
 * - Output: SVG (rendered diagram)
 * - Integration: Static import → esbuild bundle
 *
 * Layer: domain/markdown (Pure rendering logic, browser-only)
 *
 * ⚠️ This module requires browser environment (document, window)
 */

// @ts-ignore: mermaid types not available in Deno
// Imported from deno.json dependencies
import mermaid from 'mermaid';

/**
 * Mermaid library instance (loaded via Static Import)
 * Type declaration for mermaid API
 */
interface MermaidAPI {
  initialize: (config: MermaidConfig) => void;
  render: (
    id: string,
    code: string
  ) => Promise<{ svg: string; bindFunctions?: (element: Element) => void }>;
}

/**
 * Mermaid configuration
 */
interface MermaidConfig {
  theme?: 'default' | 'dark' | 'forest' | 'neutral';
  startOnLoad?: boolean;
  securityLevel?: 'strict' | 'loose' | 'antiscript';
  flowchart?: {
    curve?: string;
    htmlLabels?: boolean;
  };
}

/**
 * Mermaid instance (singleton)
 */
const mermaidInstance = mermaid as unknown as MermaidAPI;

/**
 * Current initialized theme
 */
let currentTheme: 'default' | 'dark' | null = null;

/**
 * Initializes Mermaid library
 *
 * @param theme - Mermaid theme ('default' or 'dark')
 */
function initializeMermaid(theme: 'default' | 'dark' = 'default'): void {
  // テーマが変わった場合は再初期化
  if (currentTheme !== theme) {
    mermaidInstance.initialize({
      theme,
      startOnLoad: false, // Manual rendering
      securityLevel: 'strict', // XSS protection
      flowchart: {
        htmlLabels: true,
      },
    });
    currentTheme = theme;
  }
}

/**
 * Renders a Mermaid diagram code to SVG
 *
 * @param code - Mermaid diagram code
 * @param theme - Theme ('default' or 'dark')
 * @returns SVG string
 *
 * @throws Error if rendering fails
 *
 * @example
 * ```ts
 * const svg = await renderMermaid('graph TD\nA-->B', 'default');
 * container.innerHTML = svg;
 * ```
 */
export async function renderMermaid(
  code: string,
  theme: 'default' | 'dark' = 'default'
): Promise<string> {
  try {
    // Initialize mermaid with theme
    initializeMermaid(theme);

    // Generate unique ID for this diagram
    const id = `mermaid-diagram-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    // Render diagram to SVG
    const { svg } = await mermaidInstance.render(id, code);

    return svg;
  } catch (error) {
    throw new Error(`Mermaid rendering failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Maps app theme to Mermaid theme
 *
 * @param appTheme - App theme ID
 * @returns Mermaid theme ('default' or 'dark')
 *
 * @example
 * ```ts
 * getMermaidTheme('dark') // 'dark'
 * getMermaidTheme('github') // 'default'
 * getMermaidTheme('solarized_dark') // 'dark'
 * ```
 */
export function getMermaidTheme(appTheme: string): 'default' | 'dark' {
  // Map app themes to Mermaid themes
  const darkThemes = ['dark', 'solarized_dark'];
  return darkThemes.includes(appTheme) ? 'dark' : 'default';
}
