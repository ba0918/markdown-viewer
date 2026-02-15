# コード正確性レビューレポート

**日付**: 2026-02-15 **対象**: Markdown Viewer Chrome拡張（ストア公開前）
**レビュアー**: Claude Sonnet 4.5（Correctness Reviewer Agent）

---

## 📊 レビュー概要

```json
{
  "confidence": 75,
  "severity_summary": {
    "critical": 2,
    "important": 5,
    "optional": 3
  },
  "overall_status": "WARN"
}
```

**結論**:
本番公開前に**CRITICAL**レベルの問題2件の修正を強く推奨します。IMPORTANT問題も可能な限り対処してください。

---

## 🔴 CRITICAL Issues（修正必須）

### 1. `sendMessage()` レスポンスの型安全性不足

**ファイル**: `src/messaging/client.ts` **行**: 14-22

**問題**:

```typescript
export const sendMessage = async <T = unknown>(
  message: Message,
): Promise<T> => {
  const response: MessageResponse<T> = await chrome.runtime.sendMessage(
    message,
  );

  if (!response.success) {
    throw new Error(response.error);
  }

  return response.data;
};
```

`chrome.runtime.sendMessage()` は以下のケースで `undefined`
を返す可能性があります:

1. **Background Scriptが起動していない**（拡張リロード直後など）
2. **メッセージリスナーが登録されていない**
3. **レシーバーが応答前にクラッシュ**

`response` が `undefined` の場合、`response.success` へのアクセスで
**実行時エラー** が発生します。

**影響**:

- Content Scriptの初期化失敗 → ページが真っ白
- Hot Reload機能の完全停止
- Settings画面の読み込みエラー

**修正案**:

```typescript
export const sendMessage = async <T = unknown>(
  message: Message,
): Promise<T> => {
  const response: MessageResponse<T> | undefined = await chrome.runtime
    .sendMessage(
      message,
    );

  // undefinedチェック（Background Script未起動等）
  if (!response) {
    throw new Error(
      "No response from background script. The extension may be reloading.",
    );
  }

  if (!response.success) {
    throw new Error(response.error);
  }

  return response.data;
};
```

**テストケース追加推奨**:

```typescript
Deno.test("sendMessage: Background Script未起動時のエラーハンドリング", async () => {
  // chrome.runtime.sendMessage を undefined を返すようにモック
  globalThis.chrome = {
    runtime: {
      sendMessage: () => Promise.resolve(undefined),
    },
  };

  await assertRejects(
    () => sendMessage({ type: "GET_SETTINGS", payload: {} }),
    Error,
    "No response from background script",
  );
});
```

---

### 2. `content/index.ts` Hot Reload機能のレースコンディション

**ファイル**: `src/content/index.ts` **行**: 194-223

**問題**:

```typescript
// Race Condition対策用フラグ
let isChecking = false;

hotReloadInterval = globalThis.setInterval(async () => {
  if (isChecking) return; // 前回のチェックが完了していなければスキップ

  isChecking = true;
  try {
    const currentContent = await sendMessage<string>({
      type: "CHECK_FILE_CHANGE",
      payload: { url: location.href },
    });

    const changed = currentContent !== lastFileContent;

    if (changed) {
      if (DEBUG) {
        console.log("Markdown Viewer: File changed detected! Reloading...");
      }
      stopHotReload(); // リロード前にintervalをクリア
      globalThis.location.reload();
    }
  } catch {
    stopHotReload();
  } finally {
    isChecking = false; // ← ここに到達する前にlocation.reload()が実行される
  }
}, safeInterval);
```

**レースコンディションシナリオ**:

1. **ファイル変更検知** → `isChecking = true`
2. **`location.reload()` 実行開始**（非同期）
3. **次のinterval tick発生** → `isChecking` はまだ `true`（スキップ）
4. **ページリロード完了前に再度fetch** → 複数リクエスト発生
5. **意図しない動作**: ページ遷移中のネットワークエラー

**影響**:

- 高頻度チェック時（interval=1000ms）に複数のfetchが並行実行
- Chromeのリソース制限に抵触する可能性
- 不要なBackground Scriptへの負荷

**根本原因**: `location.reload()` は同期的にページ遷移を開始するが、`finally`
ブロックは実行されない可能性がある。

**修正案**:

