import { useEffect } from "preact/hooks";
import type { RefObject } from "preact";
import { h, render } from "preact";
import { CopyButton } from "../../../ui-components/shared/CopyButton.tsx";
import type { ViewMode } from "../../../shared/types/view-mode.ts";

/**
 * コードブロックにコピーボタンを追加するフック
 *
 * pre > code 要素を検出し、Preact CopyButtonコンポーネントを動的にレンダリング。
 * Mermaidブロックはスキップ（専用ダイアグラム表示になるため）。
 *
 * @param containerRef - Markdownコンテンツのコンテナ要素
 * @param viewMode - 現在のViewMode（rawモードではスキップ）
 */
export function useCopyButtons(
  containerRef: RefObject<HTMLDivElement>,
  viewMode: ViewMode,
): void {
  useEffect(() => {
    if (viewMode === "raw") return;
    if (!containerRef.current) return;

    const codeBlocks = containerRef.current.querySelectorAll("pre > code");
    codeBlocks.forEach((codeElement) => {
      const preElement = codeElement.parentElement;
      if (!preElement) return;

      // 既にコピーボタンが追加されている場合はスキップ
      if (preElement.querySelector(".code-block-copy-button")) return;

      // Mermaidブロックはスキップ（専用のダイアグラム表示になるため）
      if (codeElement.classList.contains("language-mermaid")) return;

      // コードの内容を取得
      const code = codeElement.textContent || "";

      // ラッパーdivを作成
      const wrapper = document.createElement("div");
      wrapper.className = "code-block-wrapper";

      // preElementをwrapperで囲む
      preElement.parentNode?.insertBefore(wrapper, preElement);
      wrapper.appendChild(preElement);

      // コピーボタンをPreactコンポーネントとして追加
      const buttonContainer = document.createElement("div");
      wrapper.insertBefore(buttonContainer, preElement);
      render(
        h(CopyButton, {
          text: code,
          className: "copy-button code-block-copy-button",
          ariaLabel: "Copy code to clipboard",
          title: "Copy code",
        }),
        buttonContainer,
      );
    });
  }, [viewMode]);
}
