import { h as _h, render } from "preact";
import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import type { Signal } from "@preact/signals";
import { renderMath } from "../../domain/math/renderer.ts";
import { hasMathExpression } from "../../domain/math/detector.ts";
import { detectMermaidBlocks } from "../../domain/markdown/mermaid-detector.ts";
import {
  getMermaidTheme,
  renderMermaid,
} from "../../domain/markdown/mermaid-renderer.ts";
import { TableOfContents } from "../../ui-components/markdown/TableOfContents/TableOfContents.tsx";
import { tocService } from "../../services/toc-service.ts";
import type { TocItem } from "../../domain/toc/types.ts";
import type { TocState } from "../../domain/toc/types.ts";
import { DEFAULT_TOC_STATE } from "../../domain/toc/types.ts";
import type { RenderResult } from "../../shared/types/render.ts";
import { DocumentHeader } from "../../ui-components/markdown/DocumentHeader/DocumentHeader.tsx";
import { RawTextView } from "../../ui-components/markdown/RawTextView/RawTextView.tsx";
import {
  DEFAULT_VIEW_MODE,
  type ViewMode,
} from "../../shared/types/view-mode.ts";
import { CopyButton } from "../../ui-components/shared/CopyButton.tsx";
import { DocumentHeaderMenu } from "../../ui-components/markdown/DocumentHeaderMenu/DocumentHeaderMenu.tsx";
import { ExportMenuItem } from "../../ui-components/markdown/DocumentHeaderMenu/ExportMenuItem.tsx";
import type { Theme } from "../../shared/types/theme.ts";

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
  themeId: Signal<Theme>;
  initialTocState?: TocState; // ToC初期状態（CLS削減用）
  fileUrl: string; // ファイルURL (エクスポート用 + 画像Base64変換の基準URL)
}

