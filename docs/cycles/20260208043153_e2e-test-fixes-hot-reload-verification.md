# Cycle 20260208043153: E2E Test Fixes & Hot Reload Verification

**Started:** 2026-02-08 04:31:53
**Status:** 🟡 Planning
**Type:** Bug Fix & Testing

---

## 📋 Overview

### Goal

E2Eテストを修正してHot Reload機能が正常に動作しているかを自動検証できるようにする。

### Problem

Phase 3-3でHot Reload機能を実装したが、以下の問題がある：

1. **E2Eテストが全滅している** - Chrome拡張がPlaywrightで正しくロードされていない
2. **Hot Reload自体が動作していない可能性** - 実装したが実際に機能しているか未検証
3. **手動検証が困難** - 毎回手で確認するのは現実的ではない

### Success Criteria

- [ ] E2Eテストが正常に実行できる（Chrome拡張がPlaywrightでロード可能）
- [ ] Hot Reload機能の動作を自動検証できるテストが通る
- [ ] Markdown表示機能のE2Eテストが通る
- [ ] 全てのE2Eテストが `deno task test:e2e` で実行できる

---

## 🏗️ Architecture Analysis

### Affected Layers

```
tests/e2e/
  ├─ helpers/extension-helpers.ts  # 修正対象: Chrome拡張ロード処理
  ├─ markdown-rendering.spec.ts    # 修正対象: テスト実装
  └─ hot-reload.spec.ts            # 修正対象: テスト実装

playwright.config.ts                # 修正対象: 設定調整
```

### Current Issues

#### Issue 1: Chrome Extension Not Loading

```typescript
// tests/e2e/helpers/extension-helpers.ts
export async function waitForExtensionLoad(context: BrowserContext): Promise<void> {
  // Service Worker起動待機は不要（Playwrightのheadlessモードでは発火しないため）
  // 代わりに短い待機時間を設けて拡張機能の初期化を待つ
  await new Promise(resolve => setTimeout(resolve, 1000));
}
```

**問題:**
- 1秒の固定待機では拡張機能のロードが完了していない可能性
- Service Worker確認方法が不明
- 実際にロードされたかの確認がない

#### Issue 2: Markdown Rendering Test Failures

```
TimeoutError: page.waitForSelector: Timeout 5000ms exceeded
  waiting for selector ".markdown-viewer"
```

**問題:**
- Content Scriptが実行されていない
- `.markdown-viewer` が描画されていない
- 拡張機能の権限設定が不足している可能性

#### Issue 3: Hot Reload Test Not Working

Hot Reload機能自体が動作していない可能性があり、テストが成功しない。

---

## 🔧 Implementation Steps

### Step 1: Chrome拡張ロード確認の改善

**File:** `tests/e2e/helpers/extension-helpers.ts`

**Approach:**
1. Service Worker確認を別の方法で実装
2. 拡張機能IDの取得を確実に行う
3. ロード完了確認の信頼性向上

**Test List:**
- [ ] Service Workerが起動しているか確認できる
- [ ] 拡張機能IDが正しく取得できる
- [ ] Manifest.jsonが正しく読み込まれている

### Step 2: Markdownレンダリングテスト修正

**File:** `tests/e2e/markdown-rendering.spec.ts`

**Approach:**
1. Content Scriptが正しく実行されているか確認
2. `.markdown-viewer` が描画されるまでのタイムアウトを調整
3. 必要な権限が与えられているか確認

**Test List:**
- [ ] Content Scriptがロードされている
- [ ] `.markdown-viewer` が描画される
- [ ] Markdown要素（h1, strong, codeなど）が正しくレンダリングされる

### Step 3: Hot Reload機能の実装確認

**File:** `src/content/index.ts`

**Approach:**
1. Hot Reload機能が実際に動作しているか手動確認
2. `document.lastModified` が正しく取得できているか確認
3. ファイル変更検知が正しく動作しているか確認

**Test List:**
- [ ] `getLastModified()` が正しいタイムスタンプを返す
- [ ] `hasFileChanged()` がファイル変更を検知する
- [ ] Hot Reloadのintervalが正しく動作する

### Step 4: Hot Reloadテスト修正

**File:** `tests/e2e/hot-reload.spec.ts`

**Approach:**
1. Hot Reload機能が実装されていることを前提にテスト修正
2. ファイル変更検知のタイミングを適切に調整
3. リロード確認方法を改善

**Test List:**
- [ ] Hot Reload有効時、ファイル変更でリロードされる
- [ ] Hot Reload無効時、ファイル変更してもリロードされない
- [ ] コンソールログに「File changed detected!」が出力される

### Step 5: Playwright設定の最適化

**File:** `playwright.config.ts`

**Approach:**
1. タイムアウト設定を調整
2. headless/headedモードの切り替え
3. デバッグオプションの追加

---

## 🧪 Test Strategy

### Unit Tests

既存のunit testは全てpassしている（58 tests）。

### E2E Tests

以下のテストケースを実装・修正：

#### markdown-rendering.spec.ts
1. ✅ Markdownファイルが正しくレンダリングされる
2. ✅ デフォルトテーマ（light）が適用される
3. ✅ シンタックスハイライトが適用される
4. ✅ テーブルが正しくレンダリングされる
5. ✅ リンクが正しくレンダリングされる

#### hot-reload.spec.ts
1. ✅ Hot Reload有効時、ファイル変更で自動リロードされる
2. ✅ Hot Reload無効時、ファイル変更してもリロードされない

---

## 🔒 Security Considerations

- [ ] E2Eテストで使用するMarkdownファイルにXSS攻撃ベクターは含まれていないか
- [ ] Hot Reload機能が意図しないファイルを監視していないか
- [ ] テスト環境で機密情報が漏洩していないか

---

## 📊 Progress Tracking

| Step | Task | Status | Notes |
|------|------|--------|-------|
| 1 | Chrome拡張ロード確認改善 | ⬜ Pending | - |
| 2 | Markdownレンダリングテスト修正 | ⬜ Pending | - |
| 3 | Hot Reload機能実装確認 | ⬜ Pending | - |
| 4 | Hot Reloadテスト修正 | ⬜ Pending | - |
| 5 | Playwright設定最適化 | ⬜ Pending | - |

---

## 📝 Notes

- Playwrightのheadlessモードでは一部の機能が制限される可能性
- Hot Reload機能自体が動作していない場合は実装を見直す必要あり
- `document.lastModified` がブラウザ環境で正しく動作するか要確認

---

## 🔗 References

- [Playwright Documentation](https://playwright.dev/)
- [Chrome Extension Testing Best Practices](https://developer.chrome.com/docs/extensions/mv3/tut_testing/)
- Previous Cycle: [20260208010855_phase-3-options-ui-hot-reload.md](./20260208010855_phase-3-options-ui-hot-reload.md)

---

**Next Action:** Step 1から順に実装・修正を進める
