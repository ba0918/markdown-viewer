# ToC UX Improvements (折りたたみ・固定・リサイズ・デザイン刷新)

**Cycle ID:** `20260208111558`
**Started:** 2026-02-08 11:15:58
**Status:** 🟡 Planning

---

## 📝 What & Why

前回実装したTable of Contents (ToC) 機能に5つのUX改善を実施する。階層の折りたたみ、全体の表示/非表示、スクロール追従の最適化、横幅調整機能、そしてプロフェッショナルなデザイン刷新により、実用的で美しいナビゲーション体験を実現する。

**⚠️ 追加問題（Resume時に判明）:**
ToCリサイズ時に `markdown-viewer` がレイアウト可変じゃないため、ToCがMarkdownコンテンツに被さってしまう。ToCの幅に合わせて `markdown-viewer` に動的な `margin-left` を設定し、レイアウトを可変対応させる必要がある。

## 🎯 Goals

1. **階層の折りたたみ機能** - h1/h2/h3レベル単位で開閉可能に（▶/▼アイコン）
2. **ToC全体の表示/非表示** - Toggle Button（×/☰）でToC全体を仕舞える
3. **スクロール追従の改善** - 下にスクロールしてもToCが常に見える（固定位置最適化）
4. **横幅調整機能** - ドラッグ可能なResize Handleで横幅を自由に調整（150px〜500px）
5. **デザイン刷新** - frontend-designによるプロフェッショナルなUI/UX、全6テーマ対応
6. **レイアウト可変対応** - ToCリサイズ時に `markdown-viewer` が被らないよう、動的 `margin-left` でレイアウトを調整

## 📐 Design

### Architecture Overview

```
UI State Management (Preact Signals)
  ↓
ui-components/markdown/TableOfContents/
  ├── TableOfContents.tsx    # 折りたたみ・Toggle・Resize実装
  ├── toc.css                # アニメーション・スタイル強化
  └── useResizable.ts        # (新) Resize Hook
  ↓
chrome.storage.sync (永続化)
  - tocVisible: boolean
  - tocWidth: number
  - collapsedItems: string[]
```

### Files to Change

```
src/
  ui-components/
    markdown/
      TableOfContents/
        TableOfContents.tsx         # 折りたたみロジック・Toggle・Resize実装
        toc.css                     # 折りたたみアニメーション・Resize Handle・デザイン刷新
        useResizable.ts             # (新規) Resize Hook（ドラッグ操作ロジック）

  content/
    components/
      MarkdownViewer.tsx            # (修正) ToCの幅に合わせてmargin-left動的設定
    styles/
      themes/
        *.css                       # 各テーマのToC配色調整（必要に応じて）

  domain/
    toc/
      types.ts                      # TocState型追加（折りたたみ状態管理用）

tests/
  e2e/
    toc-ux.spec.ts                  # (新規) ToC UX機能のE2Eテスト
```

### Key Points

#### 1. 階層の折りたたみ機能
- **State管理**: Preact Signals `signal<Set<string>>()` で折りたたまれた項目IDを管理
- **UI**: 子要素がある項目に `▶` (折りたたみ) / `▼` (展開) アイコン表示
- **動作**: アイコンクリックで子要素の表示/非表示を切り替え（親項目のリンクは通常通り動作）
- **初期状態**: 全展開（デフォルト）
- **永続化**: `chrome.storage.sync` に `collapsedItems: string[]` として保存

#### 2. ToC全体の表示/非表示
- **Toggle Button**: ToC上部に `×` (非表示) / `☰` (表示) アイコンボタン
- **動作**: クリックでToC全体を非表示 → 最小幅（40px程度）のサイドバーに縮小、アイコンのみ表示
- **永続化**: `chrome.storage.sync` に `tocVisible: boolean` として保存
- **アニメーション**: スムーズな開閉トランジション（CSS `transition`）

