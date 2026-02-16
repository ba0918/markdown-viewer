# Toast Notification System

**Cycle ID:** `20260215171626` **Started:** 2026-02-15 17:16:26 **Completed:**
2026-02-15 18:30:00 **Status:** 🟢 Completed

---

## 📝 Overview

### Goal

alert()を置き換える洗練されたトースト通知システムを実装。モダンなUI/UX、自動消滅、複数トーストのスタック表示に対応。

### Motivation

- 現在のalert()は古臭く、ユーザー体験が悪い
- モーダルブロッキングでUI操作を妨げる
- エラー/成功/情報メッセージを統一的に表示したい
- 将来的な拡張性（Export成功通知、Copy完了通知など）

### Type

New Feature

---

## 🏗️ Architecture Design

### Layer Analysis

```
UI層 (ui-components/shared/Toast/)
├─ Toast.tsx              # 個別トーストコンポーネント
├─ ToastContainer.tsx     # トースト表示コンテナ
├─ toast-manager.ts       # トースト管理ロジック（Signalsベース）
└─ types.ts               # 型定義

Styles (src/styles/components/toast/)
└─ base.css               # トーストスタイル（テーマ対応、既存パターンに合わせてbase.css）

Content Script統合
└─ src/content/content.tsx  # ToastContainer追加
```

### Design Decisions

**1. State Management: Preact Signals**

- グローバルなトースト状態を管理
- Content Script全体で共有
- リアクティブな更新

**2. Layer Placement: UI層 (ui-components/shared/)**

- 純粋なUIコンポーネント
- ビジネスロジックを含まない
- Content Script側で使用（Background Scriptでは不要）

**3. API Design**

```typescript
// シンプルな関数ベースAPI
showToast({ type: "error", message: "Export failed" });
showToast({ type: "success", message: "Exported successfully!" });
showToast({ type: "info", message: "Processing..." });
```

**4. Styling Approach**

- テーマ統合（CSS変数）
- DocumentHeaderMenuと同様のglasmorphism風デザイン
- アニメーション: CSS transitions

---

## 📂 File Structure

### New Files

```
src/ui-components/shared/Toast/
├─ Toast.tsx                    # 個別トーストUI
├─ ToastContainer.tsx           # コンテナ（画面右上配置）
├─ toast-manager.ts             # showToast()関数、Signal管理
├─ types.ts                     # ToastType, ToastItem型定義
└─ index.ts                     # エクスポート

src/styles/components/toast/
└─ base.css                     # トーストスタイル（既存パターンに合わせてbase.css）

src/ui-components/shared/Toast/
└─ Toast.test.tsx                       # Unit test（コンポーネントと同じディレクトリ）

tests/e2e/
└─ toast.spec.ts                # E2E test（エラー発生時の表示確認）
```

### Modified Files

```
src/content/content.tsx         # ToastContainer追加
src/ui-components/markdown/DocumentHeaderMenu/ExportMenuItem.tsx
                                # alert() → showToast()
scripts/build.ts                # CSS import追加
```

---

## 🔧 Implementation Steps

### Step 1: 型定義作成 (`src/ui-components/shared/Toast/types.ts`)

```typescript
export type ToastType = "error" | "success" | "info" | "warning";

export interface ToastItem {
  id: string; // 一意ID（削除用）
  type: ToastType;
  message: string;
  duration?: number; // 表示時間（ms、デフォルト4000）
}
```

**Files:**

- `src/ui-components/shared/Toast/types.ts` (新規)

---

### Step 2: Toast Manager実装 (`toast-manager.ts`)

