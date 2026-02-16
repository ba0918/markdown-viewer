# Code Review - Comprehensive Improvements

**Cycle ID:** `20260216170708` **Started:** 2026-02-16 17:07:08 **Status:** 🟡
Planning

---

## What & Why

コードレビューで検出された全問題（メモリリーク4件、パフォーマンス/論理問題6件、デッドコード2件、重複コード5件）を体系的に修正し、コードベースの品質を向上させる。

## Goals

- メモリリーク問題を全て解消（CRITICAL 4件）
- パフォーマンスと論理的問題を修正（IMPORTANT 6件）
- デッドコードを削除し、重複コードを共通化（10件）
- 全テスト（Unit + E2E）がグリーンであること

---

## Phase 1: CRITICAL - Memory Leaks (4件)

### 1.1 setupRelativeLinkHandler()のリスナー蓄積

**ファイル:** `src/content/index.ts:252, 333`

**問題:**

```typescript
// renderMarkdown()が呼ばれるたびにリスナーが追加され続ける
setupRelativeLinkHandler(); // 333行目で毎回呼ばれる
```

**修正方針:**

- 初回のみ呼び出すフラグ制御を追加
- または AbortController でクリーンアップ可能にする

**修正:**

```typescript
let relativeLinkHandlerSetup = false;

const setupRelativeLinkHandler = () => {
  if (relativeLinkHandlerSetup) return;
  relativeLinkHandlerSetup = true;
  document.addEventListener("click", handleRelativeLink);
};
```

### 1.2 chrome.storage.onChanged.addListener()の解除漏れ

**ファイル:** `src/content/index.ts:402`

**修正方針:**

- 重複登録防止フラグを追加

**修正:**

```typescript
let storageListenerSetup = false;

const setupStorageListener = () => {
  if (storageListenerSetup) return;
  storageListenerSetup = true;
  chrome.storage.onChanged.addListener(handleStorageChange);
};
```

### 1.3 showToast()のsetTimeoutクリア漏れ

**ファイル:** `src/ui-components/shared/Toast/toast-manager.ts:25`

**修正方針:**

- タイマーIDをMapで管理し、トーストが削除される際にキャンセル

**修正:**

```typescript
const toastTimers = new Map<string, number>();

export const showToast = (
  message: string,
  type: ToastType = "info",
  duration = 4000,
) => {
  const id = generateId();
  const toast: Toast = { id, message, type };

  toasts.value = [...toasts.value, toast];

  const timerId = globalThis.setTimeout(() => {
    removeToast(id);
    toastTimers.delete(id);
  }, duration);

  toastTimers.set(id, timerId);

  return id;
};

export const removeToast = (id: string) => {
  const timerId = toastTimers.get(id);
  if (timerId) {
    globalThis.clearTimeout(timerId);
    toastTimers.delete(id);
  }
  toasts.value = toasts.value.filter((t) => t.id !== id);
};
```

### 1.4 CopyButtonのsetTimeoutクリア漏れ

**ファイル:** `src/ui-components/shared/CopyButton.tsx:37`

**修正方針:**

- useRef でタイマーIDを保持し、useEffect クリーンアップで clearTimeout

**修正:**

```typescript
import { useRef, useEffect } from "preact/hooks";

export const CopyButton = ({ ... }) => {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => setCopied(false), 2000);
  };

  // ...
};
```

---

## Phase 2: IMPORTANT - Performance & Logic Issues (6件)

### 2.1 Mermaidの逐次処理

**ファイル:** `src/content/components/MarkdownViewer.tsx:203`

**問題:** for-await-ofでMermaidブロックを直列処理

**修正方針:** Promise.all()で並列化

**修正:**

```typescript
// 並列でレンダリング
await Promise.all(
  mermaidBlocks.map(async (block) => {
    await renderMermaid(block, block.textContent || "");
  }),
);
```

### 2.2 viewMode切替でMermaid再レンダリング

**ファイル:** `src/content/components/MarkdownViewer.tsx:110`

**問題:** useEffect依存配列にviewModeが含まれ、切替ごとにMermaidが再実行される

**修正方針:** viewMode === "raw" の場合は早期リターン

**修正:**

```typescript
useEffect(() => {
  if (viewMode === "raw") return; // rawモードではMermaid不要

  (async () => {
    // Mermaidレンダリング処理
  })();
}, [result.html, themeId.value, viewMode]);
```

### 2.3 options/App.tsxのsetTimeoutクリア漏れ

**ファイル:** `src/settings/options/App.tsx:56, 92`

**修正方針:** useRef + useEffect クリーンアップ

### 2.4 onDeterminingFilenameリスナーの解除不備

**ファイル:** `src/messaging/handlers/background-handler.ts:187`

**問題:** download()失敗時にリスナーが残る可能性

**修正方針:** try-finally で確実にリスナー削除、またはタイムアウト付き削除

### 2.5 settings!の非null断言

**ファイル:**

- `src/settings/options/App.tsx:54`
- `src/settings/popup/App.tsx:50`

**修正方針:** 明示的な null チェックを追加

**修正:**

```typescript
const handleThemeChange = async (newThemeId: ThemeId) => {
  if (!settings) return; // ガード追加
  await saveSettings({ ...settings, themeId: newThemeId });
  // ...
};
```

### 2.6 アンマウント後のDOM操作

**ファイル:** `src/content/components/MarkdownViewer.tsx:170`

**修正方針:** アンマウントフラグを追加してDOM操作をスキップ

**修正:**

```typescript
useEffect(() => {
  let isMounted = true;

  (async () => {
    // 非同期処理
    if (!isMounted) return; // アンマウント後はスキップ
    // DOM操作
  })();

  return () => {
    isMounted = false;
  };
}, [dependencies]);
```

---