```typescript
hotReloadInterval = globalThis.setInterval(async () => {
  if (isChecking) return;

  isChecking = true;
  try {
    const currentContent = await sendMessage<string>({
      type: "CHECK_FILE_CHANGE",
      payload: { url: location.href },
    });

    const changed = currentContent !== lastFileContent;

    if (changed) {
      if (DEBUG) {
        console.log("Markdown Viewer: File changed detected! Reloading...");
      }
      // リロード前にintervalとフラグを確実にクリア
      if (hotReloadInterval !== null) {
        clearInterval(hotReloadInterval);
        hotReloadInterval = null;
      }
      isChecking = false; // ← finallyより前に確実にリセット
      globalThis.location.reload();
      return; // reload後の処理は不要
    }
  } catch {
    if (hotReloadInterval !== null) {
      clearInterval(hotReloadInterval);
      hotReloadInterval = null;
    }
  } finally {
    isChecking = false;
  }
}, safeInterval);
```

**または、よりシンプルに**:

```typescript
if (changed) {
  // リロード前に必ずクリーンアップ
  stopHotReload();
  isChecking = false; // 確実にリセット
  location.reload();
  return; // これ以降の処理は実行されない
}
```

---

## 🟡 IMPORTANT Issues（強く推奨）

### 3. `RemoteUrlSettings.tsx` 権限削除後のContent Script登録残存

**ファイル**: `src/settings/options/components/RemoteUrlSettings.tsx` **行**:
123-154

**問題**:

```typescript
const removeOrigin = async (origin: string) => {
  try {
    // 権限を削除
    await chrome.permissions.remove({
      origins: [origin],
    });

    // Content Scriptを解除（全てのカスタムスクリプトをクリア）
    // Note: 正確なIDを追跡するのは複雑なので、エラーは無視
    try {
      const scripts = await chrome.scripting.getRegisteredContentScripts();
      const customScriptIds = scripts
        .filter((s) => s.id.startsWith("custom-origin-"))
        .map((s) => s.id);

      if (customScriptIds.length > 0) {
        await chrome.scripting.unregisterContentScripts({
          ids: customScriptIds,
        });
      }
    } catch (e) {
      console.warn("Failed to unregister content scripts:", e);
    }
    // ← エラー時、Content Scriptが登録されたままになる
```

**問題点**:

1. **削除対象のスクリプトIDを特定していない**（全カスタムスクリプトを削除している）
2. **`unregisterContentScripts()` 失敗時の挙動が不明確**
3. **削除したドメインのContent Scriptが残存する可能性**

**影響**:

- ユーザーが削除したドメインでも拡張が動作し続ける
- プライバシーポリシー違反（オプトインの原則に反する）
- ストアレビューで却下されるリスク

**修正案**:

```typescript
const removeOrigin = async (origin: string) => {
  try {
    // 1. まず Content Script ID を計算（addOrigin と同じロジック）
    const scriptId = `custom-origin-${
      btoa(origin).replace(
        /[+/=]/g,
        (c) => ({ "+": "-", "/": "_", "=": "" }[c] || c),
      )
    }`;

    // 2. Content Script を先に削除（失敗時はエラー表示）
    try {
      await chrome.scripting.unregisterContentScripts({
        ids: [scriptId], // ← 削除対象のみを指定
      });
    } catch (e) {
      console.error(`Failed to unregister content script for ${origin}:`, e);
      // ユーザーに通知（ToastまたはError UI）
      setError(
        `Failed to remove content script: ${
          e instanceof Error ? e.message : "Unknown error"
        }`,
      );
      return; // 権限削除をスキップ
    }

    // 3. 権限を削除
    await chrome.permissions.remove({
      origins: [origin],
    });

    // 4. Storage から削除
    const updated = customOrigins.filter((o) => o.origin !== origin);
    setCustomOrigins(updated);
    await saveCustomOrigins(updated);
  } catch (err) {
    console.error("Failed to remove origin:", err);
    setError(err instanceof Error ? err.message : "Failed to remove origin");
  }
};
```

---

### 4. `background-handler.ts` CHECK_FILE_CHANGE のエラーメッセージ不親切

**ファイル**: `src/messaging/handlers/background-handler.ts` **行**: 58-73

**問題**:

```typescript
case "CHECK_FILE_CHANGE": {
  try {
    const url = message.payload.url + "?preventCache=" + Date.now();
    const response = await fetch(url);
    const content = await response.text();
    return { success: true, data: content };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error
        ? error.message
        : "Failed to fetch file",
    };
  }
}
```