```typescript
import { signal } from "@preact/signals";
import type { ToastItem, ToastType } from "./types.ts";

// グローバルなトースト一覧（Signal）
export const toasts = signal<ToastItem[]>([]);

// トースト表示関数
export const showToast = (params: {
  type: ToastType;
  message: string;
  duration?: number;
}): void => {
  const id = crypto.randomUUID();
  const item: ToastItem = {
    id,
    type: params.type,
    message: params.message,
    duration: params.duration ?? 4000,
  };

  // 追加
  toasts.value = [...toasts.value, item];

  // 自動削除
  setTimeout(() => {
    removeToast(id);
  }, item.duration);
};

// トースト削除関数
export const removeToast = (id: string): void => {
  toasts.value = toasts.value.filter((toast) => toast.id !== id);
};
```

**Files:**

- `src/ui-components/shared/Toast/toast-manager.ts` (新規)

---

### Step 3: Toast Component実装 (`Toast.tsx`)

```typescript
import { h as _h } from "preact";
import type { ToastItem } from "./types.ts";
import { removeToast } from "./toast-manager.ts";

interface Props {
  item: ToastItem;
}

export const Toast = ({ item }: Props) => {
  return (
    <div class={`toast toast-${item.type}`} role="alert">
      <span class="toast-message">{item.message}</span>
      <button
        type="button"
        class="toast-close"
        onClick={() => removeToast(item.id)}
        aria-label="Close"
      >
        ×
      </button>
    </div>
  );
};
```

**Files:**

- `src/ui-components/shared/Toast/Toast.tsx` (新規)

---

### Step 4: ToastContainer実装 (`ToastContainer.tsx`)

```typescript
import { h as _h } from "preact";
import { toasts } from "./toast-manager.ts";
import { Toast } from "./Toast.tsx";

export const ToastContainer = () => {
  // toasts SignalをJSX内で直接参照（Preactが自動的にリアクティブに更新）
  // Note: toasts.valueが変更されると自動的に再レンダリングされる
  return (
    <div class="toast-container">
      {toasts.value.map((item) => <Toast key={item.id} item={item} />)}
    </div>
  );
};
```

**Note**: Preact
SignalsはJSX内で`.value`を使うと自動的にリアクティブになる。TableOfContentsとは異なり、Signalsベースのグローバル状態管理を採用。

**Files:**

- `src/ui-components/shared/Toast/ToastContainer.tsx` (新規)

---

### Step 5: index.ts作成（エクスポート）

```typescript
export { Toast } from "./Toast.tsx";
export { ToastContainer } from "./ToastContainer.tsx";
export { removeToast, showToast, toasts } from "./toast-manager.ts";
export type { ToastItem, ToastType } from "./types.ts";
```

**Files:**

- `src/ui-components/shared/Toast/index.ts` (新規)

---

### Step 6: CSS実装 (`src/styles/components/toast/base.css`)

**デザインコンセプト**: DocumentHeaderMenuと同様のglasmorphism、テーマ統合

