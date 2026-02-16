import { useEffect } from "preact/hooks";
import type { RefObject } from "preact";
import { renderMath } from "../../../domain/math/renderer.ts";
import { hasMathExpression } from "../../../domain/math/detector.ts";
import type { ViewMode } from "../../../shared/types/view-mode.ts";

/**
 * MathJax数式レンダリングフック
 *
 * HTMLに数式表現（$...$, $$...$$, \(...\), \[...\]）が含まれている場合、
 * MathJaxでレンダリングする。ADR-007例外: DOM操作系domainの直接呼び出し。
 *
 * @param containerRef - Markdownコンテンツのコンテナ要素
 * @param html - レンダリング済みHTML文字列（数式検出用）
 * @param viewMode - 現在のViewMode（rawモードではスキップ）
 */
export function useMathJax(
  containerRef: RefObject<HTMLDivElement>,
  html: string,
  viewMode: ViewMode,
): void {
  useEffect(() => {
    if (viewMode === "raw") return;
    if (!containerRef.current) return;

    if (hasMathExpression(html)) {
      try {
        renderMath(containerRef.current);
      } catch (error) {
        console.error("MathJax rendering failed:", error);
      }
    }
  }, [html, viewMode]);
}