**問題点**:

1. **`fetch()` が失敗する具体的な理由が不明**（ネットワークエラー、404、CORS等）
2. **WSL2ファイル（`file://wsl.localhost/...`）は常に失敗するが、エラーメッセージに説明がない**
3. **ユーザーがデバッグできない**

**影響**:

- Hot Reload機能が動作しない理由がわからない
- ユーザーサポート負荷増加

**修正案**:

```typescript
case "CHECK_FILE_CHANGE": {
  try {
    const url = message.payload.url + "?preventCache=" + Date.now();

    // WSL2ファイルは Chrome のセキュリティポリシーで fetch 不可
    if (url.includes("file://wsl.localhost/")) {
      return {
        success: false,
        error: "Hot Reload is not supported for WSL2 files (file://wsl.localhost/...). Please use a localhost HTTP server instead.",
      };
    }

    const response = await fetch(url);

    // HTTPステータスチェック
    if (!response.ok) {
      return {
        success: false,
        error: `Failed to fetch file: HTTP ${response.status} ${response.statusText}`,
      };
    }

    const content = await response.text();
    return { success: true, data: content };
  } catch (error) {
    // より詳細なエラーメッセージ
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      error: `Failed to fetch file: ${errorMsg}. Hot Reload may not be available for this file.`,
    };
  }
}
```

---

### 5. `MarkdownViewer.tsx` Mermaidレンダリングの非同期処理エラーハンドリング不足

**ファイル**: `src/content/components/MarkdownViewer.tsx` **行**: 156-202

**問題**:

```typescript
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
        // ← エラー時、ダイアグラムが消えたまま（UX悪化）
      }
    }
  })();
}
```

**問題点**:

1. **エラー時にダイアグラムが空白になる**（元のコードブロックに戻らない）
2. **ユーザーに失敗が通知されない**
3. **データ属性 `data-mermaid-code` が存在しない場合も考慮不足**

**影響**:

- テーマ切り替え時にダイアグラムが消失
- デバッグが困難

**修正案**:

```typescript
if (existingDiagrams && existingDiagrams.length > 0) {
  (async () => {
    for (const diagram of existingDiagrams) {
      try {
        const code = diagram.getAttribute("data-mermaid-code");
        if (!code) {
          console.warn("Mermaid diagram missing data-mermaid-code attribute");
          continue; // スキップ
        }

        const svg = await renderMermaid(code, theme);
        diagram.innerHTML = svg;
      } catch (error) {
        console.error("Mermaid re-rendering failed:", error);
        // エラー時、元のコードブロックを表示（フォールバック）
        const code = diagram.getAttribute("data-mermaid-code");
        if (code) {
          diagram.innerHTML = `
            <pre style="padding: 1rem; background: var(--markdown-viewer-code-bg); border-radius: 4px;">
              <code class="language-mermaid">${escapeHtml(code)}</code>
            </pre>
            <p style="color: var(--markdown-viewer-error-color); font-size: 0.875rem; margin-top: 0.5rem;">
              ⚠️ Failed to render Mermaid diagram
            </p>
          `;
        }
      }
    }
  })();
}
```

---

### 6. `mermaid-renderer.ts` 初期化のレースコンディション（部分的に対策済み）

**ファイル**: `src/domain/markdown/mermaid-renderer.ts` **行**: 69-107

**問題**:
現在の実装は既にレースコンディション対策が施されていますが、**エッジケース**が残っています。

```typescript
async function initializeMermaid(
  theme: "default" | "dark" | "forest" | "neutral" | "base" = "default",
): Promise<void> {
  // テーマが同じで既に初期化済みなら何もしない
  if (currentTheme === theme && initPromise === null) {
    return Promise.resolve();
  }

  // 既に初期化中の場合は、その初期化を待つ
  if (initPromise !== null) {
    await initPromise;
    // 初期化完了後、テーマが同じなら何もしない
    if (currentTheme === theme) {
      return Promise.resolve();
    }
  }
  // ← ここで別の並行呼び出しが発生すると、2つの初期化が走る可能性
```

**シナリオ**:

1. **Call A**: `initializeMermaid("dark")` 開始 → `initPromise` 設定
2. **Call B**: `initializeMermaid("light")` → `initPromise` を await
3. **Call A** 完了 → `initPromise = null`
4. **Call B**: `currentTheme === "dark"` なので再初期化開始 → `initPromise` 設定
5. **Call C**: `initializeMermaid("light")` → `initPromise` を
   await（Bの初期化）