#### 3. スクロール追従の改善
- **現状確認**: `position: sticky` 実装済み
- **問題**: レイアウトによってはスクロール時に見えなくなる可能性
- **解決策**:
  - `position: sticky` の親要素の高さ制約を確認・調整
  - 必要に応じて `position: fixed` への変更検討
  - `top: 2rem` の調整で最適な固定位置を実現

#### 4. 横幅調整機能
- **Resize Handle**: ToC右端にドラッグ可能なハンドル（3px幅の縦線、ホバーで強調）
- **制約**: 最小幅 150px、最大幅 500px
- **実装**: `useResizable.ts` カスタムHookでドラッグ操作を管理
  - `mousedown` → `mousemove` → `mouseup` イベントハンドリング
  - ドラッグ中はカーソルを `col-resize` に変更
- **永続化**: `chrome.storage.sync` に `tocWidth: number` として保存
- **長文対策**: 項目名が長い場合は `text-overflow: ellipsis` でトリミング、ホバーでツールチップ表示

#### 5. デザイン刷新
- **frontend-design活用**: プロフェッショナルなUI/UX
- **アイコン**: SVGインライン（Material Icons風）またはFeather Icons検討
- **アニメーション**:
  - 折りたたみ時のスムーズな `max-height` トランジション
  - ToC表示/非表示時の `width` トランジション
  - アクティブ項目のハイライト強調
- **テーマ対応**: 全6テーマ（light/dark/github/minimal/solarized_light/solarized_dark）で統一感のあるデザイン
- **視覚的改善**:
  - シャドウ・ボーダーで立体感
  - ホバーエフェクトの洗練
  - スクロールバーのカスタムスタイリング強化

#### 6. レイアウト可変対応（ToCリサイズ時の被り防止）
- **問題**: ToCが `position: fixed` で固定されているため、ToCをリサイズしても `markdown-viewer` の幅が変わらず、ToCがMarkdownコンテンツに被さってしまう
- **解決策**: `MarkdownViewer.tsx` で `markdown-viewer` に動的な `margin-left` を設定
  - ToCが表示されている場合: `margin-left: {tocWidth}px`
  - ToCが非表示の場合: `margin-left: 40px` （最小サイドバー幅）
- **実装方法**:
  - `TableOfContents.tsx` から `tocState` SignalをPropsで `MarkdownViewer.tsx` に渡す
  - `MarkdownViewer.tsx` で `tocState.value.visible` と `tocState.value.width` を監視
  - `.markdown-viewer` のスタイルに動的に `marginLeft` を設定
- **トランジション**: ToCのリサイズに合わせてスムーズに `margin-left` を変化させる（CSS `transition`）

## ✅ Tests

### Unit Tests (domain/toc/types.test.ts)
- [ ] TocState型が正しく定義されている

### Unit Tests (ui-components/markdown/TableOfContents/useResizable.test.ts)
- [ ] useResizable: 初期幅が正しく設定される
- [ ] useResizable: ドラッグ操作で幅が変更される
- [ ] useResizable: 最小幅・最大幅の制約が機能する
- [ ] useResizable: mouseupでドラッグが終了する

### Integration Tests (ui-components/markdown/TableOfContents/TableOfContents.test.tsx)
- [ ] 折りたたみ: 子要素がある項目にアイコンが表示される
- [ ] 折りたたみ: アイコンクリックで子要素が表示/非表示になる
- [ ] 折りたたみ: 状態が chrome.storage.sync に保存される
- [ ] Toggle: ボタンクリックでToC全体が表示/非表示になる
- [ ] Toggle: 状態が chrome.storage.sync に保存される
- [ ] Resize: ハンドルドラッグで横幅が変更される
- [ ] Resize: 幅が chrome.storage.sync に保存される

