/**
 * Table of Contents (TOC) コンポーネント
 *
 * 目次の表示、スクロール追従によるアクティブ状態管理、折りたたみ、Toggle、Resize機能を提供する。
 * chrome.storage経由で状態を永続化し、ページリロード後も設定を維持。
 *
 * スクロール追従ロジック（IntersectionObserver/MutationObserver/scrollイベント）は
 * useActiveHeadingフックに分離。
 */

import { Fragment as _Fragment, h as _h } from "preact";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "preact/hooks";
import type { TocItem } from "../../../shared/types/toc.ts";
import type { TocState } from "../../../shared/types/toc.ts";
import { DEFAULT_TOC_STATE } from "../../../shared/types/toc.ts";
import { useResizable } from "./useResizable.ts";
import { useActiveHeading } from "./useActiveHeading.ts";
import { toggleSetItem as toggleCollapsedItem } from "../../../shared/utils/toggle-set-item.ts";

/**
 * chrome.storage.sync が利用可能かチェック
 * E2Eテスト環境等ではchrome.storageが存在しない場合がある
 */
const isStorageAvailable = (): boolean => {
  return typeof chrome !== "undefined" && !!chrome.storage &&
    !!chrome.storage.sync;
};

/** tocStateをchrome.storageに永続化（利用可能な場合のみ） */
const persistTocState = (state: TocState): void => {
  if (isStorageAvailable()) {
    chrome.storage.sync.set({ tocState: state }).catch(() => {
      // 保存失敗時は無視（ストレージエラーでUI操作をブロックしない）
    });
  }
};

interface Props {
  /** TOCアイテムリスト */
  items: TocItem[];
  /** 現在のテーマID */
  themeId: string;
  /** ToC状態変更時のコールバック（レイアウト調整用） */
  onTocStateChange?: (state: TocState) => void;
  /** ToC初期状態（CLS削減用、指定時はChrome Storage読み込みをスキップ） */
  initialState?: TocState;
}

/**
 * Table of Contentsコンポーネント
 *
 * 機能:
 * - H1-H3見出しを左サイドに固定表示
 * - スクロールに追従（position: fixed）
 * - 現在表示中の見出しをハイライト（IntersectionObserver）
 * - クリックでスムーススクロール
 * - 階層の折りたたみ機能（▶/▼アイコン）
 * - ToC全体の表示/非表示Toggle（×/☰ボタン）
 * - 横幅リサイズ機能（Resize Handle）
 */
