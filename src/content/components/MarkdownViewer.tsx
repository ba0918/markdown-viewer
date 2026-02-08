import { h as _h, render } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import type { Signal } from "@preact/signals";
import { renderMath } from "../../domain/math/renderer.ts";
import { hasMathExpression } from "../../domain/math/detector.ts";
import { detectMermaidBlocks } from "../../domain/markdown/mermaid-detector.ts";
import {
  getMermaidTheme,
  renderMermaid,
} from "../../domain/markdown/mermaid-renderer.ts";
import {
  TableOfContents,
  tocState,
} from "../../ui-components/markdown/TableOfContents/TableOfContents.tsx";
import { tocService } from "../../services/toc-service.ts";
import type { TocItem } from "../../domain/toc/types.ts";
import type { RenderResult } from "../../shared/types/render.ts";
import { DocumentHeader } from "../../ui-components/markdown/DocumentHeader/DocumentHeader.tsx";
import { RawTextView } from "../../ui-components/markdown/RawTextView/RawTextView.tsx";
import {
  DEFAULT_VIEW_MODE,
  type ViewMode,
} from "../../shared/types/view-mode.ts";
import { CopyButton } from "../../ui-components/shared/CopyButton.tsx";

/**
 * MarkdownViewerコンポーネント
 *
 * 責務: Markdownの表示、View/Raw切り替え、MathJax数式レンダリング、Mermaid図レンダリング、TOC表示、レイアウト可変対応
 * ❌ 禁止: ビジネスロジック
 *
 * レイアウト可変対応:
 * - ToCの幅に合わせて `.markdown-viewer` の `margin-left` を動的に調整
 * - ToCがリサイズされても、Markdownコンテンツに被らないようにする
 */

interface Props {
  result: RenderResult; // html, rawMarkdown, content, frontmatter
  themeId: Signal<string>;
}

export const MarkdownViewer = ({ result, themeId }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tocItems, setTocItems] = useState<TocItem[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>(DEFAULT_VIEW_MODE);

  // TOC生成（Frontmatter除外済みのcontentを使用）
  useEffect(() => {
    const items = tocService.generate(result.content);
    setTocItems(items);
  }, [result.content]);

  // ToCの状態に合わせて動的に margin-left を計算
  // ⚠️ tocState.value を使うことで、Signalの変更を自動検知（リアクティブ）
  // - ToCが表示されている場合: ToCの幅 + パディング
  // - ToCが非表示の場合: 最小サイドバー幅（40px）
  const marginLeft = tocState.value.visible ? tocState.value.width : 40;

  useEffect(() => {
    if (!containerRef.current) return;

    // コードブロックにコピーボタンを追加
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
        <CopyButton
          text={code}
          className="code-block-copy-button"
          ariaLabel="Copy code to clipboard"
          title="Copy code"
        />,
        buttonContainer,
      );
    });

    // MathJax数式レンダリング
    if (hasMathExpression(result.html)) {
      try {
        renderMath(containerRef.current);
      } catch (error) {
        console.error("MathJax rendering failed:", error);
      }
    }

    // Mermaidダイアグラムレンダリング
    const mermaidBlocks = detectMermaidBlocks(result.html);
    const existingDiagrams = containerRef.current?.querySelectorAll(
      ".mermaid-diagram",
    );

    // アプリテーマからMermaidテーマを取得
    const theme = getMermaidTheme(themeId.value);

    // 既存のダイアグラムがある場合は再レンダリング（テーマ変更時）
    if (existingDiagrams && existingDiagrams.length > 0) {
      (async () => {
        for (const diagram of existingDiagrams) {
          try {
            const code = diagram.getAttribute("data-mermaid-code");
            if (code) {
              const svg = await renderMermaid(code, theme);
              diagram.innerHTML = svg;
            }
          } catch (error) {
            console.error("Mermaid re-rendering failed:", error);
          }
        }
      })();
    } // 新規レンダリング（初回表示時）
    else if (mermaidBlocks.length > 0) {
      (async () => {
        for (const block of mermaidBlocks) {
          try {
            // SVGをレンダリング
            const svg = await renderMermaid(block.code, theme);

            // 元のコードブロックを見つける（毎回再取得）
            const codeBlocks = containerRef.current?.querySelectorAll(
              "code.language-mermaid",
            );
            if (codeBlocks && codeBlocks[0]) {
              // 常に最初の要素を処理（前の要素は置き換えられているため）
              const codeBlock = codeBlocks[0];
              const preElement = codeBlock.parentElement;

              if (preElement) {
                // SVGコンテナを作成
                const container = document.createElement("div");
                container.className = "mermaid-diagram";
                container.setAttribute("data-mermaid-code", block.code); // 元のコードを保存
                container.innerHTML = svg;

                // 元の<pre>要素を置き換え
                preElement.replaceWith(container);
              }
            }
          } catch (error) {
            console.error("Mermaid rendering failed:", error);
          }
        }
      })();
    }
  }, [result.html, themeId.value]);

  return (
    <div class={`markdown-viewer-layout theme-${themeId.value}`}>
      <DocumentHeader
        currentMode={viewMode}
        onModeChange={setViewMode}
        style={{
          left: `${marginLeft - 20}px`, // ToCの幅（marginLeft - gap 20px）
        }}
        themeId={themeId.value}
      />
      <TableOfContents items={tocItems} themeId={themeId.value} />
      <div
        class="markdown-viewer"
        style={{
          marginLeft: `${marginLeft}px`,
          transition: "margin-left 0.3s ease", // ToCリサイズに合わせてスムーズに変化
        }}
      >
        {viewMode === "view"
          ? (
            <div
              ref={containerRef}
              class="markdown-body"
              dangerouslySetInnerHTML={{ __html: result.html }}
            />
          )
          : <RawTextView rawMarkdown={result.rawMarkdown} />}
      </div>
    </div>
  );
};