### E2E Tests (tests/e2e/toc-ux.spec.ts)
- [ ] 階層の折りたたみ: アイコンクリックで子要素が折りたたまれる
- [ ] 階層の折りたたみ: 折りたたみ状態がリロード後も保持される
- [ ] ToC表示/非表示: Toggleボタンで全体が表示/非表示になる
- [ ] ToC表示/非表示: 状態がリロード後も保持される
- [ ] 横幅調整: Resize Handleドラッグで横幅が変更される
- [ ] 横幅調整: 幅がリロード後も保持される
- [ ] スクロール追従: 長いドキュメントをスクロールしてもToCが常に見える
- [ ] デザイン: 全6テーマで統一感のあるスタイルが適用される

## 🔒 Security

- [ ] chrome.storage.sync への保存データの検証（型チェック、範囲チェック）
- [ ] XSS対策: 見出しテキストのエスケープ処理継続（既存実装を維持）
- [ ] ドラッグ操作時のイベントリスナー適切なクリーンアップ（メモリリーク防止）

## 📊 Progress

| Step | Status |
|------|--------|
| domain/toc/types.ts - TocState型定義 | ⚪ |
| ui-components/TableOfContents.tsx - 折りたたみ実装 | ⚪ |
| ui-components/TableOfContents.tsx - Toggle実装 | ⚪ |
| ui-components/useResizable.ts - Resize Hook実装 | ⚪ |
| ui-components/TableOfContents.tsx - Resize統合 | ⚪ |
| ui-components/toc.css - アニメーション・デザイン刷新 | ⚪ |
| content/components/MarkdownViewer.tsx - レイアウト可変対応 | ⚪ |
| content/styles/themes/*.css - テーマ調整 | ⚪ |
| Tests (Unit) | ⚪ |
| Tests (E2E) | ⚪ |
| Commit | ⚪ |

**Legend:** ⚪ Pending · 🟡 In Progress · 🟢 Done

---

## 📋 Implementation Details

### 1. domain/toc/types.ts - TocState型追加

```typescript
/**
 * ToC UI状態の型定義
 */
export interface TocState {
  /** ToC全体の表示/非表示 */
  visible: boolean;
  /** ToC横幅（px） */
  width: number;
  /** 折りたたまれた項目のIDリスト */
  collapsedItems: string[];
}

/**
 * TocStateのデフォルト値
 */
export const DEFAULT_TOC_STATE: TocState = {
  visible: true,
  width: 250,
  collapsedItems: [],
};
```

### 2. ui-components/markdown/TableOfContents/useResizable.ts

```typescript
import { useState, useEffect, useCallback } from 'preact/hooks';

interface UseResizableOptions {
  initialWidth: number;
  minWidth: number;
  maxWidth: number;
  onWidthChange?: (width: number) => void;
}

export const useResizable = ({
  initialWidth,
  minWidth,
  maxWidth,
  onWidthChange,
}: UseResizableOptions) => {
  const [width, setWidth] = useState(initialWidth);
  const [isResizing, setIsResizing] = useState(false);

  const startResize = useCallback(() => {
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = Math.min(Math.max(e.clientX, minWidth), maxWidth);
      setWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      onWidthChange?.(width);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, minWidth, maxWidth, width, onWidthChange]);

  return { width, isResizing, startResize };
};
```

### 3. ui-components/markdown/TableOfContents/TableOfContents.tsx - 改修

```typescript
import { h } from 'preact';
import { useState, useEffect, useCallback } from 'preact/hooks';
import { signal } from '@preact/signals';
import type { TocItem } from '../../../domain/toc/types.ts';
import type { TocState } from '../../../domain/toc/types.ts';
import { DEFAULT_TOC_STATE } from '../../../domain/toc/types.ts';
import { useResizable } from './useResizable.ts';

// Chrome API型定義
declare const chrome: {
  storage: {
    sync: {
      get: (keys: string[]) => Promise<Record<string, unknown>>;
      set: (items: Record<string, unknown>) => Promise<void>;
    };
  };
};