export const TableOfContents = ({
  items,
  themeId: _themeId,
  onTocStateChange,
  initialState,
}: Props) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const isUserClickRef = useRef(false); // クリック直後かどうか（useRefで管理し、useEffect再実行を防止）
  const [tocState, setTocState] = useState<TocState>(
    initialState || DEFAULT_TOC_STATE,
  );
  const [collapsedItems, setCollapsedItems] = useState<Set<string>>(
    new Set(initialState?.collapsedItems || []),
  );

  // Active Heading Hook: スクロール追従によるアクティブ見出し検出
  const { activeId, setActiveId } = useActiveHeading({
    items,
    isUserClickRef,
  });

  // 永続化された状態を読み込み（initialStateが指定されている場合はスキップ）
  // useLayoutEffectを使用して、レンダリング前に同期的に親に通知（CLS削減）
  useLayoutEffect(() => {
    // initialStateが指定されている場合はChrome Storage読み込みをスキップ（CLS削減）
    if (initialState) {
      setIsLoaded(true);
      // 初期状態を親に通知（同期的に実行）
      onTocStateChange?.(initialState);
      return;
    }

    // chrome.storage が利用可能かチェック
    if (
      !isStorageAvailable()
    ) {
      // E2E環境などchrome.storageが使えない場合はデフォルト値を使用
      setIsLoaded(true);
      return;
    }

    chrome.storage.sync.get(["tocState"]).then((result) => {
      if (result.tocState) {
        const state = result.tocState as TocState;
        setTocState(state);
        setCollapsedItems(new Set(state.collapsedItems));
        // 初期化時に読み込んだ状態を親に通知（レイアウト調整のため）
        onTocStateChange?.(state);
      }
      setIsLoaded(true);
    }).catch(() => {
      // storage取得失敗時はデフォルト値を使用
      setIsLoaded(true);
    });
    // deps: onTocStateChangeはコールバック参照のため除外（再レンダリングループ防止）
  }, [initialState]);

  // Resize Hook
  const { width, isResizing, startResize } = useResizable({
    initialWidth: tocState.width,
    minWidth: 150,
    maxWidth: 500,
    onWidthChange: (newWidth) => {
      // 横幅変更時に永続化
      const newState = { ...tocState, width: newWidth };
      setTocState(newState);
      onTocStateChange?.(newState);
      persistTocState(newState);
    },
  });

  /**
   * ToC全体の表示/非表示を切り替え
   */
  const toggleVisibility = useCallback(() => {
    const newState = { ...tocState, visible: !tocState.visible };
    setTocState(newState);
    onTocStateChange?.(newState);
    persistTocState(newState);
  }, [tocState, onTocStateChange]);

  /**
   * 項目の折りたたみ状態を切り替え
   */
  const toggleCollapse = useCallback((id: string) => {
    const newItems = toggleCollapsedItem(Array.from(collapsedItems), id);
    const newSet = new Set(newItems);
    setCollapsedItems(newSet);

    const newState = { ...tocState, collapsedItems: newItems };
    setTocState(newState);
    onTocStateChange?.(newState);
    persistTocState(newState);
  }, [collapsedItems, tocState, onTocStateChange]);

  /**
   * アクティブ項目が変わったら、ToCコンテナ内でスクロールして表示
   * ユーザーがページをスクロール → 新しい見出しがアクティブ → ToCも自動追従
   *
   * ToCが表示されている時のみスムーススクロール
   */
  useEffect(() => {
    if (!activeId || isUserClickRef.current || !tocState.visible) return;

    // アクティブなToCリンクを取得
    const activeLink = document.querySelector(`.toc-link.active`);
    if (activeLink) {
      // ToCコンテナ内でスムーススクロール
      activeLink.scrollIntoView({
        behavior: "smooth",
        block: "nearest", // 上下どちらか近い方に配置
        inline: "nearest",
      });
    }
  }, [activeId]);

  /**
   * ToCを表示した瞬間に、現在のアクティブ項目までスクロール
   * 隠してる間にページスクロールしてた場合でも、表示時に正しい位置に同期
   */
  useEffect(() => {
    // ToCが表示状態になった瞬間のみ実行
    if (!tocState.visible || !activeId) return;

    // 少し遅延させてDOMが安定してから実行
    const timer = setTimeout(() => {
      const activeLink = document.querySelector(`.toc-link.active`);
      if (activeLink) {
        activeLink.scrollIntoView({
          behavior: "auto", // 即座に移動(スムーズなし)
          block: "center", // 画面中央に配置
          inline: "nearest",
        });
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [tocState.visible]); // visible が変わった時のみ

  /**
   * TOCアイテムクリック時のハンドラ
   * 対象の見出しまでスムーススクロール
   * クリックした見出しを即座にアクティブにし、手動スクロールまで維持
   */
  const handleClick = (id: string) => {
    // クリックした見出しを即座にアクティブにする
    setActiveId(id);

    // 手動スクロールまでIntersectionObserverの更新を無視
    isUserClickRef.current = true;

    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  /**
   * TOCアイテムを再帰的にレンダリング
   */
  const renderItem = (item: TocItem) => {
    const hasChildren = item.children.length > 0;
    const isCollapsed = collapsedItems.has(item.id);

    return (
      <li key={item.id} class={`toc-item toc-level-${item.level}`}>
        <div class="toc-item-wrapper">
          {hasChildren && (
            <button
              type="button"
              class="toc-collapse-btn"
              onClick={() => toggleCollapse(item.id)}
              aria-label={isCollapsed ? "Expand" : "Collapse"}
              title={isCollapsed ? "展開" : "折りたたむ"}
            >
              {isCollapsed ? "▶" : "▼"}
            </button>
          )}
          <a
            href={`#${item.id}`}
            class={activeId === item.id ? "toc-link active" : "toc-link"}
            onClick={(e) => {
              e.preventDefault();
              handleClick(item.id);
            }}
            title={item.text}
          >
            {item.text}
          </a>
        </div>
        {hasChildren && !isCollapsed && (
          <ul class="toc-sublist">
            {item.children.map((child) => renderItem(child))}
          </ul>
        )}
      </li>
    );
  };

  // 見出しがない場合は何も表示しない
  if (items.length === 0) return null;

  // ロード中は何も表示しない（ちらつき防止）
  if (!isLoaded) return null;

  return (
    <aside
      class={`toc-container ${tocState.visible ? "visible" : "hidden"}`}
      style={{ width: tocState.visible ? `${width}px` : "40px" }}
    >
      {tocState.visible
        ? (
          <>
            <div class="toc-header">
              <h2 class="toc-title">Table of Contents</h2>
              <button
                type="button"
                class="toc-toggle-btn"
                onClick={toggleVisibility}
                aria-label="Hide ToC"
                title="Hide Table of Contents"
              >
                ×
              </button>
            </div>
            <nav class="toc" aria-label="Table of Contents">
              <ul class="toc-list">{items.map((item) => renderItem(item))}</ul>
            </nav>
            <div
              class={`toc-resize-handle ${isResizing ? "resizing" : ""}`}
              onMouseDown={startResize}
              title="Drag to resize"
            />
          </>
        )
        : (
          <button
            type="button"
            class="toc-show-btn"
            onClick={toggleVisibility}
            aria-label="Show ToC"
            title="Show Table of Contents"
          >
            ☰
          </button>
        )}
    </aside>
  );
};
