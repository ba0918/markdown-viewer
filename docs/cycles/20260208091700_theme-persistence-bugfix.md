# テーマ設定永続化バグ修正

**Cycle ID:** `20260208091700` **Started:** 2026-02-08 09:17:00 **Status:** 🟡
Planning

---

## 📝 What & Why

StateManagerのバリデーションロジックが古く、`light`と`dark`しか許可していないため、`github`、`minimal`、`solarized-light`、`solarized-dark`のテーマを選択してもリロード時に`light`へ強制的にリセットされてしまう不具合を修正する。

## 🎯 Goals

- 全6テーマ（light, dark, github, minimal, solarized-light,
  solarized-dark）の設定永続化を実現
- StateManagerのバリデーションロジックを最新の型定義に合わせて修正
- 既存のテストを修正し、全テーマの永続化を検証するテストを追加
- E2Eテストでテーマ切り替え＆リロード後の永続化を検証

## 📐 Design

### Root Cause

**問題箇所:** `src/background/state-manager.ts:54-57`

```typescript
// ❌ 古いバリデーション（2テーマのみ）
const validThemes: Theme[] = ["light", "dark"];
const theme = validThemes.includes(stored.theme as Theme)
  ? (stored.theme as Theme)
  : this.DEFAULT_STATE.theme;
```

このバリデーションにより、`github`等の新しいテーマがストレージから読み込まれても「不正な値」として弾かれ、デフォルトの`light`にフォールバックしている。

### Files to Change

```
src/
  background/
    state-manager.ts - validThemesを全6テーマに更新（VALID_THEMES定数をshared/constants/から参照）
    state-manager.test.ts - 全6テーマの永続化テストを追加、不正値のフォールバックテストも維持

  shared/
    constants/
      themes.ts (新規) - VALID_THEMESとDEFAULT_THEMEを定数として定義

tests/
  e2e/
    theme-persistence.spec.ts (新規) - テーマ切り替え＆リロード後の永続化をE2E検証
```

### Key Points

- **DRY原則**:
  `VALID_THEMES`定数を`shared/constants/themes.ts`で一元管理し、StateManagerと型定義（`src/shared/types/theme.ts`）で共有
- **後方互換性**:
  不正な値が入力された場合のフォールバック処理は維持（デフォルト`light`へ）
- **テスト網羅性**: Unit（全6テーマ）+
  E2E（実際のストレージ永続化）でダブルチェック

### Implementation Strategy

1. **shared/constants/themes.ts新規作成**
   - `VALID_THEMES: readonly Theme[]` を定義（全6テーマ）
   - `DEFAULT_THEME: Theme = 'light'` を定義

2. **state-manager.ts修正**
   - `import { VALID_THEMES, DEFAULT_THEME } from '../../shared/constants/themes.ts'`
   - Line 54の`validThemes`をハードコード配列から`VALID_THEMES`へ置き換え
   - Line 30の`theme: 'light'`を`theme: DEFAULT_THEME`へ置き換え

3. **state-manager.test.ts修正**
   - 全6テーマの保存＆読み込みテストを追加
   - 不正値（`'invalid-theme'`）のフォールバックテストを維持

4. **E2Eテスト追加（theme-persistence.spec.ts）**
   - Options画面でテーマ切り替え
   - リロード後もテーマが維持されることを確認
   - 全6テーマで検証

## ✅ Tests

### Unit Tests (`src/background/state-manager.test.ts`)

- [ ] `light`テーマの保存＆読み込み（既存）
- [ ] `dark`テーマの保存＆読み込み（既存）
- [ ] `github`テーマの保存＆読み込み（新規）
- [ ] `minimal`テーマの保存＆読み込み（新規）
- [ ] `solarized-light`テーマの保存＆読み込み（新規）
- [ ] `solarized-dark`テーマの保存＆読み込み（新規）
- [ ] 不正な値が入力された場合のフォールバック（既存）

### E2E Tests (`tests/e2e/theme-persistence.spec.ts`)

- [ ] Lightテーマ選択→リロード→Light維持
- [ ] Darkテーマ選択→リロード→Dark維持
- [ ] GitHubテーマ選択→リロード→GitHub維持
- [ ] Minimalテーマ選択→リロード→Minimal維持
- [ ] Solarized Lightテーマ選択→リロード→Solarized Light維持
- [ ] Solarized Darkテーマ選択→リロード→Solarized Dark維持

## 🔒 Security

このバグ修正はセキュリティに直接関係しないが、以下の点を維持:

- [ ] バリデーション: `VALID_THEMES`に含まれる値のみ許可
- [ ] フォールバック: 不正な値は安全なデフォルト（`light`）へフォールバック
- [ ] 型安全性: TypeScriptの`Theme`型により型安全性を保証

## 📊 Progress

| Step           | Status |
| -------------- | ------ |
| Tests          | ⚪     |
| Implementation | ⚪     |
| Commit         | ⚪     |

**Legend:** ⚪ Pending · 🟡 In Progress · 🟢 Done

---

## 🔍 Impact Analysis

### 影響範囲

- **変更レイヤー**: background層（StateManager）、shared層（新規定数）
- **変更ファイル数**: 4ファイル（実装3、テスト1新規）
- **破壊的変更**: なし（バグ修正のみ）
- **既存機能への影響**: 既存の`light`/`dark`テーマは影響なし

### リスク評価

- **低リスク**: StateManagerの内部ロジック変更のみ
- **後方互換性**: 既存の保存データ（`light`/`dark`）は問題なく動作
- **テスト網羅性**: Unit + E2E で全テーマ検証済み

---

**Next:** Write tests → Implement → Commit with `smart-commit` 🚀
