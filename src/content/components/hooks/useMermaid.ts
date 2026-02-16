import { useEffect } from "preact/hooks";
import type { RefObject } from "preact";
import { detectMermaidBlocks } from "../../../domain/markdown/mermaid-detector.ts";
import {
  getMermaidTheme,
  renderMermaid,
} from "../../../domain/markdown/mermaid-renderer.ts";
import { escapeHtml } from "../../../shared/utils/escape-html.ts";
import type { Theme } from "../../../shared/types/theme.ts";
import type { ViewMode } from "../../../shared/types/view-mode.ts";

/**
 * Mermaidダイアグラムレンダリングフック
 *
 * HTMLに含まれるMermaidコードブロックをSVGダイアグラムに変換。
 * テーマ変更時は既存ダイアグラムの再レンダリング（Promise.allで並列化）。
 * 初回表示時はDOM順序依存のため逐次処理。
 * ADR-007例外: DOM操作系domainの直接呼び出し。
 *
 * @param containerRef - Markdownコンテンツのコンテナ要素
 * @param html - レンダリング済みHTML文字列（Mermaidブロック検出用）
 * @param themeId - 現在のテーマID
 * @param viewMode - 現在のViewMode（rawモードではスキップ）
 */
export function useMermaid(
  containerRef: RefObject<HTMLDivElement>,
  html: string,
  themeId: Theme,
  viewMode: ViewMode,
): void {
  useEffect(() => {
    if (viewMode === "raw") return;
    if (!containerRef.current) return;

    let isMounted = true;

    const mermaidBlocks = detectMermaidBlocks(html);
    const existingDiagrams = containerRef.current?.querySelectorAll(
      ".mermaid-diagram",
    );

    const theme = getMermaidTheme(themeId);

    // 既存のダイアグラムがある場合は再レンダリング（テーマ変更時）
    // Promise.all()で並列化（パフォーマンス改善）
    if (existingDiagrams && existingDiagrams.length > 0) {
      (async () => {
        await Promise.all(
          Array.from(existingDiagrams).map(async (diagram) => {
            if (!isMounted) return;

            try {
              const code = diagram.getAttribute("data-mermaid-code");
              if (!code) {
                console.warn(
                  "Mermaid diagram missing data-mermaid-code attribute",
                );
                return;
              }
              const svg = await renderMermaid(code, theme);
              if (!isMounted) return;
              diagram.innerHTML = svg;
            } catch (error) {
              console.error("Mermaid re-rendering failed:", error);
              if (!isMounted) return;
              const code = diagram.getAttribute("data-mermaid-code");
              if (code) {
                const escaped = escapeHtml(code);
                diagram.innerHTML =
                  `<pre style="padding: 1rem; background: var(--markdown-viewer-code-bg, #f5f5f5); border-radius: 4px; overflow-x: auto;">` +
                  `<code class="language-mermaid">${escaped}</code></pre>` +
                  `<p style="color: var(--markdown-viewer-error-color, #c53030); font-size: 0.875rem; margin-top: 0.5rem;">` +
                  `Failed to render Mermaid diagram</p>`;
              }
            }
          }),
        );
      })();
    } // 新規レンダリング（初回表示時）
    // Note: DOM操作の順序依存のため逐次処理を維持
    else if (mermaidBlocks.length > 0) {
      (async () => {
        for (const block of mermaidBlocks) {
          if (!isMounted) return;

          try {
            const svg = await renderMermaid(block.code, theme);
            if (!isMounted) return;

            const codeBlocks = containerRef.current?.querySelectorAll(
              "code.language-mermaid",
            );
            if (codeBlocks && codeBlocks[0]) {
              const codeBlock = codeBlocks[0];
              const preElement = codeBlock.parentElement;

              if (preElement) {
                const container = document.createElement("div");
                container.className = "mermaid-diagram";
                container.setAttribute("data-mermaid-code", block.code);
                container.setAttribute("data-mermaid-rendered", "true");
                container.innerHTML = svg;

                preElement.replaceWith(container);
              }
            }
          } catch (error) {
            console.error("Mermaid rendering failed:", error);
          }
        }
      })();
    }

    return () => {
      isMounted = false;
    };
  }, [html, themeId, viewMode]);
}
