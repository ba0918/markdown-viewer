/**
 * Table of Contents (TOC) コンポーネント
 *
 * 責務: TOCの表示、スクロール追従、アクティブ状態管理、折りたたみ、Toggle、Resize
 * ✅ OK: 純粋なUIコンポーネント、Preact
 * ❌ NG: ビジネスロジック、messaging直接呼び出し
 */

import { Fragment as _Fragment, h as _h } from "preact";
import { useCallback, useEffect, useState } from "preact/hooks";
import type { TocItem } from "../../../domain/toc/types.ts";
import type { TocState } from "../../../domain/toc/types.ts";
import { DEFAULT_TOC_STATE } from "../../../domain/toc/types.ts";
import { useResizable } from "./useResizable.ts";

// Chrome API型定義（実行時はグローバルに存在する）
declare const chrome: {
  storage: {
    sync: {
      get: (keys: string[]) => Promise<Record<string, unknown>>;
      set: (items: Record<string, unknown>) => Promise<void>;
    };
  };
};

interface Props {
  /** TOCアイテムリスト */
  items: TocItem[];
  /** 現在のテーマID */
  themeId: string;
  /** ToC状態変更時のコールバック（レイアウト調整用） */
  onTocStateChange?: (state: TocState) => void;
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
}: Props) => {
  const [activeId, setActiveId] = useState<string>("");
  const [isLoaded, setIsLoaded] = useState(false);
  const [isUserClick, setIsUserClick] = useState(false); // クリック直後かどうか
  const [tocState, setTocState] = useState<TocState>(DEFAULT_TOC_STATE);
  const [collapsedItems, setCollapsedItems] = useState<Set<string>>(new Set());

  // 永続化された状態を読み込み
  useEffect(() => {
    // chrome.storage が利用可能かチェック
    if (
      typeof chrome === "undefined" || !chrome.storage || !chrome.storage.sync
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
      }
      setIsLoaded(true);
    }).catch(() => {
      // storage取得失敗時はデフォルト値を使用
      setIsLoaded(true);
    });
  }, []);

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

      // E2E環境などでchrome.storageが使えない場合はスキップ
      if (
        typeof chrome !== "undefined" && chrome.storage && chrome.storage.sync
      ) {
        chrome.storage.sync.set({ tocState: newState }).catch(() => {
          // 保存失敗時は無視
        });
      }
    },
  });

  // widthの変化に応じてtocStateを更新
  useEffect(() => {
    if (isLoaded && width !== tocState.width) {
      const newState = { ...tocState, width };
      setTocState(newState);
      onTocStateChange?.(newState);
    }
  }, [width, isLoaded, tocState, onTocStateChange]);

  /**
   * ToC全体の表示/非表示を切り替え
   */
  const toggleVisibility = useCallback(() => {
    const newState = { ...tocState, visible: !tocState.visible };
    setTocState(newState);
    onTocStateChange?.(newState);

    // E2E環境などでchrome.storageが使えない場合はスキップ
    if (
      typeof chrome !== "undefined" && chrome.storage && chrome.storage.sync
    ) {
      chrome.storage.sync.set({ tocState: newState }).catch(() => {
        // 保存失敗時は無視
      });
    }
  }, [tocState, onTocStateChange]);

  /**
   * 項目の折りたたみ状態を切り替え
   */
  const toggleCollapse = useCallback((id: string) => {
    const newSet = new Set(collapsedItems);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setCollapsedItems(newSet);

    const newState = { ...tocState, collapsedItems: Array.from(newSet) };
    setTocState(newState);
    onTocStateChange?.(newState);

    // E2E環境などでchrome.storageが使えない場合はスキップ
    if (
      typeof chrome !== "undefined" && chrome.storage && chrome.storage.sync
    ) {
      chrome.storage.sync.set({ tocState: newState }).catch(() => {
        // 保存失敗時は無視
      });
    }
  }, [collapsedItems, tocState, onTocStateChange]);

  /**
   * IntersectionObserverで現在表示中の見出しを検出
   *
   * 改善: クリック後は手動スクロールまでIntersectionObserverの更新を無視
   * - ユーザーがクリック → クリックした見出しがアクティブ
   * - スクロール完了後もそのまま維持
   * - ユーザーが手動スクロール → 自動追従再開
   */
  useEffect(() => {
    if (items.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // クリック直後は手動スクロールまでIntersectionObserverの更新を無視
        if (isUserClick) {
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

        // 画面上部に最も近い見出しをアクティブにする
        if (visibleHeadings.length > 0) {
          setActiveId(visibleHeadings[0].id);
        }
      },
      {
        // 画面上部10%〜下部80%の範囲で検出
        rootMargin: "-10% 0px -80% 0px",
      },
    );

    // 全見出し要素を監視
    const headings = document.querySelectorAll("h1, h2, h3");
    headings.forEach((h) => observer.observe(h));

    return () => observer.disconnect();
  }, [items, isUserClick]);

  /**
   * アクティブ項目が変わったら、ToCコンテナ内でスクロールして表示
   * ユーザーがページをスクロール → 新しい見出しがアクティブ → ToCも自動追従
   *
   * ToCが表示されている時のみスムーススクロール
   */
  useEffect(() => {
    if (!activeId || isUserClick || !tocState.visible) return;

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
  }, [activeId, isUserClick]);

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
    if (!isUserClick) return;

    const handleManualScroll = () => {
      // 手動スクロール検出 → 自動追従再開
      setIsUserClick(false);
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
  }, [isUserClick]);

  /**
   * TOCアイテムクリック時のハンドラ
   * 対象の見出しまでスムーススクロール
   * クリックした見出しを即座にアクティブにし、手動スクロールまで維持
   */
  const handleClick = (id: string) => {
    // クリックした見出しを即座にアクティブにする
    setActiveId(id);

    // 手動スクロールまでIntersectionObserverの更新を無視
    setIsUserClick(true);

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
              <h2 class="toc-title">目次</h2>
              <button
                type="button"
                class="toc-toggle-btn"
                onClick={toggleVisibility}
                aria-label="Hide ToC"
                title="目次を隠す"
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
              title="ドラッグして幅を調整"
            />
          </>
        )
        : (
          <button
            type="button"
            class="toc-show-btn"
            onClick={toggleVisibility}
            aria-label="Show ToC"
            title="目次を表示"
          >
            ☰
          </button>
        )}
    </aside>
  );
};
