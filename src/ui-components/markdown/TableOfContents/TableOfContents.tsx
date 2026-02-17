/**
 * Table of Contents (TOC) コンポーネント
 *
 * 目次の表示、スクロール追従によるアクティブ状態管理、折りたたみ、Toggle、Resize機能を提供する。
 * chrome.storage経由で状態を永続化し、ページリロード後も設定を維持。
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
import { toggleSetItem as toggleCollapsedItem } from "../../../shared/utils/toggle-set-item.ts";

/**
 * chrome.storage.sync が利用可能かチェック
 * E2Eテスト環境等ではchrome.storageが存在しない場合がある
 */
const isStorageAvailable = (): boolean => {
  return typeof chrome !== "undefined" && !!chrome.storage &&
    !!chrome.storage.sync;
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
  const [activeId, setActiveId] = useState<string>("");
  const [isLoaded, setIsLoaded] = useState(false);
  const isUserClickRef = useRef(false); // クリック直後かどうか（useRefで管理し、useEffect再実行を防止）
  const [tocState, setTocState] = useState<TocState>(
    initialState || DEFAULT_TOC_STATE,
  );
  const [collapsedItems, setCollapsedItems] = useState<Set<string>>(
    new Set(initialState?.collapsedItems || []),
  );

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

      if (isStorageAvailable()) {
        chrome.storage.sync.set({ tocState: newState }).catch(() => {
          // 保存失敗時は無視
        });
      }
    },
  });

  /**
   * ToC全体の表示/非表示を切り替え
   */
  const toggleVisibility = useCallback(() => {
    const newState = { ...tocState, visible: !tocState.visible };
    setTocState(newState);
    onTocStateChange?.(newState);

    if (isStorageAvailable()) {
      chrome.storage.sync.set({ tocState: newState }).catch(() => {
        // 保存失敗時は無視
      });
    }
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

    if (isStorageAvailable()) {
      chrome.storage.sync.set({ tocState: newState }).catch(() => {
        // 保存失敗時は無視
      });
    }
  }, [collapsedItems, tocState, onTocStateChange]);

  /**
   * Markdownコンテンツ内の見出し要素のみを取得（ToCヘッダー等のUI要素を除外）
   * IDが付与されている見出しのみ = addHeadingIds()で処理されたMarkdown由来の見出し
   */
  const getContentHeadings = useCallback((): Element[] => {
    const allHeadings = document.querySelectorAll("h1, h2, h3");
    return Array.from(allHeadings).filter((h) => h.id !== "");
  }, []);

  /**
   * スクロール位置から最も近い「既に通過した」見出しを検索
   * ビューポート上部（DocumentHeader下端）より上にある最後の見出しを返す
   */
  const findLastPassedHeading = useCallback((): string => {
    const HEADER_HEIGHT = 56; // DocumentHeaderの高さ(px) - base.cssの.document-headerと一致
    const headings = getContentHeadings();
    let lastPassedId = "";
    for (const heading of headings) {
      const rect = heading.getBoundingClientRect();
      if (rect.top < HEADER_HEIGHT) {
        lastPassedId = heading.id;
      }
    }
    return lastPassedId;
  }, [getContentHeadings]);

  /**
   * IntersectionObserverで現在表示中の見出しを検出
   *
   * 改善点:
   * 1. rootMarginを固定値ベースに変更（ビューポートサイズ依存を排除）
   * 2. フォールバックロジック追加（検出範囲内に見出しがない場合も対応）
   * 3. 初期アクティブ設定（DOMに見出しが存在するまで待機してから設定）
   * 4. isUserClickをuseRefで管理（useEffect再実行を防止）
   * 5. scrollイベントでIntersectionObserverのギャップをカバー
   *
   * クリック後は手動スクロールまでIntersectionObserverの更新を無視:
   * - ユーザーがクリック → クリックした見出しがアクティブ
   * - スクロール完了後もそのまま維持
   * - ユーザーが手動スクロール → 自動追従再開
   */
  useEffect(() => {
    if (items.length === 0) return;

    let observer: IntersectionObserver | null = null;
    let pollingTimer: ReturnType<typeof setTimeout> | null = null;
    let isCleanedUp = false;

    /**
     * 現在のスクロール位置に基づいてアクティブな見出しを決定
     * IntersectionObserverのギャップ（見出しが検出範囲外にある時）をカバー
     */
    const updateActiveFromScroll = () => {
      if (isUserClickRef.current) return;
      const lastPassedId = findLastPassedHeading();
      if (lastPassedId) {
        setActiveId(lastPassedId);
      } else {
        // ページ最上部（どの見出しも通過していない）→ 最初のコンテンツ見出しをアクティブに
        const contentHeadings = getContentHeadings();
        if (contentHeadings.length > 0) {
          setActiveId(contentHeadings[0].id);
        }
      }
    };

    /**
     * IntersectionObserverとscrollイベントリスナーをセットアップ
     * DOMに見出しが存在することが保証された状態で呼ばれる
     */
    const setupObserver = (headings: Element[]) => {
      if (isCleanedUp) return;

      observer = new IntersectionObserver(
        (entries) => {
          // クリック直後は手動スクロールまでIntersectionObserverの更新を無視
          if (isUserClickRef.current) {
            return;
          }

          // 現在画面内にある見出しを収集
          const visibleHeadings = entries
            .filter((entry) => entry.isIntersecting)
            .map((entry) => ({
              id: entry.target.id,
              top: entry.boundingClientRect.top,
            }))
            .sort((a, b) => a.top - b.top); // 画面上部に近い順にソート

          if (visibleHeadings.length > 0) {
            // 画面上部に最も近い見出しをアクティブにする
            setActiveId(visibleHeadings[0].id);
          } else {
            // フォールバック: スクロール位置ベースで判定
            updateActiveFromScroll();
          }
        },
        {
          // DocumentHeader高さ(56px)分を上部から除外、下部70%を除外
          // → ビューポート上部30%の領域で見出しを検出
          rootMargin: "-56px 0px -70% 0px",
        },
      );

      // 見出し要素を監視
      headings.forEach((h) => observer!.observe(h));

      // scrollイベントリスナーでIntersectionObserverのギャップをカバー
      // 特にページトップ/ボトムでの検出漏れを防止
      let scrollRAF: number | null = null;
      const handleScroll = () => {
        if (isUserClickRef.current) return;
        // requestAnimationFrameでスロットリング
        if (scrollRAF) return;
        scrollRAF = requestAnimationFrame(() => {
          scrollRAF = null;
          updateActiveFromScroll();
        });
      };
      globalThis.addEventListener("scroll", handleScroll, { passive: true });

      // 初期アクティブ設定: 見出しが確実にDOMにある状態で設定
      updateActiveFromScroll();

      // クリーンアップにscrollリスナー解除を追加
      const originalCleanup = () => {
        globalThis.removeEventListener("scroll", handleScroll);
        if (scrollRAF) cancelAnimationFrame(scrollRAF);
      };
      return originalCleanup;
    };

    /**
     * DOMに見出し要素が存在するまでポーリングで待機
     * Chrome拡張環境では、dangerouslySetInnerHTMLによるDOM更新が
     * useEffect実行時にまだ完了していない場合がある
     */
    let scrollCleanup: (() => void) | null = null;
    const POLL_INTERVAL = 50; // 50ms間隔
    const MAX_POLL_TIME = 2000; // 最大2秒
    let elapsed = 0;

    const pollForHeadings = () => {
      if (isCleanedUp) return;

      const headings = getContentHeadings();
      if (headings.length > 0) {
        // 見出しが見つかった → Observerセットアップ
        scrollCleanup = setupObserver(headings) || null;
      } else if (elapsed < MAX_POLL_TIME) {
        // まだ見出しがない → 再試行
        elapsed += POLL_INTERVAL;
        pollingTimer = setTimeout(pollForHeadings, POLL_INTERVAL);
      }
    };

    // 即座に試行（DOMが既に準備できている場合のため）
    pollForHeadings();

    return () => {
      isCleanedUp = true;
      if (observer) observer.disconnect();
      if (pollingTimer) clearTimeout(pollingTimer);
      if (scrollCleanup) scrollCleanup();
    };
  }, [items, findLastPassedHeading, getContentHeadings]);

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
   * ユーザーの手動スクロールを検出
   * wheelイベント（マウスホイール/トラックパッド）やtouchイベント（スワイプ）で自動追従を再開
   */
  useEffect(() => {
    const handleManualScroll = () => {
      // 手動スクロール検出 → 自動追従再開
      // クリック状態でない場合は何もしない
      if (!isUserClickRef.current) return;
      isUserClickRef.current = false;
    };

    // マウスホイール、トラックパッド
    globalThis.addEventListener("wheel", handleManualScroll, { passive: true });
    // タッチスワイプ
    globalThis.addEventListener("touchmove", handleManualScroll, {
      passive: true,
    });
    // キーボードスクロール（↑↓, PageUp/Down, Space）
    globalThis.addEventListener("keydown", handleManualScroll);

    return () => {
      globalThis.removeEventListener("wheel", handleManualScroll);
      globalThis.removeEventListener("touchmove", handleManualScroll);
      globalThis.removeEventListener("keydown", handleManualScroll);
    };
  }, []);

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