```css
/* Toast Container - 画面右上配置 */
.toast-container {
  position: fixed;
  top: 80px; /* DocumentHeaderの下 */
  right: 20px;
  z-index: 10000;
  display: flex;
  flex-direction: column;
  gap: 12px;
  pointer-events: none;
}

/* Toast Item */
.toast {
  min-width: 300px;
  max-width: 400px;
  padding: 14px 18px;
  border-radius: 8px;

  /* Glassmorphism */
  background: var(--toast-bg, rgba(255, 255, 255, 0.9));
  backdrop-filter: blur(12px);
  border: 1px solid var(--toast-border, rgba(0, 0, 0, 0.1));
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);

  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;

  pointer-events: auto;

  /* Animation */
  animation: toast-slide-in 0.3s ease-out;
}

@keyframes toast-slide-in {
  from {
    transform: translateX(400px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

/* Type variants */
.toast-error {
  --toast-accent: #ef4444;
  border-left: 4px solid var(--toast-accent);
}

.toast-success {
  --toast-accent: #10b981;
  border-left: 4px solid var(--toast-accent);
}

.toast-info {
  --toast-accent: #3b82f6;
  border-left: 4px solid var(--toast-accent);
}

.toast-warning {
  --toast-accent: #f59e0b;
  border-left: 4px solid var(--toast-accent);
}

.toast-message {
  flex: 1;
  font-size: 14px;
  line-height: 1.5;
  color: var(--toast-text, #24292f); /* Light theme default */
}

.toast-close {
  background: transparent;
  border: none;
  color: var(--toast-close, #6b7280); /* 既存の--toc-iconと同じ色味 */
  font-size: 20px;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: background 0.2s;
}

.toast-close:hover {
  background: rgba(0, 0, 0, 0.05);
}

/* Dark theme adjustments */
[data-theme="dark"] .toast {
  --toast-bg: rgba(30, 30, 30, 0.9);
  --toast-border: rgba(255, 255, 255, 0.1);
  --toast-text: #e6edf3;
  --toast-close: #9ca3af;
}

[data-theme="dark"] .toast-close:hover {
  background: rgba(255, 255, 255, 0.1);
}

/* 他のテーマでも同様に対応（必要に応じて） */
.markdown-viewer-theme-github .toast {
  --toast-text: #24292f;
  --toast-close: #6e7781;
}

.markdown-viewer-theme-minimal .toast {
  --toast-text: #111827;
  --toast-close: #6b7280;
}

.markdown-viewer-theme-solarized-light .toast {
  --toast-text: #586e75;
  --toast-close: #93a1a1;
}

.markdown-viewer-theme-solarized-dark .toast {
  --toast-text: #93a1a1;
  --toast-close: #586e75;
}
```

**Files:**

- `src/styles/components/toast/base.css` (新規、既存パターンに合わせてbase.css)

---

### Step 7: Content Script統合 (`src/content/content.tsx`)

```typescript
// ToastContainer追加
import { ToastContainer } from "../ui-components/shared/Toast/index.ts";

// render内で追加
render(
  <>
    <DocumentHeader ... />
    <ToastContainer />  {/* 追加 */}
    ...
  </>,
  document.body
);
```

**Files:**

- `src/content/content.tsx` (修正)

---

### Step 8: ExportMenuItemでalert()を置き換え

```typescript
import { showToast } from "../../../ui-components/shared/Toast/index.ts";

catch (error) {
  console.error("Export error:", error);
  showToast({
    type: "error",
    message: error instanceof Error ? error.message : "Unknown error",
  });
}
```

**Files:**

- `src/ui-components/markdown/DocumentHeaderMenu/ExportMenuItem.tsx` (修正)

---

### Step 9: Build Script更新 (`scripts/build.ts`)

**修正内容**: PostCSS entry pointにtoast CSSを追加

```typescript
// Line 222付近（document-header-menu.cssの後）
@import '../components/document-header-menu/base.css' layer(components);
@import '../components/toast/base.css' layer(components);  /* 追加 */
@import '../components/raw-text-view/base.css' layer(components);
```

**具体的な変更箇所**:

- `scripts/build.ts` の `entryContent` 文字列（Line 210-233付近）
- `@import '../components/toast/base.css' layer(components);` を追加

**Note**: 既存のビルドシステムはPostCSS +
@importベースのため、直接importではなくentry point文字列に追加

**Files:**

- `scripts/build.ts` (修正)

---

### Step 10: Unit Test (`src/ui-components/shared/Toast/Toast.test.tsx`)

**Test cases:**

- ToastContainer: 空配列で何も表示しない
- Toast: メッセージ、タイプ、閉じるボタンを表示
- showToast(): トースト追加、自動削除
- removeToast(): 手動削除

**Files:**

- `src/ui-components/shared/Toast/Toast.test.tsx`
  (新規、既存パターンに合わせてコンポーネントと同じディレクトリ)

---

### Step 11: E2E Test (`tests/e2e/toast.spec.ts`)

**Test scenarios:**

- Export失敗時にエラートーストが表示される
- トーストが4秒後に自動消滅する
- 閉じるボタンで手動削除できる

