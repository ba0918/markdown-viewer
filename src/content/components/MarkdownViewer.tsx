import { h as _h } from "preact";
import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import type { Signal } from "@preact/signals";
import { TableOfContents } from "../../ui-components/markdown/TableOfContents/TableOfContents.tsx";
import { extractHeadings } from "../../domain/toc/extractor.ts";
import { normalizeHeadingLevels } from "../../domain/toc/normalizer.ts";
import { buildTocTree } from "../../domain/toc/tree-builder.ts";
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
import type { Theme } from "../../shared/types/theme.ts";
import { useCopyButtons } from "./hooks/useCopyButtons.ts";
import { useMathJax } from "./hooks/useMathJax.ts";
import { useMermaid } from "./hooks/useMermaid.ts";

/**
 * MarkdownViewerコンポーネント
 *
 * Markdownの表示を担当するメインコンポーネント。View/Raw切り替え、MathJax数式レンダリング、
 * Mermaid図レンダリング、TOC表示、レイアウト可変対応（ToCリサイズ連動）を提供。
 */

interface Props {
  result: RenderResult; // html, rawMarkdown, content, frontmatter
  themeId: Signal<Theme>;
  initialTocState?: TocState; // ToC初期状態（CLS削減用）
}

export const MarkdownViewer = (
  { result, themeId, initialTocState }: Props,
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
  // ADR-007例外: TOC生成はdomain純粋関数の直接呼び出し（TocService削除済み、唯一のTOC生成パス）
  useEffect(() => {
    const headings = extractHeadings(result.content);
    const normalized = normalizeHeadingLevels(headings);
    const items = buildTocTree(normalized);
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

  // カスタムフック: コードブロックにコピーボタンを追加
  useCopyButtons(containerRef, viewMode);

  // カスタムフック: MathJax数式レンダリング
  useMathJax(containerRef, result.html, viewMode);

  // カスタムフック: Mermaidダイアグラムレンダリング
  useMermaid(containerRef, result.html, themeId.value, viewMode);

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