6. **Call B** 完了 → `currentTheme = "light"`
7. **Call C**: `currentTheme === "light"` なので初期化スキップ
8. ✅ **正常動作**（問題なし）

しかし、以下のケースで問題が発生:

**問題シナリオ**:

1. **Call A**: `initializeMermaid("dark")` 開始 → `initPromise` 設定
2. **Call B**: `initializeMermaid("dark")` → `initPromise` を await
3. **Call A** 完了 → `initPromise = null`、`currentTheme = "dark"`
4. **Call B**: `currentTheme === "dark"` なので **スキップ**（return）
5. **Call C**: `initializeMermaid("light")` → `initPromise === null`
   なので新規初期化開始
6. **Call D**: `initializeMermaid("light")` → `initPromise !== null` なので
   await
7. **同時に2つの `renderMermaid()` が実行** → 問題なし（待機するため）

**結論**: 現在の実装で**重大な問題はない**が、コードの意図がわかりにくい。

**改善案（オプション）**:

```typescript
// ロックメカニズムを明示的に実装
let initLock: Promise<void> | null = null;

async function initializeMermaid(
  theme: "default" | "dark" | "forest" | "neutral" | "base" = "default",
): Promise<void> {
  // ロック取得待ち
  while (initLock !== null) {
    await initLock;
  }

  // テーマが同じなら初期化不要
  if (currentTheme === theme) {
    return;
  }

  // ロック設定
  initLock = (async () => {
    try {
      mermaidInstance.initialize({
        theme,
        startOnLoad: false,
        securityLevel: "strict",
        flowchart: { htmlLabels: true },
      });
      currentTheme = theme;
      await new Promise((resolve) => setTimeout(resolve, 10));
    } finally {
      initLock = null; // ロック解放
    }
  })();

  await initLock;
}
```

---

### 7. `sanitizer.ts` 相対パスの `href` 許可ロジックの脆弱性

**ファイル**: `src/domain/markdown/sanitizer.ts` **行**: 56-66

**問題**:

```typescript
// 相対パスのhrefを許可 (xssはデフォルトで相対パスを削除するため)
if (tag === "a" && name === "href") {
  // javascript:, data:, vbscript: などの危険なプロトコルをブロック
  const dangerous = ["javascript:", "data:", "vbscript:", "file:"];
  const lowerValue = value.toLowerCase().trim();
  if (dangerous.some((proto) => lowerValue.startsWith(proto))) {
    return; // 危険なプロトコルは削除
  }
  // 相対パス、絶対パス、フラグメントを許可
  return `href="${value}"`;
}
```

**脆弱性**:

1. **`value` がエスケープされていない** → 属性値の終端攻撃が可能
2. **スペースやタブを含むプロトコル** → バイパス可能

**攻撃例**:

```markdown
[Click me](javascript:alert('XSS')) → ブロックされる（正常）

[Click me](" onclick="alert('XSS')) → `href="" onclick="alert('XSS')"`
に変換（XSS成立）

[Click me](javascript:alert('XSS')) → `trim()` で削除されるが、`startsWith`
はスペース後を見ない → ブロックされる（正常）

[Click me](javascript:alert('XSS')) → HTML entity は xss
ライブラリでデコードされるが、このロジックの前に処理される → 要確認
```

**修正案**:

```typescript
if (tag === "a" && name === "href") {
  // まず値を正規化（スペース、タブ、改行を削除）
  const normalizedValue = value.replace(/[\s\r\n\t]+/g, "").toLowerCase();

  // 危険なプロトコルをブロック（より包括的）
  const dangerous = [
    "javascript:",
    "data:",
    "vbscript:",
    "file:",
    "about:",
    "blob:",
  ];

  if (dangerous.some((proto) => normalizedValue.startsWith(proto))) {
    return; // 危険なプロトコルは削除
  }

  // 属性値のエスケープ（ダブルクォート、シングルクォート、タグ終端）
  const escaped = value
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  return `href="${escaped}"`;
}
```

**ただし、xss (js-xss)
ライブラリが既にこのエスケープを行っている可能性が高い**。念のため、以下のE2Eテストを追加推奨:

