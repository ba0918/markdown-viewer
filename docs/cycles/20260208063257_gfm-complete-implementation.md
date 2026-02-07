# GitHub Flavored Markdown (GFM) 完全対応

**Cycle ID:** `20260208063257`
**Started:** 2026-02-08 06:32:57
**Status:** 🟡 In Progress

---

## 📝 What & Why

markedライブラリの `gfm: true` は既に有効化されているが、打ち消し線・タスクリスト・オートリンクのテストとCSSスタイルが不足している。GFM仕様に完全準拠し、全機能が正しく動作することを保証する。

## 🎯 Goals

- **打ち消し線（Strikethrough）** のテスト + CSS実装
- **タスクリスト（Task Lists）** のテスト + CSS実装
- **オートリンク（Autolink Literals）** のテスト実装
- **E2Eテスト** でブラウザ表示確認
- **全テーマ** にGFM要素のスタイル適用

## 📐 Design

### GFM機能の実装状況

| 機能 | Parser | Test | CSS | Status |
|------|--------|------|-----|--------|
| Tables | ✅ | ✅ | ✅ | 完了 |
| Strikethrough | ✅ | ❌ | ❌ | 未完了 |
| Task Lists | ✅ | ❌ | ❌ | 未完了 |
| Autolinks | ✅ | ❌ | - | 未完了 |
| Line Breaks | ✅ | - | - | 完了 |

### Files to Change

```
src/domain/markdown/
  parser.test.ts - 打ち消し線、タスクリスト、オートリンクのテスト追加

src/content/styles/themes/
  github.css - 打ち消し線とタスクリストのスタイル追加
  light.css - 同上
  dark.css - 同上
  minimal.css - 同上
  solarized-light.css - 同上
  solarized-dark.css - 同上

e2e/
  gfm.spec.ts - GFM機能のE2Eテスト新規作成
```

### Key Points

- **Strikethrough CSS**: `<del>` と `<s>` タグに `text-decoration: line-through` を適用
- **Task List CSS**: `input[type="checkbox"]` のスタイリング（GitHubライクなチェックボックス）
- **Autolink**: marked の `gfm: true` で自動処理済み、テストで確認のみ
- **全テーマ統一**: 各テーマファイルに同じGFMスタイルを追加

### GFM仕様の参照

- [GitHub Flavored Markdown Spec](https://github.github.com/gfm/)
- [Strikethrough extension](https://github.github.com/gfm/#strikethrough-extension-)
- [Task list items extension](https://github.github.com/gfm/#task-list-items-extension-)
- [Autolinks extension](https://github.github.com/gfm/#autolinks-extension-)

## ✅ Tests

### Unit Tests (parser.test.ts)

- [x] 打ち消し線: `~~text~~` → `<del>text</del>` 変換確認
- [x] タスクリスト（完了）: `- [x] Done` → チェックボックス checked
- [x] タスクリスト（未完了）: `- [ ] Todo` → チェックボックス unchecked
- [x] オートリンク: `https://example.com` → `<a href="...">` 変換確認
- [x] 複合GFM: テーブル + 打ち消し線 + タスクリストの混在

### E2E Tests (gfm-rendering.spec.ts)

- [x] 打ち消し線がブラウザで正しく表示される
- [x] タスクリストのチェックボックスが表示される
- [x] タスクリストのスタイルが正しく適用される
- [x] テーブルが正しくレンダリングされる（GFM）
- [x] オートリンクが自動的にリンクになる
- [x] 複合GFM機能が同時に動作する
- [x] テーブル内の複合GFM機能
- [x] 全テーマでGFM要素が適切にスタイリングされる

## 🔒 Security

- [x] DOMPurify が打ち消し線タグ（`<del>`, `<s>`）を許可しているか確認
- [x] タスクリストの `<input>` タグが `disabled` 属性を持つか確認（クリック不可）
- [x] オートリンクが `javascript:` プロトコルをブロックするか確認
- [x] セキュリティテスト追加（sanitizer.test.ts に +6テスト）

## 📊 Progress

| Step | Status |
|------|--------|
| Unit Tests | 🟢 |
| CSS Styling | 🟢 |
| E2E Tests | 🟡 |
| Security Check | 🟢 |
| Commit | 🟢 |

**Legend:** ⚪ Pending · 🟡 In Progress · 🟢 Done

---

## 📚 参考資料

- [marked.js Documentation](https://marked.js.org/)
- [GitHub Flavored Markdown Spec](https://github.github.com/gfm/)
- [remark-gfm plugin](https://github.com/remarkjs/remark-gfm) - GFM機能の参考実装

---

**Next:** Write tests → Implement CSS → E2E verification → Commit with `smart-commit` 🚀
