import { useEffect, useRef } from "preact/hooks";
import type { RefObject } from "preact";
import { detectMermaidBlocks } from "../../../domain/markdown/mermaid-detector.ts";
import {
  getMermaidTheme,
  renderMermaid,
} from "../../../domain/markdown/mermaid-renderer.ts";
import { escapeHtml } from "../../../shared/utils/escape-html.ts";
import { logger } from "../../../shared/utils/logger.ts";
import type { Theme } from "../../../shared/types/theme.ts";
import type { ViewMode } from "../../../shared/types/view-mode.ts";

/**
 * エラー時のフォールバックHTMLを生成
 *
 * レンダリング失敗時にコードブロック + エラーメッセージを表示する。
 * 再レンダリングパスと初回レンダリングパスで共通使用。
 *
 * @param code - 元のMermaidコード
 * @returns フォールバック用HTML文字列
 */
function createErrorFallbackHtml(code: string): string {
  const escaped = escapeHtml(code);
  return (
    `<pre style="padding: 1rem; background: var(--markdown-viewer-code-bg, #f5f5f5); border-radius: 4px; overflow-x: auto;">` +
    `<code class="language-mermaid">${escaped}</code></pre>` +
    `<p style="color: var(--markdown-viewer-error-color, #c53030); font-size: 0.875rem; margin-top: 0.5rem;">` +
    `Failed to render Mermaid diagram</p>`
  );
}

/**
 * Mermaidダイアグラムレンダリングフック
 *
 * HTMLに含まれるMermaidコードブロックをSVGダイアグラムに変換。
 * テーマのみ変更時は既存ダイアグラムの再レンダリング（Promise.allで並列化）。
 * HTML変更時・初回表示時はNodeListスナップショット+block.indexで逐次処理。
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
  // Issue 2: 前回のhtmlを追跡し、html変更 vs テーマのみ変更を判別
  const prevHtmlRef = useRef<string>("");

  useEffect(() => {
    if (viewMode === "raw") return;
    if (!containerRef.current) return;

    let isMounted = true;

    const mermaidBlocks = detectMermaidBlocks(html);
    const existingDiagrams = containerRef.current?.querySelectorAll(
      ".mermaid-diagram",
    );

    const theme = getMermaidTheme(themeId);

    // Issue 2: htmlが変わったかを判定し、前回の値を更新
    const htmlChanged = prevHtmlRef.current !== html;
    prevHtmlRef.current = html;

    // テーマのみ変更時: 既存ダイアグラムの再レンダリング
    // htmlが変わった場合は新規レンダリングパスに入る（Issue 2修正）
    // Promise.all()で並列化（パフォーマンス改善）
    if (
      !htmlChanged && existingDiagrams && existingDiagrams.length > 0
    ) {
      (async () => {
        await Promise.all(
          Array.from(existingDiagrams).map(async (diagram) => {
            if (!isMounted) return;

            try {
              const code = diagram.getAttribute("data-mermaid-code");
              if (!code) {
                logger.warn(
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
                diagram.innerHTML = createErrorFallbackHtml(code);
              }
            }
          }),
        );
      })();
    } // 新規レンダリング（HTML変更時・初回表示時）
    // Issue 1修正: ループ前にNodeListをスナップショット取得し、block.indexでアクセス
    // エラー時もフォールバック表示でreplaceWithを実行し、DOM状態の一貫性を保つ
    else if (mermaidBlocks.length > 0) {
      (async () => {
        // Issue 1: ループ前に1回だけquerySelectorAllを実行してスナップショット取得
        const codeBlockElements = containerRef.current?.querySelectorAll(
          "code.language-mermaid",
        );
        if (!codeBlockElements) return;

        for (const block of mermaidBlocks) {
          if (!isMounted) return;

          // Issue 1: block.indexで対応要素にアクセス（インデックスずれ防止）
          const codeBlock = codeBlockElements[block.index];
          if (!codeBlock) continue;
          const preElement = codeBlock.parentElement;
          if (!preElement) continue;

          const container = document.createElement("div");
          container.className = "mermaid-diagram";
          container.setAttribute("data-mermaid-code", block.code);
          container.setAttribute("data-mermaid-rendered", "true");

          try {
            const svg = await renderMermaid(block.code, theme);
            if (!isMounted) return;
            container.innerHTML = svg;
          } catch (error) {
            console.error("Mermaid rendering failed:", error);
            if (!isMounted) return;
            // エラーフォールバック: コードブロック + エラーメッセージを表示
            container.innerHTML = createErrorFallbackHtml(block.code);
          }

          preElement.replaceWith(container);
        }
      })();
    }

    return () => {
      isMounted = false;
    };
  }, [html, themeId, viewMode]);
}