interface Props {
  items: TocItem[];
  themeId: string;
}

// ToC状態をSignalで管理
const tocState = signal<TocState>(DEFAULT_TOC_STATE);
const collapsedItems = signal<Set<string>>(new Set());

export const TableOfContents = ({ items, themeId }: Props) => {
  const [activeId, setActiveId] = useState<string>('');

  // 永続化された状態を読み込み
  useEffect(() => {
    chrome.storage.sync.get(['tocState']).then((result) => {
      if (result.tocState) {
        const state = result.tocState as TocState;
        tocState.value = state;
        collapsedItems.value = new Set(state.collapsedItems);
      }
    });
  }, []);

  // Resize Hook
  const { width, isResizing, startResize } = useResizable({
    initialWidth: tocState.value.width,
    minWidth: 150,
    maxWidth: 500,
    onWidthChange: (newWidth) => {
      tocState.value = { ...tocState.value, width: newWidth };
      chrome.storage.sync.set({ tocState: tocState.value });
    },
  });

  // Toggle ToC visibility
  const toggleVisibility = useCallback(() => {
    tocState.value = { ...tocState.value, visible: !tocState.value.visible };
    chrome.storage.sync.set({ tocState: tocState.value });
  }, []);

  // Toggle item collapse
  const toggleCollapse = useCallback((id: string) => {
    const newSet = new Set(collapsedItems.value);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    collapsedItems.value = newSet;
    tocState.value = { ...tocState.value, collapsedItems: Array.from(newSet) };
    chrome.storage.sync.set({ tocState: tocState.value });
  }, []);

  // IntersectionObserver (既存ロジック)
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
      { rootMargin: '-10% 0px -80% 0px' }
    );
    const headings = document.querySelectorAll('h1, h2, h3');
    headings.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  }, [items]);

  const handleClick = (id: string) => {
    const element = document.getElementById(id);
    element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (items.length === 0) return null;

  // Render item recursively
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
            {item.children.map(renderItem)}
          </ul>
        )}
      </li>
    );
  };

  return (
    <aside
      class={`toc-container ${tocState.value.visible ? 'visible' : 'hidden'} toc-theme-${themeId}`}
      style={{ width: tocState.value.visible ? `${width}px` : '40px' }}
    >
      {tocState.value.visible ? (
        <>
          <div class="toc-header">
            <h2 class="toc-title">Table of Contents</h2>
            <button class="toc-toggle-btn" onClick={toggleVisibility} aria-label="Hide ToC">
              ×
            </button>
          </div>
          <nav class="toc" aria-label="Table of Contents">
            <ul class="toc-list">{items.map(renderItem)}</ul>
          </nav>
          <div
            class={`toc-resize-handle ${isResizing ? 'resizing' : ''}`}
            onMouseDown={startResize}
          />
        </>
      ) : (
        <button class="toc-show-btn" onClick={toggleVisibility} aria-label="Show ToC">
          ☰
        </button>
      )}
    </aside>
  );
};
```

### 4. ui-components/markdown/TableOfContents/toc.css - デザイン刷新

```css
/* ToC Container */
.toc-container {
  position: fixed;
  top: 0;
  left: 0;
  height: 100vh;
  background: var(--toc-bg, #f9fafb);
  border-right: 1px solid var(--toc-border, #e5e7eb);
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.05);
  transition: width 0.3s ease;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: 1000;
}

.toc-container.hidden {
  width: 40px !important;
}

/* ToC Header */
.toc-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--toc-border, #e5e7eb);
}

.toc-title {
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
  color: var(--toc-text, #111827);
}

.toc-toggle-btn,
.toc-show-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0.25rem;
  color: var(--toc-icon, #6b7280);
  transition: color 0.2s ease;
}

.toc-toggle-btn:hover,
.toc-show-btn:hover {
  color: var(--toc-icon-hover, #111827);
}

.toc-show-btn {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ToC Navigation */
.toc {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
}

/* Scrollbar */
.toc::-webkit-scrollbar {
  width: 6px;
}

.toc::-webkit-scrollbar-track {
  background: transparent;
}

.toc::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 3px;
}

.toc::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.3);
}

