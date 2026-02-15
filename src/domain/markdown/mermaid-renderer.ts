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
import mermaid from "mermaid";

/**
 * Mermaid library instance (loaded via Static Import)
 * Type declaration for mermaid API
 */
interface MermaidAPI {
  initialize: (config: MermaidConfig) => void;
  render: (
    id: string,
    code: string,
  ) => Promise<{ svg: string; bindFunctions?: (element: Element) => void }>;
}

/**
 * Mermaid configuration
 */
interface MermaidConfig {
  theme?: "default" | "dark" | "forest" | "neutral" | "base";
  startOnLoad?: boolean;
  securityLevel?: "strict" | "loose" | "antiscript";
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
let currentTheme: "default" | "dark" | "forest" | "neutral" | "base" | null =
  null;

/**
 * Initialization promise to ensure single initialization at a time
 */
let initPromise: Promise<void> | null = null;

/**
 * Initializes Mermaid library
 *
 * Race condition防止:
 * - initPromiseをロックとして使用し、並行初期化を防ぐ
 * - 初期化中の場合はその完了を待ってからテーマ比較
 * - 同じテーマで初期化済みなら何もしない
 *
 * @param theme - Mermaid theme
 * @returns Promise that resolves when initialization is complete
 */
async function initializeMermaid(
  theme: "default" | "dark" | "forest" | "neutral" | "base" = "default",
): Promise<void> {
  // 既に初期化中の場合は完了を待つ（ロック待機）
  while (initPromise !== null) {
    await initPromise;
  }

  // テーマが同じで既に初期化済みなら何もしない
  if (currentTheme === theme) {
    return;
  }

  // 新しい初期化を開始（ロック取得）
  initPromise = (async () => {
    try {
      mermaidInstance.initialize({
        theme,
        startOnLoad: false, // Manual rendering
        securityLevel: "strict", // XSS protection
        flowchart: {
          htmlLabels: true,
        },
      });
      currentTheme = theme;
      // 初期化完了後、少し待機（Mermaidの内部処理完了を待つ）
      await new Promise((resolve) => setTimeout(resolve, 10));
    } finally {
      // ロック解放
      initPromise = null;
    }
  })();

  await initPromise;
}

/**
 * Renders a Mermaid diagram code to SVG
 *
 * @param code - Mermaid diagram code
 * @param theme - Mermaid theme
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
  theme: "default" | "dark" | "forest" | "neutral" | "base" = "default",
): Promise<string> {
  try {
    // Initialize mermaid with theme (await完了を待つ)
    await initializeMermaid(theme);

    // Generate unique ID for this diagram
    const id = `mermaid-diagram-${Date.now()}-${
      Math.random().toString(36).substring(2, 9)
    }`;

    // Render diagram to SVG
    const { svg } = await mermaidInstance.render(id, code);

    return svg;
  } catch (error) {
    throw new Error(
      `Mermaid rendering failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

/**
 * Maps app theme to Mermaid theme
 *
 * @param appTheme - App theme ID
 * @returns Mermaid theme
 *
 * Mapping strategy:
 * - light → 'base' (clean, modern light theme)
 * - dark → 'dark' (dark background)
 * - github → 'neutral' (GitHub-like neutral colors)
 * - minimal → 'base' (minimal, clean)
 * - solarized-light → 'forest' (warm, earthy tones match solarized palette)
 * - solarized-dark → 'dark' (dark background)
 *
 * @example
 * ```ts
 * getMermaidTheme('dark') // 'dark'
 * getMermaidTheme('github') // 'neutral'
 * getMermaidTheme('solarized-light') // 'forest'
 * ```
 */
export function getMermaidTheme(
  appTheme: string,
): "default" | "dark" | "forest" | "neutral" | "base" {
  // Map app themes to Mermaid themes
  const themeMap: Record<
    string,
    "default" | "dark" | "forest" | "neutral" | "base"
  > = {
    "light": "base",
    "dark": "dark",
    "github": "neutral",
    "minimal": "base",
    "solarized-light": "forest",
    "solarized-dark": "dark",
  };

  return themeMap[appTheme] || "default";
}
