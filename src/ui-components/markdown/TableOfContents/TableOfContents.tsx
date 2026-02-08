/**
 * Table of Contents (TOC) コンポーネント
 *
 * 責務: TOCの表示、スクロール追従、アクティブ状態管理、折りたたみ、Toggle、Resize
 * ✅ OK: 純粋なUIコンポーネント、Preact
 * ❌ NG: ビジネスロジック、messaging直接呼び出し
 */

import { h, Fragment } from 'preact';
import { useState, useEffect, useCallback } from 'preact/hooks';
import { signal } from '@preact/signals';
import type { TocItem } from '../../../domain/toc/types.ts';
import type { TocState } from '../../../domain/toc/types.ts';
import { DEFAULT_TOC_STATE } from '../../../domain/toc/types.ts';
import { useResizable } from './useResizable.ts';

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
}

// ToC状態をSignalで管理（グローバル）
const tocState = signal<TocState>(DEFAULT_TOC_STATE);
const collapsedItems = signal<Set<string>>(new Set());

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
export const TableOfContents = ({ items, themeId }: Props) => {
  const [activeId, setActiveId] = useState<string>('');
  const [isLoaded, setIsLoaded] = useState(false);

  // 永続化された状態を読み込み
  useEffect(() => {
    // chrome.storage が利用可能かチェック
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.sync) {
      // E2E環境などchrome.storageが使えない場合はデフォルト値を使用
      setIsLoaded(true);
      return;
    }

    chrome.storage.sync.get(['tocState']).then((result) => {
      if (result.tocState) {
        const state = result.tocState as TocState;
        tocState.value = state;
        collapsedItems.value = new Set(state.collapsedItems);
      }
      setIsLoaded(true);
    }).catch(() => {
      // storage取得失敗時はデフォルト値を使用
      setIsLoaded(true);
    });
  }, []);

  // Resize Hook
  const { width, isResizing, startResize } = useResizable({
    initialWidth: tocState.value.width,
    minWidth: 150,
    maxWidth: 500,
    onWidthChange: (newWidth) => {
      // 横幅変更時に永続化
      const newState = { ...tocState.value, width: newWidth };
      tocState.value = newState;
      chrome.storage.sync.set({ tocState: newState }).catch(() => {
        // 保存失敗時は無視
      });
    },
  });

  // widthの変化に応じてtocState.valueを更新
  useEffect(() => {
    if (isLoaded && width !== tocState.value.width) {
      tocState.value = { ...tocState.value, width };
    }
  }, [width, isLoaded]);

  /**
   * ToC全体の表示/非表示を切り替え
   */
  const toggleVisibility = useCallback(() => {
    const newState = { ...tocState.value, visible: !tocState.value.visible };
    tocState.value = newState;
    chrome.storage.sync.set({ tocState: newState }).catch(() => {
      // 保存失敗時は無視
    });
  }, []);

  /**
   * 項目の折りたたみ状態を切り替え
   */
  const toggleCollapse = useCallback((id: string) => {
    const newSet = new Set(collapsedItems.value);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    collapsedItems.value = newSet;

    const newState = { ...tocState.value, collapsedItems: Array.from(newSet) };
    tocState.value = newState;
    chrome.storage.sync.set({ tocState: newState }).catch(() => {
      // 保存失敗時は無視
    });
  }, []);

  /**
   * IntersectionObserverで現在表示中の見出しを検出
   */
  useEffect(() => {
    if (items.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      {
        // 画面上部10%〜下部80%の範囲で検出
        rootMargin: '-10% 0px -80% 0px',
      }
    );

    // 全見出し要素を監視
    const headings = document.querySelectorAll('h1, h2, h3');
    headings.forEach((h) => observer.observe(h));

    return () => observer.disconnect();
  }, [items]);

  /**
   * TOCアイテムクリック時のハンドラ
   * 対象の見出しまでスムーススクロール
   */
  const handleClick = (id: string) => {
    const element = document.getElementById(id);
    element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  /**
   * TOCアイテムを再帰的にレンダリング
   */
  const renderItem = (item: TocItem) => {
    const hasChildren = item.children.length > 0;
    const isCollapsed = collapsedItems.value.has(item.id);

    return (
      <li key={item.id} class={`toc-item toc-level-${item.level}`}>
        <div class="toc-item-wrapper">
          {hasChildren && (
            <button
              class="toc-collapse-btn"
              onClick={() => toggleCollapse(item.id)}
              aria-label={isCollapsed ? 'Expand' : 'Collapse'}
              title={isCollapsed ? '展開' : '折りたたむ'}
            >
              {isCollapsed ? '▶' : '▼'}
            </button>
          )}
          <a
            href={`#${item.id}`}
            class={activeId === item.id ? 'toc-link active' : 'toc-link'}
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
      class={`toc-container ${tocState.value.visible ? 'visible' : 'hidden'} toc-theme-${themeId}`}
      style={{ width: tocState.value.visible ? `${width}px` : '40px' }}
    >
      {tocState.value.visible ? (
        <>
          <div class="toc-header">
            <h2 class="toc-title">目次</h2>
            <button
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
            class={`toc-resize-handle ${isResizing ? 'resizing' : ''}`}
            onMouseDown={startResize}
            title="ドラッグして幅を調整"
          />
        </>
      ) : (
        <button
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