```typescript
// tests/e2e/xss.spec.ts に追加
test("XSS: href attribute termination attack", async ({ page, testServerUrl }) => {
  const maliciousMarkdown = `[Click me](" onclick="alert('XSS'))`;

  await openMarkdownFile(
    page,
    `${testServerUrl}/tests/e2e/fixtures/xss-href-termination.md`,
  );
  await expectMarkdownRendered(page);

  const link = page.locator('a:has-text("Click me")');
  const href = await link.getAttribute("href");
  const onclick = await link.getAttribute("onclick");

  // href属性が正しくエスケープされている、またはリンク自体が削除されている
  expect(onclick).toBeNull(); // onclickイベントが存在しない
  expect(href).not.toContain("onclick"); // href内にonclickが含まれていない
});
```

---

## 🔵 OPTIONAL Issues（改善推奨）

### 8. `StateManager.ts` interval < 1000 時のデフォルト値使用を通知すべき

**ファイル**: `src/background/state-manager.ts` **行**: 64-67

**現在の実装**:

```typescript
interval: typeof stored.hotReload?.interval === "number" &&
    stored.hotReload.interval >= 1000
  ? stored.hotReload.interval
  : this.DEFAULT_STATE.hotReload.interval,
```

**問題点**:

- ユーザーが設定した値（例: 500ms）が無視される
- 設定画面でも通知されない
- 意図しない動作と感じる可能性

**改善案**:

```typescript
// 最小値チェック & 警告
let interval = this.DEFAULT_STATE.hotReload.interval;
if (typeof stored.hotReload?.interval === "number") {
  if (stored.hotReload.interval < 1000) {
    console.warn(
      `Hot Reload interval ${stored.hotReload.interval}ms is below minimum (1000ms). Using default ${this.DEFAULT_STATE.hotReload.interval}ms.`,
    );
    interval = this.DEFAULT_STATE.hotReload.interval;
  } else {
    interval = stored.hotReload.interval;
  }
}
```

または、設定画面で入力時に検証:

```typescript
// settings/options/components/HotReloadSettings.tsx
<input
  type="number"
  min="1000"
  step="1000"
  value={interval}
  onChange={(e) => {
    const value = parseInt(e.currentTarget.value);
    if (value < 1000) {
      setError("Minimum interval is 1000ms (1 second)");
    } else {
      setInterval(value);
    }
  }}
/>;
```

---

### 9. `content/index.ts` Hot Reload停止時の理由が不明瞭

**ファイル**: `src/content/index.ts` **行**: 216-218

**現在の実装**:

```typescript
} catch {
  // Fetch failed, stop Hot Reload (silently)
  stopHotReload();
}
```

**問題点**:

- DEBUGモードでもエラー理由が出力されない
- トラブルシューティングが困難

**改善案**:

```typescript
} catch (error) {
  if (DEBUG) {
    console.warn(
      "Markdown Viewer: Hot Reload fetch failed, stopping Hot Reload:",
      error instanceof Error ? error.message : error
    );
  }
  stopHotReload();
}
```

---

### 10. `frontmatter/parser.ts` プロトタイプ汚染チェックの深さ不足

**ファイル**: `src/domain/frontmatter/parser.ts` **行**: 59-71

**現在の実装**:

```typescript
// プロトタイプ汚染チェック（トップレベルのキーのみチェック）
if (data && typeof data === "object") {
  if (
    Object.prototype.hasOwnProperty.call(data, "__proto__") ||
    Object.prototype.hasOwnProperty.call(data, "constructor") ||
    Object.prototype.hasOwnProperty.call(data, "prototype")
  ) {
    console.warn(
      "Frontmatter: Prototype pollution attempt detected, ignoring data",
    );
    data = {};
  }
}
```

**問題点**:

- **ネストされたオブジェクト内の汚染を検知できない**

**攻撃例**:

```yaml
---
title: "Safe Title"
metadata:
  __proto__:
    polluted: true
---
```

この場合、トップレベルには `__proto__` が存在しないため、検知されません。

**修正案（再帰的チェック）**:

```typescript
/**
 * プロトタイプ汚染チェック（再帰的）
 */
function sanitizeObject(obj: unknown): unknown {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  const sanitized: Record<string, unknown> = {};
  for (const key in obj) {
    // 危険なキーをスキップ
    if (key === "__proto__" || key === "constructor" || key === "prototype") {
      console.warn(`Frontmatter: Skipping dangerous key "${key}"`);
      continue;
    }

    sanitized[key] = sanitizeObject((obj as Record<string, unknown>)[key]);
  }

  return sanitized;
}

// 使用例
if (yamlString.trim()) {
  let parsed = parse(yamlString) || {};
  data = sanitizeObject(parsed); // ← 再帰的にサニタイズ
}
```

