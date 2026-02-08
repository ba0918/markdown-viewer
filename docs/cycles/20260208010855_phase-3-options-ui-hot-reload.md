# Phase 3: Options UI & Hot Reload

**Cycle ID:** `20260208010855` **Started:** 2026-02-08 01:08:55 **Status:** 🟡
Planning

---

## 📝 What & Why

Phase 3では、詳細設定ページ (Options UI)、追加テーマ4種、Hot
Reload機能を実装し、ユーザーエクスペリエンスを大幅に向上させる。

## 🎯 Goals

- 6種類のテーマ切り替え（既存2種 + 新規4種）
- Options UIで詳細設定が可能
- Markdown Hot Reloadで開発体験向上

## 📐 Design

### Files to Change

```
src/
  shared/types/
    theme.ts - Theme型に4テーマ追加

  domain/theme/
    loader.ts - THEMES辞書に4テーマ追加
    loader.test.ts - 新テーマのテスト追加

  domain/file-watcher/ (NEW)
    file-watcher.ts - document.lastModified監視ロジック
    file-watcher.test.ts - 変更検知テスト

  content/
    index.ts - Hot Reloadロジック追加
    styles/themes/ - 4つの新規CSSファイル
      github.css (NEW)
      minimal.css (NEW)
      solarized-light.css (NEW)
      solarized-dark.css (NEW)

  settings/options/ (NEW)
    index.tsx - エントリーポイント
    App.tsx - メインコンポーネント
    components/
      ThemeSelector.tsx - 6テーマ対応選択UI
      HotReloadSettings.tsx - Hot Reload設定UI

  scripts/
    build.ts - options.js ビルド追加、新CSS自動コピー
```

### Key Points

- **レイヤー分離厳守**: Options UIはmessaging I/Oのみ、File
  WatcherはDomain純粋関数
- **TDD徹底**: File Watcher DomainはRED→GREEN→REFACTORで実装
- **Progressive Enhancement**: Hot
  Reloadはオプション機能、無効でも基本機能は動作

## ✅ Tests

### Step 1: Theme System (Domain層)

- [ ] `loader.test.ts` - GitHub テーマ読み込み
- [ ] `loader.test.ts` - Minimal テーマ読み込み
- [ ] `loader.test.ts` - Solarized Light テーマ読み込み
- [ ] `loader.test.ts` - Solarized Dark テーマ読み込み

### Step 2: File Watcher (Domain層)

- [ ] `file-watcher.test.ts` - getLastModified 現在時刻取得
- [ ] `file-watcher.test.ts` - hasFileChanged 変更なし判定
- [ ] `file-watcher.test.ts` - hasFileChanged 変更あり判定

### Step 3: Integration

- [ ] Options UI でテーマ切り替え動作確認
- [ ] Options UI で Hot Reload 設定変更確認
- [ ] Hot Reload 有効時、ファイル変更でリロード確認
- [ ] Hot Reload 無効時、リロードされないこと確認

## 🔒 Security

- [ ] Options UI は messaging 経由のみ（直接Chrome API禁止）
- [ ] Hot Reload は `window.location.reload()` 使用（eval禁止）
- [ ] setInterval の適切なクリーンアップ

## 📊 Progress

### Phase 3-1: Theme System (1日目) ✅

| Task                  | Status |
| --------------------- | ------ |
| 型定義更新 (theme.ts) | 🟢     |
| CSS 4ファイル作成     | 🟢     |
| loader.ts 更新        | 🟢     |
| テスト追加            | 🟢     |
| Build script 更新     | 🟢     |

### Phase 3-2: Options UI (2日目) ✅

| Task                       | Status |
| -------------------------- | ------ |
| Options コンポーネント作成 | 🟢     |
| ThemeSelector 実装         | 🟢     |
| HotReloadSettings 実装     | 🟢     |
| options.html 更新          | 🟢     |
| Build script 更新          | 🟢     |
| Popup ThemeSelector拡張    | 🟢     |

### Phase 3-3: Hot Reload (3日目)

| Task                      | Status |
| ------------------------- | ------ |
| File Watcher Domain (TDD) | ⚪     |
| Content Script 更新       | ⚪     |
| Storage 変更リスナー実装  | ⚪     |
| E2Eテスト                 | ⚪     |

**Legend:** ⚪ Pending · 🟡 In Progress · 🟢 Done

---

## 📋 Implementation Steps

### Step 1: Theme System Extension

1. `src/shared/types/theme.ts` に 4テーマ追加
2. `src/content/styles/themes/` に CSS 4ファイル作成
3. `src/domain/theme/loader.ts` の THEMES 辞書更新
4. `src/domain/theme/loader.test.ts` テスト追加
5. `scripts/build.ts` でCSS自動コピー実装

### Step 2: Options UI Implementation

1. `src/settings/options/` ディレクトリ作成
2. `index.tsx`, `App.tsx` 実装（Popup.tsx参考）
3. `ThemeSelector.tsx` - 6テーマ対応
4. `HotReloadSettings.tsx` - enabled, interval, autoReload設定
5. `options.html` プレースホルダー置き換え
6. `scripts/build.ts` に options.js ビルド追加

### Step 3: Hot Reload Feature

1. **RED Phase**: `src/domain/file-watcher/file-watcher.test.ts` 作成
2. **GREEN Phase**: `src/domain/file-watcher/file-watcher.ts` 実装
3. `src/content/index.ts` に Hot Reload ロジック追加
   - `startHotReload()` - setInterval 開始
   - `stopHotReload()` - clearInterval
   - Storage 変更リスナーで設定反映
4. E2Eテスト（実際のMDファイルで動作確認）

---

## 🚨 Critical Notes

### Performance

- Hot Reload interval 最小値: 1000ms (1秒)
- setInterval の必須クリーンアップ（メモリリーク防止）

### Architecture

- Options UI: messaging I/O のみ、ビジネスロジック禁止
- File Watcher: 純粋関数、Chrome API禁止、document.lastModified のみ使用
- Content Script: domain関数呼び出しOK、messaging経由で設定取得

---

**Reference:** 詳細な実装内容は
[.claude/plans/phase-3-planning.md](../../.claude/plans/phase-3-planning.md)
を参照

**Next:** テスト書いて → 実装して → コミットして 🚀
