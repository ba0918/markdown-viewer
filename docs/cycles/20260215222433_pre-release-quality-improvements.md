# Pre-Release Quality Improvements

**Cycle ID:** `20260215222433` **Started:** 2026-02-15 22:24:33 **Status:** 🟡
Planning

---

## 📝 What & Why

ストア公開前の最終品質改善サイクル。4つのレビューエージェント（security,
performance, correctness,
architecture）によるレビュー結果から特定された全問題を修正する。CRITICAL
2件、IMPORTANT 5件、OPTIONAL 6件の計13件を体系的に解決し、完璧な状態で Chrome
Web Store に公開する。

## 🎯 Goals

- **CRITICAL問題2件を完全解決**: 拡張機能リロード時のクラッシュとHot
  Reloadレースコンディションを修正
- **IMPORTANT問題5件を完全解決**:
  パフォーマンス・UX・セキュリティの重要問題を修正
- **OPTIONAL問題6件を完全解決**: 将来的な保守性・拡張性を向上
- **全テスト通過維持**: 228 Unit tests + 69 E2E tests の品質維持
- **ドキュメント完全性**: CLAUDE.md とADRの実態との乖離を解消

## 📐 Design

### 実装順序（優先度順）

#### Phase 1: CRITICAL（リリースブロッカー）⚠️

**1-1. sendMessage() undefined チェック**

- **ファイル**: `src/messaging/client.ts`
- **問題**: Background
  Script未起動時、`chrome.runtime.sendMessage()`が`undefined`を返すが未チェック
- **影響**: 拡張機能リロード中にページ開くと真っ白、Hot Reload完全停止
- **修正内容**:
  ```typescript
  const response: MessageResponse<T> | undefined = await chrome.runtime
    .sendMessage(message);

  if (!response) {
    throw new Error(
      "No response from background script. The extension may be reloading.",
    );
  }

  if (!response.success) {
    throw new Error(response.error || "Unknown error");
  }
  ```

**1-2. Hot Reload レースコンディション**

- **ファイル**: `src/content/index.ts` (L194-223)
- **問題**:
  `location.reload()`実行時、`finally`ブロック未実行で`isChecking`フラグリセット漏れ
- **影響**:
  高頻度チェック時（1秒間隔）に複数fetchが並行実行、Chromeリソース制限に抵触
- **修正内容**:
  ```typescript
  if (changed) {
    stopHotReload();
    isChecking = false; // リロード前に確実にリセット
    location.reload();
    return;
  }
  ```

#### Phase 2: IMPORTANT（パフォーマンス・UX・セキュリティ）🟡

**2-1. sanitizeHTML() 不要なasync宣言削除（パフォーマンス）**

- **ファイル**: `src/domain/markdown/sanitizer.ts`,
  `src/services/markdown-service.ts`
- **問題**:
  `xss()`は同期関数だが`async`宣言され、毎回不要なPromiseオーバーヘッド発生
- **影響**: 全Markdownレンダリングで微小な遅延蓄積
- **修正内容**:
  - sanitizer.ts:
    `export const sanitizeHTML = (html: string): string => { return xss(html, options); }`
  - markdown-service.ts: `const sanitized = sanitizeHTML(parsed);` (await削除)

**2-2. RemoteUrlSettings Content Script削除不完全**

- **ファイル**: `src/settings/components/RemoteUrlSettings.tsx`
- **問題**: 権限削除してもContent Scriptが残存する可能性
- **影響**:
  ユーザーがドメイン削除してもスクリプトが動き続ける（セキュリティ・プライバシー懸念）
- **修正内容**:
  ```typescript
  // removeOrigin() 内で追加
  const scriptId = `custom-origin-${btoa(origin).replace(/[+/=]/g, ...)}`;
  await chrome.scripting.unregisterContentScripts({ ids: [scriptId] });
  ```

**2-3. CHECK_FILE_CHANGE エラーメッセージ改善（UX）**

