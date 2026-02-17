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
 * Race condition防止（Promiseシングルトンパターン）:
 * - 初期化中の呼び出しは既存のPromiseを再利用し、完了を待つ
 * - 完了後にテーマが異なる場合のみ再初期化を実行
 * - 同じテーマで初期化済みなら何もしない
 *
 * 旧実装のwhileループでは、ループ脱出とinitPromiseセットの間に
 * 別の呼び出しが割り込む競合状態があった。新実装はPromiseの
 * 共有により、同一テーマの並行初期化が物理的に発生しない。
 *
 * @param theme - Mermaid theme
 * @returns Promise that resolves when initialization is complete
 */
async function initializeMermaid(
  theme: "default" | "dark" | "forest" | "neutral" | "base" = "default",
): Promise<void> {
  // 同じテーマで初期化済みなら即時リターン
  if (currentTheme === theme && initPromise === null) {
    return;
  }

  // 進行中の初期化がある場合はその完了を待つ
  if (initPromise !== null) {
    await initPromise;
    // 完了後にテーマが一致していれば追加初期化は不要
    if (currentTheme === theme) {
      return;
    }
  }

  // 新しい初期化Promiseを作成（同期的にセットすることで競合を防止）
  initPromise = (async () => {
    try {
      mermaidInstance.initialize({
        theme,
        startOnLoad: false,
        securityLevel: "strict",
        flowchart: {
          htmlLabels: true,
        },
      });
      currentTheme = theme;
      await new Promise((resolve) => setTimeout(resolve, 10));
    } finally {
      initPromise = null;
    }
  })();

  await initPromise;
}

/**
 * SVGサニタイズ
 *
 * Mermaid出力SVGからscript要素とonXXXイベント属性を除去する。
 * securityLevel: 'strict'との多層防御。
 *
 * @param svgString - サニタイズ対象のSVG文字列
 * @returns サニタイズ済みSVG文字列
 */
export function sanitizeSvg(svgString: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, "image/svg+xml");

  // パースエラーの場合はそのまま返す（DOMParserはエラー時にparsererrorを返す）
  const parserError = doc.querySelector("parsererror");
  if (parserError) {
    return svgString;
  }

  // script要素を除去
  doc.querySelectorAll("script").forEach((el) => el.remove());

  // foreignObject内のscript等も除去
  doc.querySelectorAll("foreignObject script").forEach((el) => el.remove());

  // onXXXイベント属性を全要素から除去
  doc.querySelectorAll("*").forEach((el) => {
    for (const attr of [...el.attributes]) {
      if (attr.name.toLowerCase().startsWith("on")) {
        el.removeAttribute(attr.name);
      }
    }
    // javascript: URLを含むhref/xlink:hrefを除去
    const href = el.getAttribute("href") || el.getAttribute("xlink:href");
    if (href && href.trim().toLowerCase().startsWith("javascript:")) {
      el.removeAttribute("href");
      el.removeAttribute("xlink:href");
    }
  });

  return new XMLSerializer().serializeToString(doc.documentElement);
}

/**
 * Renders a Mermaid diagram code to SVG
 *
 * SVG出力はsanitizeSvg()でサニタイズされる（多層防御）。
 *
 * @param code - Mermaid diagram code
 * @param theme - Mermaid theme
 * @returns サニタイズ済みSVG文字列
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
    await initializeMermaid(theme);

    const id = `mermaid-diagram-${Date.now()}-${
      Math.random().toString(36).substring(2, 9)
    }`;

    const { svg } = await mermaidInstance.render(id, code);

    // Mermaid render()が生成する一時SVG要素をDOMから除去
    // テーマ変更で再レンダリングするたびに蓄積するのを防止
    const tempSvg = document.getElementById(id);
    if (tempSvg) {
      tempSvg.remove();
    }

    // 多層防御: securityLevel: 'strict' + SVGサニタイズ
    return sanitizeSvg(svg);
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