/* ToC List */
.toc-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.toc-item {
  margin: 0.5rem 0;
}

.toc-item-wrapper {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.toc-collapse-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.75rem;
  padding: 0.25rem;
  color: var(--toc-icon, #6b7280);
  transition: transform 0.2s ease;
  flex-shrink: 0;
}

.toc-collapse-btn:hover {
  color: var(--toc-icon-hover, #111827);
}

/* ToC Link */
.toc-link {
  display: block;
  padding: 0.4rem 0.75rem;
  border-radius: 6px;
  transition: all 0.2s ease;
  text-decoration: none;
  color: var(--toc-link, #374151);
  border-left: 3px solid transparent;
  word-wrap: break-word;
  overflow-wrap: break-word;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
  flex: 1;
}

.toc-link:hover {
  background: var(--toc-link-hover-bg, rgba(0, 0, 0, 0.05));
  color: var(--toc-link-hover, #111827);
}

.toc-link.active {
  font-weight: 600;
  color: var(--toc-link-active, #2563eb);
  border-left-color: var(--toc-link-active, #2563eb);
  background: var(--toc-link-active-bg, rgba(37, 99, 235, 0.1));
}

/* Level Indentation */
.toc-level-1 {
  padding-left: 0;
}

.toc-level-2 {
  padding-left: 1rem;
}

.toc-level-3 {
  padding-left: 2rem;
}

/* Sublist Animation */
.toc-sublist {
  list-style: none;
  padding: 0;
  margin: 0.5rem 0 0 0;
  overflow: hidden;
  max-height: 1000px;
  transition: max-height 0.3s ease;
}

/* Resize Handle */
.toc-resize-handle {
  position: absolute;
  top: 0;
  right: 0;
  width: 4px;
  height: 100%;
  background: transparent;
  cursor: col-resize;
  transition: background 0.2s ease;
}

.toc-resize-handle:hover,
.toc-resize-handle.resizing {
  background: var(--toc-resize-handle, #3b82f6);
}

/* Theme Variables (example for light theme) */
.toc-theme-light {
  --toc-bg: #f9fafb;
  --toc-border: #e5e7eb;
  --toc-text: #111827;
  --toc-link: #374151;
  --toc-link-hover: #111827;
  --toc-link-hover-bg: rgba(0, 0, 0, 0.05);
  --toc-link-active: #2563eb;
  --toc-link-active-bg: rgba(37, 99, 235, 0.1);
  --toc-icon: #6b7280;
  --toc-icon-hover: #111827;
  --toc-resize-handle: #3b82f6;
}

/* Add similar theme variables for dark, github, minimal, solarized_light, solarized_dark */
```

---

## 🎯 Implementation Strategy

### Phase 1: State Management (domain/toc)
1. `domain/toc/types.ts` - TocState型定義

### Phase 2: Resize Hook (ui-components)
2. `ui-components/markdown/TableOfContents/useResizable.ts` - Resize Hook実装・テスト

### Phase 3: TableOfContents改修 (ui-components)
3. 折りたたみロジック実装
4. Toggle Button実装
5. Resize Handle統合
6. 永続化ロジック（chrome.storage.sync）

### Phase 4: Styling & Design (CSS)
7. `ui-components/markdown/TableOfContents/toc.css` - アニメーション・デザイン刷新
8. `content/styles/themes/*.css` - 各テーマの配色調整

### Phase 5: Testing
9. Unit Tests - useResizable, 折りたたみロジック
10. E2E Tests - ユーザー操作の検証

### Phase 6: Commit
11. `smart-commit` でコミット

---

**Next:** Write tests → Implement → Commit with `smart-commit` 🚀