- **ファイル**: `src/messaging/handlers/background-handler.ts`
- **問題**: WSL2ファイルでHot Reload失敗理由がユーザーに伝わらない
- **影響**: ユーザー混乱、サポート問い合わせ増加
- **修正内容**:
  ```typescript
  return {
    success: false,
    error: `Failed to check file: ${error.message}. ` +
      `Note: Hot Reload requires HTTP server for WSL2 files (file://wsl.localhost/* is not supported).`,
  };
  ```

**2-4. Mermaid レンダリング失敗時のフォールバック追加**

- **ファイル**: `src/domain/markdown/mermaid-renderer.ts`,
  `src/content/components/MarkdownViewer.tsx`
- **問題**: テーマ切り替え時にダイアグラムが消失する可能性
- **影響**: ユーザー体験の低下
- **修正内容**:
  - try-catchでエラーハンドリング強化
  - 失敗時はコードブロックをそのまま表示（エラーメッセージ付き）

**2-5. Mermaid初期化レースコンディション改善**

- **ファイル**: `src/domain/markdown/mermaid-renderer.ts`
- **問題**: 並行初期化で複数回`mermaid.initialize()`が呼ばれる可能性（軽微）
- **影響**: 現在はほぼ問題ないが、将来的な潜在バグ
- **修正内容**:
  ```typescript
  let initPromise: Promise<void> | null = null;
  const ensureMermaidInitialized = async (): Promise<void> => {
    if (initPromise) return initPromise;
    initPromise = (async () => {
      await mermaid.initialize({ startOnLoad: false, theme: "default" });
    })();
    return initPromise;
  };
  ```

#### Phase 3: OPTIONAL（保守性・拡張性向上）🔵

**3-1. Hot Reload 最小間隔を2秒に引き上げ**

- **ファイル**: `src/background/state-manager.ts`
- **問題**: 最小1000ms（1秒）で大量リクエスト発生の可能性
- **修正内容**:
  `DEFAULT_STATE.hotReload.interval = 2000`、バリデーション最小値も2000msに

**3-2. ToC リサイズ時のchrome.storage書き込みデバウンス**

- **ファイル**: `src/ui-components/markdown/TableOfContents/useResizable.ts`
- **問題**: リサイズ中に毎回`chrome.storage.sync.set()`実行
- **修正内容**: デバウンス処理追加（300ms）

**3-3. Mermaid レンダリング検索最適化**

- **ファイル**: `src/content/components/MarkdownViewer.tsx`
- **問題**: 毎回`querySelectorAll`で全コードブロック検索
- **修正内容**:
  レンダリング済みSVGに`data-mermaid-rendered="true"`属性追加、再検索スキップ

**3-4. `@types/node` 最新版に更新**

- **ファイル**: `deno.json`
- **問題**: 若干古いバージョン（25.2.1、最新: 25.2.3）
- **修正内容**: `mise exec -- pnpm update @types/node`

**3-5. CLAUDE.md 例外ケース明記**

- **ファイル**: `.claude/CLAUDE.md`
- **問題**: 厳格すぎるルールで実装と乖離
- **修正内容**: 「許容される例外」セクション追加
  - 軽量なdomain関数のmessaging直接呼び出しOK（例: `loadTheme()`）
  - DOM操作系domainのcontent直接呼び出しOK（例: `renderMath()`,
    `renderMermaid()`）
  - UIローカル状態のchrome.storage直接OK（例: ToC状態永続化）
  - ファイルURL取得の`chrome.runtime.getURL()`OK

**3-6. ADR-007 追加**

- **ファイル**: `docs/ARCHITECTURE_DECISIONS.md`
- **問題**: レイヤールール例外の公式記録なし
- **修正内容**: 「ADR-007: レイヤールールの実用的例外」追加

### Files to Change

```
src/
  messaging/
    client.ts                       # Phase 1-1: undefined チェック追加
    handlers/background-handler.ts  # Phase 2-3: エラーメッセージ改善
  content/
    index.ts                        # Phase 1-2: レースコンディション修正
    components/MarkdownViewer.tsx   # Phase 2-4, 3-3: Mermaid改善
  domain/
    markdown/
      sanitizer.ts                  # Phase 2-1: async削除
      mermaid-renderer.ts           # Phase 2-4, 2-5: エラーハンドリング・初期化改善
  services/
    markdown-service.ts             # Phase 2-1: await削除
  settings/
    components/RemoteUrlSettings.tsx # Phase 2-2: Content Script削除追加
  background/
    state-manager.ts                # Phase 3-1: 最小間隔2秒に
  ui-components/
    markdown/TableOfContents/
      useResizable.ts               # Phase 3-2: デバウンス追加