## Phase 3: Dead Code Removal (2件)

### 3.1 空ファイル削除

**ファイル:** `src/domain/file-watcher/file-watcher.ts`

**対応:** ファイル削除

### 3.2 未使用型削除

**ファイル:** `src/domain/frontmatter/types.ts:33-41`

**対応:** `CommonFrontmatterData` 型を削除

---

## Phase 4: Code Deduplication (5件)

### 4.1 ThemeSelectorの共通化

**重複ファイル:**

- `src/settings/popup/components/ThemeSelector.tsx`
- `src/settings/options/components/ThemeSelector.tsx`

**修正方針:**

- テーマリスト定義を `src/shared/constants/themes.ts` に統合
- 各コンポーネントはUI差分のみ保持

**新規作成:**

```typescript
// src/shared/constants/themes.ts に追加
export const THEME_OPTIONS = [
  {
    id: "light",
    label: "Light",
    shortLabel: "Light",
    emoji: "☀️",
    description: "Simple light theme",
  },
  {
    id: "dark",
    label: "Dark",
    shortLabel: "Dark",
    emoji: "🌙",
    description: "Simple dark theme",
  },
  {
    id: "github",
    label: "GitHub",
    shortLabel: "GitHub",
    emoji: "🐙",
    description: "GitHub style",
  },
  {
    id: "minimal",
    label: "Minimal",
    shortLabel: "Min",
    emoji: "📄",
    description: "Clean minimal",
  },
  {
    id: "solarized_light",
    label: "Solarized Light",
    shortLabel: "Sol. L",
    emoji: "🌅",
    description: "Solarized light",
  },
  {
    id: "solarized_dark",
    label: "Solarized Dark",
    shortLabel: "Sol. D",
    emoji: "🌃",
    description: "Solarized dark",
  },
] as const;
```

### 4.2 index.tsxの共通化

**重複ファイル:**

- `src/settings/popup/index.tsx`
- `src/settings/options/index.tsx`

**修正方針:** `src/shared/utils/render-app.ts` に共通関数作成

**新規作成:**

```typescript
// src/shared/utils/render-app.ts
import { render } from "preact";
import type { ComponentType } from "preact";

export const renderApp = (App: ComponentType): void => {
  const root = document.getElementById("app");
  if (root) {
    render(<App />, root);
  } else {
    console.error("Failed to find #app element");
  }
};
```

### 4.3 重複ID生成ロジックの共通化

**重複ファイル:**

- `src/domain/toc/extractor.ts:66-76`
- `src/domain/toc/html-processor.ts:52-60`

**修正方針:** `src/shared/utils/unique-id.ts` に共通関数作成

**新規作成:**

```typescript
// src/shared/utils/unique-id.ts
export const makeUniqueId = (
  baseId: string,
  idCounts: Map<string, number>,
): string => {
  const count = idCounts.get(baseId) || 0;
  idCounts.set(baseId, count + 1);
  return count === 0 ? baseId : `${baseId}-${count}`;
};
```

### 4.4 Base64エンコードロジックの共通化

**重複ファイル:**

- `src/background/service-worker.ts:54-58`
- `src/settings/options/components/RemoteUrlSettings.tsx:120-127`

**修正方針:** `src/shared/utils/encode.ts` に共通関数作成

**新規作成:**

```typescript
// src/shared/utils/encode.ts
export const toUrlSafeBase64 = (str: string): string => {
  return btoa(str).replace(
    /[+/=]/g,
    (c) => ({ "+": "-", "/": "_", "=": "" }[c] || c),
  );
};

export const getContentScriptId = (origin: string): string => {
  return `custom-origin-${toUrlSafeBase64(origin)}`;
};
```

### 4.5 テーマ定義の一元化

**重複ファイル:**

- `src/domain/theme/loader.ts` (THEMES)
- `src/shared/constants/themes.ts` (VALID_THEMES)

**修正方針:** `shared/constants/themes.ts` を Single Source of Truth に

---

## Tests

### Phase 1: Memory Leaks

- [ ] setupRelativeLinkHandler()が複数回呼ばれてもリスナーは1つ
- [ ] chrome.storage.onChanged.addListener()が重複登録されない
- [ ] showToast()のタイマーがremoveToast時にクリアされる
- [ ] CopyButtonアンマウント時にタイマーがクリアされる

### Phase 2: Performance & Logic

- [ ] Mermaidが並列レンダリングされる（パフォーマンス改善）
- [ ] rawモードでMermaidレンダリングがスキップされる
- [ ] options/App.tsxのタイマーがクリーンアップされる
- [ ] settings === null のときハンドラーが早期リターン

### Phase 3 & 4: Cleanup

- [ ] file-watcher.ts削除後もビルド成功
- [ ] 共通化後のThemeSelectorが正常動作
- [ ] 共通化後のrenderApp()が正常動作

---

## Progress

| Phase   | Description               | Status |
| ------- | ------------------------- | ------ |
| Phase 1 | Memory Leaks (4件)        | ⚪     |
| Phase 2 | Performance & Logic (6件) | ⚪     |
| Phase 3 | Dead Code (2件)           | ⚪     |
| Phase 4 | Deduplication (5件)       | ⚪     |
| Tests   | Unit + E2E                | ⚪     |
| Commit  | smart-commit              | ⚪     |

**Legend:** ⚪ Pending · 🟡 In Progress · 🟢 Done

---

## Estimated Effort

| Phase                | Estimated Time |
| -------------------- | -------------- |
| Phase 1              | 30 min         |
| Phase 2              | 30 min         |
| Phase 3              | 5 min          |
| Phase 4              | 45 min         |
| Tests & Verification | 15 min         |
| **Total**            | **~2 hours**   |

---

**Next:** Phase 1から順番に実装 → テスト → smart-commit