---

## ✅ 良好な実装例

以下の実装は模範的です:

1. **`messaging/client.ts`**: レイヤー分離の徹底（ただしCRITICAL問題あり）
2. **`domain/markdown/sanitizer.ts`**: xss (js-xss) の適切な設定
3. **`services/markdown-service.ts`**: ビジネスフローの明確化
4. **`content/index.ts`**: Hot Reload の Race Condition
   対策フラグ（ただし不完全）
5. **`mermaid-renderer.ts`**: 初期化の Promise チェーン（ほぼ完璧）
6. **全体的な型安全性**: TypeScript の厳格な型チェック

---

## 📝 推奨アクションアイテム

### 優先度: 高（ストア公開前に必須）

- [ ] **CRITICAL #1**: `sendMessage()` の `undefined` チェック追加
- [ ] **CRITICAL #2**: Hot Reload の Race Condition 修正
- [ ] **IMPORTANT #3**: `removeOrigin()` の Content Script 削除ロジック修正

### 優先度: 中（公開後の初期パッチで対応）

- [ ] **IMPORTANT #4**: `CHECK_FILE_CHANGE` のエラーメッセージ改善
- [ ] **IMPORTANT #5**: Mermaid レンダリングエラー時のフォールバック実装
- [ ] **IMPORTANT #7**: `sanitizer.ts` の href エスケープ検証（E2Eテスト追加）

### 優先度: 低（次期バージョンで改善）

- [ ] **OPTIONAL #8**: Hot Reload interval 検証ロジック
- [ ] **OPTIONAL #9**: Hot Reload 停止時のデバッグログ
- [ ] **OPTIONAL #10**: Frontmatter プロトタイプ汚染の再帰的チェック

---

## 🧪 追加テスト推奨

以下のテストケースを追加することを強く推奨します:

```typescript
// tests/e2e/messaging.spec.ts（新規）
test("sendMessage: Background Script 未起動時のエラーハンドリング", async ({ page }) => {
  // Service Worker を強制停止
  // テスト実装が複雑なため、Unit Testで対応推奨
});

// tests/e2e/hot-reload.spec.ts（新規）
test("Hot Reload: 高頻度チェック時のレースコンディション", async ({ page }) => {
  // interval=1000ms でファイル変更を高速で繰り返す
  // 複数の fetch が並行実行されないことを確認
});

// tests/e2e/xss.spec.ts（追加）
test("XSS: href attribute termination attack", async ({ page, testServerUrl }) => {
  // 実装例は IMPORTANT #7 参照
});

// src/domain/frontmatter/parser.test.ts（追加）
Deno.test("parseFrontmatter: ネストされたプロトタイプ汚染を防ぐ", () => {
  const markdown = `---
title: "Safe"
metadata:
  __proto__:
    polluted: true
---
# Content`;

  const result = parseFrontmatter(markdown);

  // metadata.__proto__ が削除されている、または空オブジェクト
  assertEquals(result.data.metadata.__proto__, undefined);
});
```

---

## 📊 信頼スコア詳細

**Confidence: 75/100**

- **+95点**: 包括的なコードレビュー完了（全レイヤー確認）
- **-10点**: E2Eテスト実行結果未確認（XSS攻撃ベクターの実証不足）
- **-5点**: 本番環境での動作未検証（Chrome Web Store配布後の動作）
- **-5点**: リモートURL機能の実戦データ不足

**総合評価**: WARN（警告）

CRITICAL問題2件を修正すれば **PASS** に到達可能です。

---

## 🎯 まとめ

このコードベースは**全体的に高品質**で、以下の点が特に優れています:

- ✅ レイヤーアーキテクチャの厳格な遵守
- ✅ セキュリティファーストの設計（XSS対策、プロトタイプ汚染対策）
- ✅ 包括的なUnit Test（17ファイル、全通過）
- ✅ TypeScript による型安全性

しかし、**実行時の例外的状況**（Background
Script未起動、レースコンディション等）への対処が不足しています。

**ストア公開前に CRITICAL 問題2件を必ず修正してください。**

---

**レビュー完了日**: 2026-02-15 **次回レビュー推奨**:
修正後、E2Eテスト全通過確認時
