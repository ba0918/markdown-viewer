# JSDoc改善

**Cycle ID:** `20260217020128` **Started:** 2026-02-17 02:01:28 **Status:** 🟡
Planning

---

## 📝 What & Why

JSDocが「設計メモ」化している問題を修正。設計思想・禁止事項ではなく、実際の機能説明を記述するように改善する。

## 🎯 Goals

- JSDocを「設計メモ」から「機能説明」に改善
- 実装内容・使用方法を明確に記述
- 設計ルールは必要最小限（1行程度）に

## 📐 Design

### 問題パターン（Before）

```typescript
/**
 * background層のメッセージハンドラ
 *
 * 責務: ルーティングのみ、serviceへの委譲
 *
 * ❌ 絶対禁止: ビジネスロジックの実装
 * ✅ OK: serviceに委譲するだけ
 *
 * これは過去の失敗（DuckDB + offscreen）から学んだ最大の教訓！
 */
```

### 改善後（After）

```typescript
/**
 * background層のメッセージハンドラ
 *
 * content scriptからのメッセージを受信し、適切なserviceへルーティングする。
 * このレイヤーでビジネスロジックを記述しないこと。
 */
```

### 改善ルール

| Before                     | After                              |
| -------------------------- | ---------------------------------- |
| `責務:` + `禁止:`          | 実際の機能説明 + 簡潔な制約（1行） |
| `❌` / `✅` マーカー       | 削除（必要なら平文で）             |
| `過去の失敗から学んだ教訓` | 削除（CLAUDE.mdに記載済み）        |
| `DRY原則:`                 | 削除（自明）                       |

### Files to Change

```
src/
  background/service-worker.ts - ファイルヘッダーJSDoc改善
  background/state-manager.ts - ファイルヘッダーJSDoc改善
  content/index.ts - ファイルヘッダーJSDoc改善
  messaging/handlers/background-handler.ts - ファイルヘッダーJSDoc改善
  services/export-service.ts - ファイルヘッダーJSDoc改善
  services/markdown-service.ts - ファイルヘッダーJSDoc改善
  services/toc-service.ts - ファイルヘッダーJSDoc改善
  shared/utils/url-resolver.ts - ファイルヘッダーJSDoc改善
  shared/utils/encode.ts - ファイルヘッダーJSDoc改善
  domain/ - 各ファイルのヘッダーJSDoc確認・改善
```

### Key Points

- **ファイルヘッダーJSDoc**: 各ファイルの冒頭にあるモジュール説明を改善
- **関数JSDoc**: @param/@returnsは維持、説明文のみ改善
- **CLAUDE.md**: 設計ルールはここに集約済みなので、コード内では最小限に

## ✅ Tests

テスト不要（JSDocの内容改善のみ、コードロジック変更なし）

## 🔒 Security

N/A（コメント変更のみ）

## 📊 Progress

| Step             | Status  |
| ---------------- | ------- |
| ファイル洗い出し | 🟢 Done |
| JSDoc改善        | ⚪      |
| Lint/Test確認    | ⚪      |
| Commit           | ⚪      |

**Legend:** ⚪ Pending · 🟡 In Progress · 🟢 Done

---

**Next:** JSDoc改善 → Lint/Test確認 → Commit with `smart-commit` 🚀
