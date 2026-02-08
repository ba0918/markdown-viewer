# Offscreen Document Hot Reload実験

**Cycle ID:** `20260208101823`
**Started:** 2026-02-08 10:18:23
**Status:** 🟡 Planning

---

## 📝 What & Why

WSL2環境（`file://wsl.localhost/...`）でHot Reload機能が動作しない問題を、offscreen document APIを使用して回避できるか実験的に検証する。Windowsローカルファイル（`file:///C:/...`）では正常動作確認済み。

## 🎯 Goals

- offscreen document APIの基本的な動作確認
- offscreen contextでのfetch APIの権限とセキュリティ制限を調査
- WSL2ファイルパス（`file://wsl.localhost/...`）がoffscreen contextでアクセス可能か検証
- Hot Reload機能をoffscreen documentに移行した場合の実現可能性評価

## 📐 Design

### Files to Create/Change

```
manifest.json
  - offscreen permissions追加

src/
  offscreen/
    hot-reload/
      offscreen.html - offscreen document用のHTML
      offscreen.ts - offscreen context メインスクリプト
      offscreen.test.ts - ユニットテスト（モック使用）

  background/
    index.ts - offscreen document作成・管理ロジック追加

  domain/
    file-watcher/
      offscreen-fetcher.ts - offscreen用のfetch実装
      offscreen-fetcher.test.ts - テスト
```

### Experiment Steps

1. **Phase 1: 基本セットアップ**
   - manifest.jsonに `offscreen` permission追加
   - offscreen document HTML/TSの最小構成作成
   - background scriptからoffscreen document作成

2. **Phase 2: fetch APIの動作確認**
   - offscreen contextでfetch(`file://...`)が可能か検証
   - WSL2パス（`file://wsl.localhost/...`）のアクセス可否
   - エラーハンドリング、CORS制限の確認

3. **Phase 3: messaging連携**
   - background ↔ offscreen間のメッセージング実装
   - Hot Reload用のファイル監視ロジックをoffscreenに移行
   - 既存のHot Reload機能との統合テスト

### Key Points

- **Security**: offscreen documentは通常のwebページと同じCSP制限を受ける
- **Lifecycle**: offscreen documentの生成・破棄タイミングの制御が必要
- **Testing**: offscreen contextは直接テストできないため、モックベースのテスト戦略
- **Fallback**: offscreen APIが使えない環境（古いChrome）への対応

## ✅ Tests

### Unit Tests
- [ ] offscreen document作成・破棄のライフサイクル
- [ ] background → offscreen メッセージング
- [ ] offscreen → background レスポンス
- [ ] fetch APIのエラーハンドリング（モック）

### Integration Tests
- [ ] Windowsローカルファイル（`file:///C:/...`）でのfetch成功
- [ ] WSL2ファイル（`file://wsl.localhost/...`）でのfetch検証
- [ ] Last-Modifiedヘッダーの取得確認
- [ ] 既存Hot Reload機能との互換性

### E2E Tests (Optional for experiment)
- [ ] 実際のMarkdownファイル変更検知（Windows環境）
- [ ] WSL2環境でのHot Reload動作確認

## 🔒 Security

- [ ] offscreen documentのCSP設定確認
- [ ] `file://` URLアクセスの権限検証
- [ ] メッセージング時のorigin検証
- [ ] 意図しないファイルアクセス防止

## 📊 Progress

| Step | Status |
|------|--------|
| Manifest設定 | ⚪ |
| Offscreen HTML/TS作成 | ⚪ |
| Background統合 | ⚪ |
| Fetch動作検証 | ⚪ |
| WSL2パス検証 | ⚪ |
| 結果レポート作成 | ⚪ |

**Legend:** ⚪ Pending · 🟡 In Progress · 🟢 Done

---

## 🎓 Learning Outcomes

この実験を通して以下を明らかにする:

1. **技術的実現可能性**: offscreen APIでWSL2制限を回避できるか
2. **アーキテクチャ影響**: offscreen導入時のレイヤー分離への影響
3. **代替案の必要性**: offscreenで解決できない場合の次善策

**実験結果は `docs/offscreen-experiment-report.md` にまとめる予定**

---

**Next:** manifest.json設定 → offscreen HTML/TS作成 → fetch動作検証 🚀