export const MarkdownViewer = (
  { result, themeId, initialTocState, fileUrl }: Props,
) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tocItems, setTocItems] = useState<TocItem[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>(DEFAULT_VIEW_MODE);
  const [tocState, setTocState] = useState<TocState>(
    initialTocState || DEFAULT_TOC_STATE,
  );
  const [isInitialRender, setIsInitialRender] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false); // 初期レイアウト確定フラグ（CLS削減）

  // TOC生成（Frontmatter除外済みのcontentを使用）
  useEffect(() => {
    const items = tocService.generate(result.content);
    setTocItems(items);
  }, [result.content]);

  // 初回レンダリング完了後、transitionを有効化 & 表示（CLS削減）
  useEffect(() => {
    // 少し遅延させてから有効化（初期レイアウト確定後）
    const timer = setTimeout(() => {
      setIsInitialRender(false);
      setIsLoaded(true); // レイアウト確定後に表示
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // ToCの状態変更ハンドラ（レイアウト調整用）
  // 同値チェックでムダな再レンダリングを防止（CLS削減）
  const handleTocStateChange = useCallback((newState: TocState) => {
    setTocState((prev) => {
      // visible と width が既に同じなら更新しない
      if (prev.visible === newState.visible && prev.width === newState.width) {
        return prev;
      }
      return newState;
    });
  }, []);

  // ToCの表示状態を判定
  // - 見出しがない場合は強制的に非表示
  // - 見出しがある場合はユーザー設定に従う
  const isTocVisible = tocItems.length > 0 && tocState.visible;

  // ToCの状態に合わせて動的に margin-left を計算
  // - ToCが表示されている場合: ToCの幅 + パディング
  // - ToCが非表示の場合: 最小サイドバー幅（40px）
  const marginLeft = isTocVisible ? tocState.width : 40;

  // Export用: DOM上のレンダリング済みHTMLを取得
  // Mermaid SVG・MathJax SVGが含まれた状態のHTMLを返す
  // コピーボタン等のUI要素はクリーンアップして除外する
  // ローカル画像はCanvas APIでBase64 Data URLに変換する
  const getRenderedHTML = useCallback((): string => {
    if (!containerRef.current) return result.html;

    // DOMをクローンしてUI要素をクリーンアップ
    const clone = containerRef.current.cloneNode(true) as HTMLElement;

    // コピーボタンのコンテナを除去（code-block-wrapper内のbuttonContainer div）
    clone.querySelectorAll(".code-block-copy-button").forEach((btn) => {
      // ボタンのコンテナ（parentElement）ごと削除
      btn.closest("div:not(.code-block-wrapper)")?.remove();
    });

    // ローカル画像をCanvas APIでBase64 Data URLに変換
    // fetch()はContent Scriptからfile:// URLにアクセスできないため、
    // ブラウザが既にロード済みの画像からCanvas経由でBase64を抽出する
    const originalImages = containerRef.current.querySelectorAll("img");
    const cloneImages = clone.querySelectorAll("img");

    for (let i = 0; i < originalImages.length; i++) {
      const originalImg = originalImages[i];
      const cloneImg = cloneImages[i];
      if (!originalImg || !cloneImg) continue;

      const src = originalImg.getAttribute("src") || "";

      // リモート画像（http/https）はスキップ
      if (src.startsWith("http://") || src.startsWith("https://")) continue;
      // 既にData URLの場合はスキップ
      if (src.startsWith("data:")) continue;
      // 画像が未ロードの場合はスキップ
      if (originalImg.naturalWidth === 0) continue;

      try {
        const canvas = document.createElement("canvas");
        canvas.width = originalImg.naturalWidth;
        canvas.height = originalImg.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) continue;

        ctx.drawImage(originalImg, 0, 0);
        // PNG形式でBase64に変換（tainted canvasの場合は例外が投げられる）
        const dataUrl = canvas.toDataURL("image/png");
        cloneImg.setAttribute("src", dataUrl);
      } catch {
        // tainted canvas等のエラー時は元のsrcを保持（ベストエフォート）
        console.warn(`Failed to convert image to Base64 via Canvas: ${src}`);
      }
    }

    return clone.innerHTML;
  }, [result.html]);

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
          className="copy-button code-block-copy-button"
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
            if (!code) {
              console.warn(
                "Mermaid diagram missing data-mermaid-code attribute",
              );
              continue;
            }
            const svg = await renderMermaid(code, theme);
            diagram.innerHTML = svg;
          } catch (error) {
            console.error("Mermaid re-rendering failed:", error);
            // フォールバック: 元のコードブロックを表示
            const code = diagram.getAttribute("data-mermaid-code");
            if (code) {
              const escaped = code.replace(/</g, "&lt;").replace(
                />/g,
                "&gt;",
              );
              diagram.innerHTML =
                `<pre style="padding: 1rem; background: var(--markdown-viewer-code-bg, #f5f5f5); border-radius: 4px; overflow-x: auto;">` +
                `<code class="language-mermaid">${escaped}</code></pre>` +
                `<p style="color: var(--markdown-viewer-error-color, #c53030); font-size: 0.875rem; margin-top: 0.5rem;">` +
                `Failed to render Mermaid diagram</p>`;
            }
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
                container.setAttribute("data-mermaid-rendered", "true"); // レンダリング済みマーク
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
  }, [result.html, themeId.value, viewMode]);

  return (
    <div
      class={`markdown-viewer-layout theme-${themeId.value}`}
      style={{
        // 初期レイアウト確定まで非表示（CLS削減）
        opacity: isLoaded ? "1" : "0",
        transition: isLoaded ? "opacity 0.15s ease-in" : "none",
      }}
    >
      <DocumentHeader
        currentMode={viewMode}
        onModeChange={setViewMode}
        style={{
          // ToCが表示されている場合のみ left を調整
          left: isTocVisible ? `${marginLeft - 20}px` : "0",
        }}
        themeId={themeId.value}
      >
        <DocumentHeaderMenu>
          <ExportMenuItem
            getRenderedHTML={getRenderedHTML}
            themeId={themeId}
            fileUrl={fileUrl}
          />
        </DocumentHeaderMenu>
      </DocumentHeader>
      <TableOfContents
        items={tocItems}
        themeId={themeId.value}
        onTocStateChange={handleTocStateChange}
        initialState={initialTocState}
      />
      <div
        class="markdown-viewer"
        style={{
          marginLeft: `${marginLeft}px`,
          // 初回レンダリング時はtransition無効化（CLS削減）
          transition: isInitialRender ? "none" : "margin-left 0.3s ease",
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