.claude/
  CLAUDE.md                         # Phase 3-5: 例外ケース明記

docs/
  ARCHITECTURE_DECISIONS.md         # Phase 3-6: ADR-007追加

deno.json                           # Phase 3-4: @types/node更新
```

### Key Points

- **後方互換性**: 全変更は内部実装のみ、APIインターフェース変更なし
- **テスト戦略**: 各Phaseごとに全テスト実行（228 Unit + 69 E2E）
- **段階的コミット**: Phase 1 → Phase 2 → Phase 3 で各3回コミット
- **レイヤー分離厳守**: domain層の純粋性維持

## ✅ Tests

### Phase 1: CRITICAL

- [ ] `messaging/client.ts`: undefined時にエラースロー確認（手動テスト:
      拡張リロード中にページ開く）
- [ ] `content/index.ts`: Hot
      Reload高頻度チェック時のレースコンディションなし確認（interval=1000msで10回連続変更）

### Phase 2: IMPORTANT

- [ ] `sanitizer.ts`: 同期関数として正常動作確認（既存テスト:
      `sanitizer.test.ts`）
- [ ] `RemoteUrlSettings.tsx`: ドメイン削除後にContent
      Script未登録確認（手動テスト）
- [ ] `background-handler.ts`:
      WSL2ファイルエラー時に詳細メッセージ表示確認（手動テスト）
- [ ] `mermaid-renderer.ts`:
      テーマ切り替え時にダイアグラム消失なし確認（手動テスト）
- [ ] `mermaid-renderer.ts`:
      並行初期化で複数initialize()なし確認（console.logで検証）

### Phase 3: OPTIONAL

- [ ] `state-manager.ts`: interval最小値2000ms検証（既存テスト:
      `state-manager.test.ts`）
- [ ] `useResizable.ts`:
      リサイズ中のchrome.storage書き込み頻度減少確認（console.logで検証）
- [ ] `MarkdownViewer.tsx`:
      Mermaid再レンダリング時にquerySelectorAll削減確認（パフォーマンス計測）
- [ ] `@types/node`:
      最新版インストール確認（`mise exec -- pnpm list @types/node`）

### 総合テスト

- [ ] 全228 Unit testsが通過（`deno task test`）
- [ ] 全69 E2E testsが通過（`deno task test:e2e:wsl2`）
- [ ] ビルド成功（`deno task build`）
- [ ] Chrome拡張として正常動作確認（手動テスト）

## 🔒 Security

### Phase 1-1: sendMessage() undefined チェック

- [ ] Background Script未起動時の適切なエラーハンドリング
- [ ] ユーザーに分かりやすいエラーメッセージ（"extension may be reloading"）

### Phase 2-2: RemoteUrlSettings Content Script削除

- [ ] 権限削除後にスクリプトが確実に削除される
- [ ] `chrome.scripting.unregisterContentScripts()` エラーハンドリング

### Phase 2-3: エラーメッセージ改善

- [ ] WSL2制限をユーザーに明確に伝達
- [ ] セキュリティ上の理由を説明（"file://wsl.localhost/* is not supported"）

## 📊 Progress

| Phase                  | Task                                                               | Status |
| ---------------------- | ------------------------------------------------------------------ | ------ |
| **Phase 1: CRITICAL**  |                                                                    | ⚪     |
| 1-1                    | sendMessage() undefined チェック                                   | ⚪     |
| 1-2                    | Hot Reload レースコンディション修正                                | ⚪     |
| 1-1 Testing            | 手動テスト（拡張リロード中）                                       | ⚪     |
| 1-2 Testing            | 手動テスト（高頻度Hot Reload）                                     | ⚪     |
| 1 Commit               | `fix(critical): sendMessage undefined & Hot Reload race condition` | ⚪     |
| **Phase 2: IMPORTANT** |                                                                    | ⚪     |
| 2-1                    | sanitizeHTML() async削除                                           | ⚪     |
| 2-2                    | RemoteUrlSettings Content Script削除                               | ⚪     |
| 2-3                    | CHECK_FILE_CHANGE エラーメッセージ改善                             | ⚪     |
| 2-4                    | Mermaid フォールバック追加                                         | ⚪     |
| 2-5                    | Mermaid 初期化レースコンディション改善                             | ⚪     |
| 2 Testing              | 手動テスト全項目                                                   | ⚪     |
| 2 Commit               | `fix(important): performance, UX, security improvements`           | ⚪     |
| **Phase 3: OPTIONAL**  |                                                                    | ⚪     |
| 3-1                    | Hot Reload 最小間隔2秒                                             | ⚪     |
| 3-2                    | ToC デバウンス追加                                                 | ⚪     |
| 3-3                    | Mermaid 検索最適化                                                 | ⚪     |
| 3-4                    | @types/node 更新                                                   | ⚪     |
| 3-5                    | CLAUDE.md 例外ケース明記                                           | ⚪     |
| 3-6                    | ADR-007 追加                                                       | ⚪     |
| 3 Testing              | パフォーマンス計測                                                 | ⚪     |
| 3 Commit               | `refactor(optional): maintainability & extensibility improvements` | ⚪     |
| **総合テスト**         |                                                                    | ⚪     |
| Final                  | 全228 Unit tests                                                   | ⚪     |
| Final                  | 全69 E2E tests                                                     | ⚪     |
| Final                  | ビルド成功                                                         | ⚪     |
| Final                  | Chrome拡張動作確認                                                 | ⚪     |

**Legend:** ⚪ Pending · 🟡 In Progress · 🟢 Done

---

## 📋 レビュー結果詳細

### セキュリティレビュー結果

- **信頼スコア**: 95/100 ✅ PASS
- **致命的脆弱性**: なし
- **推奨事項**: @types/node更新、定期依存関係更新

### パフォーマンスレビュー結果

- **信頼スコア**: 75/100 ⚠️ WARN
- **IMPORTANT問題**: sanitizeHTML() async宣言（毎回Promiseオーバーヘッド）
- **OPTIONAL問題**: Mermaid検索、Hot Reload間隔、ToC デバウンス等

### コード正確性レビュー結果

- **信頼スコア**: 75/100 ⚠️ WARN
- **CRITICAL問題**: sendMessage() undefined、Hot Reload レースコンディション
- **IMPORTANT問題**: RemoteUrlSettings、エラーメッセージ、Mermaid等

### アーキテクチャレビュー結果

- **信頼スコア**: 85/100 ✅ PASS
- **レイヤー分離**: ほぼ完璧（例外は実用的判断）
- **推奨事項**: CLAUDE.md例外ケース明記、ADR-007追加

---

## 🎯 成功基準

- [ ] **CRITICAL問題2件が完全解決**: 拡張リロード時クラッシュなし、Hot
      Reloadレースコンディションなし
- [ ] **IMPORTANT問題5件が完全解決**:
      パフォーマンス向上、UX改善、セキュリティ強化
- [ ] **OPTIONAL問題6件が完全解決**: 保守性・拡張性向上、ドキュメント整合性
- [ ] **全テスト通過**: 228 Unit + 69 E2E = 297 tests 全通過
- [ ] **ビルド成功**: エラー・警告なし
- [ ] **Chrome拡張正常動作**: 手動テストで全機能動作確認

---

**Next:** Phase 1実装 → テスト → Phase 2実装 → テスト → Phase 3実装 → テスト →
総合テスト → Commit 🚀