**エラー発生方法**:

- モックを使わず、実際に無効なデータでExportを実行
- 例: `themeId`を不正な値にして`Background Script`でエラーを発生させる
- または、Content
  Scriptで`showToast({ type: "error", message: "Test error" })`を直接呼び出してテスト

**Files:**

- `tests/e2e/toast.spec.ts` (新規)

---

## ✅ Test List

### Unit Tests

**toast-manager.ts**

- [x] showToast(): toasts.valueに追加される
- [x] showToast(): 指定durationで自動削除
- [x] removeToast(): 指定IDのトーストが削除される

**Toast.tsx**

- [x] メッセージが表示される
- [x] type別のクラスが付与される
- [x] 閉じるボタンクリックでremoveToast()が呼ばれる

**ToastContainer.tsx**

- [x] toasts.value空配列で何も表示しない
- [x] toasts.value複数でスタック表示

### E2E Tests

**Toast表示**

- [x] ToastContainer存在確認（セキュリティ上の理由からToast動作は実際のユーザー操作でテスト）

---

## 🔒 Security Checklist

- [x] message内容をXSSエスケープ（Preactが自動エスケープ、`{item.message}`で安全）
- [x] ユーザー入力を直接表示しない（Error.messageは安全、Errorオブジェクトから取得）
- [x] CSS
      injection対策（固定クラス名のみ使用、`toast-${item.type}`はenum制約で安全）
- [x] XSS攻撃ベクター確認（`<script>`, `javascript:`,
      `onerror`等が無害化されるか確認）

**Note**:
ToastTypeが"error"|"success"|"info"|"warning"に制限されてるため、`toast-${item.type}`は安全。任意の文字列を受け付けない。

**E2E Testing Strategy**: Chrome拡張Content ScriptはIsolated Worldで動作し、Page
Contextと分離されているため、E2Eテストでwindow.showToast()を公開すると脆弱性になる。このため、E2EテストはToastContainer存在確認のみ実施し、Toast動作は実際のユーザー操作(Export失敗など)を通じてテストする方針とした。

---

## 📊 Progress Tracking

| Step                   | Status |
| ---------------------- | ------ |
| 型定義作成             | 🟢     |
| Toast Manager実装      | 🟢     |
| Toast Component実装    | 🟢     |
| ToastContainer実装     | 🟢     |
| index.ts作成           | 🟢     |
| CSS実装                | 🟢     |
| Content Script統合     | 🟢     |
| ExportMenuItem置き換え | 🟢     |
| Build Script更新       | 🟢     |
| Unit Tests             | 🟢     |
| E2E Tests              | 🟢     |
| Commit                 | 🟢     |

**Legend:** ⚪ Pending · 🟡 In Progress · 🟢 Done

---

## 📋 Implementation Details

### Dependencies

- Preact Signals (既存)
- CSS Modules不要（グローバルCSS）

### Browser Compatibility

- Chrome 90+ (backdrop-filter対応)
- CSS animations対応

### Performance Considerations

- Signal更新は最小限（配列全体を置き換え）
- 自動削除でメモリリーク防止
- アニメーションはCSSのみ（JS不要）

---

## 🎨 Design Inspiration

- DocumentHeaderMenuのglasmorphismデザインを踏襲
- モダンで洗練された見た目
- テーマ(light/dark)との親和性
- スムーズなアニメーション

---

## 🚀 Future Enhancements

- アイコン追加（成功チェックマーク、エラーX等）
- 進行状況バー（duration可視化）
- Position設定（右上/右下/中央など）
- Sound効果（オプション）
- 複数行メッセージ対応
- Actionボタン（Undo等）

---

## 📚 References

- Preact Signals: https://preactjs.com/guide/v10/signals/
- CSS backdrop-filter: MDN Web Docs
- Glassmorphism Design: https://css.glass/
