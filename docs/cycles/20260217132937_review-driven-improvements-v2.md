# レビュー結果ベース品質改善 v2

**Cycle ID:** `20260217132937` **Started:** 2026-02-17 13:29:37 **Status:** 🟢
Implementation Complete **Based on:** Codebase Review Report (2026-02-17 12:00)
— ローカル参照: `docs/reviews/review-20260217-1200.md`（git管理外）

---

## 📝 What & Why

第2回コードベースレビュー（総合82/100,
ランクA）で検出された残存・新規指摘事項を修正する。
前回サイクル（20260217104826）でPhase
1-6を全完了済み。今回は新たに検出された問題 + デッドコード整理 +
ErrorBoundary改善を実施。

## 🎯 Goals

- Critical 0件維持、Major 13件→0件を目指す
- デッドコード整理（Export関連を別ブランチに退避しメインから削除）
- セキュリティ: sanitizeSvgパースエラーバイパス修正
- 論理整合性:
  check-file-changeハッシュフォールバック修正、StateManagerレースコンディション修正
- コード衛生: domain層console.warn修正、Chrome API型定義統合
- 長期検討: ErrorBoundary本番スタックトレース非表示

---

## 📋 改善一覧（優先度順）

### 免責事項（対応しないもの）

以下は意図的にスキップ。理由は前回サイクルで検討・決定済み：

| 指摘                            | スキップ理由                                                             |
| ------------------------------- | ------------------------------------------------------------------------ |
| highlight.jsの2段階ローディング | 全言語維持を決定。汎用Markdownビューアとして全言語対応がプロダクトの強み |
| mathjax-fullのcode splitting    | esbuildのoutfile制約で不可。初期化遅延化は実施済み                       |
| Markdown二重パース統合          | Background/Content Scriptプロセス境界で統合不可                          |
| i18n対応                        | 工数high、将来サイクルに持ち越し                                         |
| WAI-ARIAタブパターン            | 将来サイクルに持ち越し                                                   |
| CSP unsafe-inline除去           | 工数high、将来サイクルに持ち越し                                         |
| MutationObserver導入            | 将来サイクルに持ち越し                                                   |

---

### Phase 1: デッドコード整理（別ブランチ退避）

Export機能無効化に伴うデッドコードを別ブランチに退避し、メインブランチから削除する。

| #   | タスク                             | 影響ファイル              | 工数 |
| --- | ---------------------------------- | ------------------------- | ---- |
| 1-1 | Export関連コードを別ブランチに退避 | 下記参照                  | low  |
| 1-2 | TocService整理                     | `services/toc-service.ts` | low  |

#### 1-1: Export関連コード別ブランチ退避

**手順:**

1. `feature/export-html` ブランチを作成（現在のmainから）
2. mainブランチで以下を削除:
   - `src/ui-components/markdown/DocumentHeaderMenu/` ディレクトリ全体
   - `src/shared/utils/file-name-parser.ts` + テスト
   - `src/services/export-service.ts` + テスト
   - `src/domain/export/` ディレクトリ全体 + テスト
   - `src/messaging/handlers/actions/export-and-download.ts` + テスト
   - `src/messaging/handlers/actions/generate-export-html.ts` + テスト
   - MarkdownViewer.tsxのコメントアウトされたExport関連コード
   - messaging types/action-types/action-registryからExport関連エントリ
3. ADR-008を更新（退避先ブランチ名を記録）
4. テスト・ビルド通過確認

**注意:** 退避前にfeature/export-htmlブランチに現状を保存しておくこと。

#### 1-2: TocService整理

**問題:**
TocServiceが本番コードのどこからもimportされていない（テストからのみ参照）。
MarkdownViewer.tsxではdomain関数を直接呼び出している（ADR-007例外）。

**方針:**

- TocServiceは削除する（domain直接呼び出しがADR-007例外として正当化済み）
- toc-service.test.tsも削除（domain層の個別テストで十分カバー）

---

### Phase 2: セキュリティ修正

| #   | タスク                                  | 影響ファイル                          | 重要度 | 工数 |
| --- | --------------------------------------- | ------------------------------------- | ------ | ---- |
| 2-1 | sanitizeSvg()パースエラー時バイパス修正 | `domain/markdown/mermaid-renderer.ts` | Major  | low  |

#### 2-1: sanitizeSvg()パースエラー時バイパス修正

**問題:**
DOMParserのパースエラー時に元のsvgStringをそのまま返しており、悪意のあるSVGがサニタイズをバイパスする可能性。

**修正方針:**

- パースエラー時は空文字列を返す
- logger.warn()でエラーログ出力

```typescript
// ❌ 現状
} catch {
  return svgString; // バイパスリスク
}

// ✅ 修正後
} catch (error) {
  logger.warn("SVG sanitization failed, returning empty string", error);
  return ""; // 安全なフォールバック
}
```

**Files to Change:**

```
src/domain/markdown/mermaid-renderer.ts      - パースエラー時の戻り値修正
src/domain/markdown/mermaid-renderer.test.ts - パースエラー時のテスト追加
```

---

### Phase 3: 論理整合性修正

| #   | タスク                                                 | 影響ファイル                                      | 重要度 | 工数   |
| --- | ------------------------------------------------------ | ------------------------------------------------- | ------ | ------ |
| 3-1 | check-file-changeハッシュフォールバック修正            | `messaging/handlers/actions/check-file-change.ts` | Major  | medium |
| 3-2 | StateManager.updateHotReload()レースコンディション修正 | `background/state-manager.ts`                     | Major  | medium |

#### 3-1: check-file-changeハッシュフォールバック修正

**問題:**
ハッシュ計算失敗時にコンテンツ全体をそのまま返しており、次回チェック時にhash !==
content（全文）の比較で毎回リロード発生。

**修正方針:**

- フォールバック時も簡易ハッシュ（文字列長+先頭/末尾のチェックサム等）を使う
- または、ハッシュ計算失敗時はエラーを返してHot Reloadを一時スキップ

```typescript
// ✅ 修正案: フォールバック時は簡易ハッシュ
const hash = await computeSHA256(content).catch(() => {
  // SHA-256失敗時の簡易ハッシュ: 長さ + 先頭100文字 + 末尾100文字
  return `fallback:${content.length}:${content.slice(0, 100)}:${
    content.slice(-100)
  }`;
});
```

**Files to Change:**

```
src/messaging/handlers/actions/check-file-change.ts - フォールバックハッシュ実装
src/messaging/handlers/actions/check-file-change.test.ts - フォールバックテスト追加
```

#### 3-2: StateManager.updateHotReload()レースコンディション修正

**問題:**
updateHotReload()でload()→save()で2回、save()内でさらにload()が呼ばれ、並行呼び出し時にレースコンディションで設定が上書きされる可能性。

**修正方針:**

- updateHotReload()内のload()を削除し、save()内のload()→マージ→保存パターンに統一
- save()が既にload()→マージ→保存を行っているので、外側のload()は冗長

```typescript
// ❌ 現状
async updateHotReload(settings: Partial<HotReloadSettings>): Promise<void> {
  const state = await this.load(); // ← 冗長なload
  // ... merge
  await this.save(newState); // save内でもload()する
}

// ✅ 修正後
async updateHotReload(settings: Partial<HotReloadSettings>): Promise<void> {
  await this.save((currentState) => ({
    ...currentState,
    hotReload: { ...currentState.hotReload, ...settings },
  }));
}
```

**注意:**
save()のインターフェースを変更する場合、既存の全save()呼び出しを確認すること。

**Files to Change:**

```
src/background/state-manager.ts      - updateHotReload()の冗長load削除
src/background/state-manager.test.ts - レースコンディションテスト追加
```

---

### Phase 4: コード衛生

| #   | タスク                                     | 影響ファイル                            | 重要度 | 工数   |
| --- | ------------------------------------------ | --------------------------------------- | ------ | ------ |
| 4-1 | domain層console.warn修正                   | `domain/frontmatter/parser.ts`          | Major  | low    |
| 4-2 | MarkdownViewer.tsxのdomain層直接import整理 | `content/components/MarkdownViewer.tsx` | Major  | low    |
| 4-3 | Chrome API型定義の統合検討                 | 複数ファイル                            | Minor  | medium |

#### 4-1: domain層console.warn修正

**問題:**
CLAUDE.mdでconsole.warn禁止・logger使用必須なのに、domain/frontmatter/parser.tsでconsole.warnを直接使用。

**前回対応状況:**
前回のサイクルで「domain層はDEBUG定数制約のため除外、理由コメント追記済み」としたが、今回のレビューでは依然として指摘されている。

**修正方針:**

- console.warnをconsole.errorに変更（セキュリティ警告はconsole.errorが適切）
- またはlogger.warn()に変更（domain層でlogger使用を許可するCLAUDE.md更新）

```typescript
// ❌ 現状
console.warn("Potential prototype pollution detected in frontmatter");

// ✅ 修正後（案A: console.error使用 - CLAUDE.mdルール準拠）
console.error("Potential prototype pollution detected in frontmatter");

// ✅ 修正後（案B: logger.warn使用）
logger.warn("Potential prototype pollution detected in frontmatter");
```

**Files to Change:**

```
src/domain/frontmatter/parser.ts - console.warn修正
```

#### 4-2: MarkdownViewer.tsxのdomain直接import整理

**問題:**
TocService削除に伴い、MarkdownViewer.tsxのdomain層直接呼び出しがADR-007例外として唯一のTOC生成パスになる。ADR-007のコメントを更新して明確化。

**Files to Change:**

```
src/content/components/MarkdownViewer.tsx - ADR-007コメント更新
docs/ARCHITECTURE_DECISIONS.md           - ADR-007にTOC生成の例外を追記
```

#### 4-3: Chrome API型定義の統合検討

**問題:** 7箇所のdeclare const chromeが散在。

**修正方針:**

- shared/types/chrome.d.tsに統合
- 各ファイルのdeclare削除、import不要（ambient declaration）

**Files to Change:**

```
src/shared/types/chrome.d.ts  - 新規作成（統合型定義）
7箇所のファイル              - declare const chrome削除
```

---

### Phase 5: ErrorBoundary改善

| #   | タスク                             | 影響ファイル                           | 重要度 | 工数 |
| --- | ---------------------------------- | -------------------------------------- | ------ | ---- |
| 5-1 | 本番ビルドでスタックトレース非表示 | `content/components/ErrorBoundary.tsx` | Minor  | low  |

#### 5-1: ErrorBoundary本番スタックトレース非表示

**問題:** ErrorBoundaryでスタックトレースが本番UIに表示される。

**修正方針:**

- DEBUGフラグを使って、開発時のみスタックトレースを表示
- 本番ビルドではユーザーフレンドリーなエラーメッセージのみ表示

```typescript
// ✅ 修正後
{
  DEBUG && this.state.error?.stack && (
    <pre class="error-stack">{this.state.error.stack}</pre>
  );
}
```

**Files to Change:**

```
src/content/components/ErrorBoundary.tsx      - DEBUGフラグによる条件分岐
src/content/components/ErrorBoundary.test.tsx - 本番/開発の表示テスト（既存テスト確認）
```

---

## 📊 Progress

| Phase                         | Step                                      | Status |
| ----------------------------- | ----------------------------------------- | ------ |
| **Phase 1: デッドコード整理** |                                           |        |
| 1-1                           | Export関連コード別ブランチ退避            | 🟢     |
| 1-2                           | TocService削除                            | 🟢     |
| **Phase 2: セキュリティ**     |                                           |        |
| 2-1                           | sanitizeSvgパースエラーバイパス修正       | 🟢     |
| **Phase 3: 論理整合性**       |                                           |        |
| 3-1                           | check-file-changeハッシュ失敗時エラー返却 | 🟢     |
| 3-2                           | StateManager レースコンディション         | 🟢     |
| **Phase 4: コード衛生**       |                                           |        |
| 4-1                           | domain層console.warn修正                  | 🟢     |
| 4-2                           | MarkdownViewer ADR-007コメント更新        | 🟢     |
| 4-3                           | Chrome API型定義統合                      | 🟢     |
| **Phase 5: ErrorBoundary**    |                                           |        |
| 5-1                           | 本番スタックトレース非表示                | 🟢     |

**Legend:** ⚪ Pending · 🟡 In Progress · 🟢 Done

---

## 🔒 Security Checklist

- [x] sanitizeSvg()のパースエラー時に安全なフォールバック（空文字列）を返す
- [x] Export関連コード削除後、messaging型/action-registryに残骸がないこと
- [x] ErrorBoundaryのスタックトレースが本番ビルドで非表示になること
- [x] 全ユニットテスト通過（344件）
- [x] 全E2Eテスト通過（84件 + 3 skipped）

---

## ⏱️ 推定工数

| Phase                     | 推定時間    | コミット数 |
| ------------------------- | ----------- | ---------- |
| Phase 1: デッドコード整理 | 1時間       | 1-2        |
| Phase 2: セキュリティ     | 30分        | 1          |
| Phase 3: 論理整合性       | 1.5時間     | 1-2        |
| Phase 4: コード衛生       | 1.5時間     | 1-2        |
| Phase 5: ErrorBoundary    | 30分        | 1          |
| **合計**                  | **約5時間** | **5-8**    |

---

## 📝 実装メモ

### Phase 4-3 Chrome API型定義統合

`src/shared/types/chrome.d.ts` に統合型定義を作成。`deno.json` の
`compilerOptions.types` に登録することで、 各ソースファイルから
`declare const chrome` を完全削除（`/// <reference>` も不要）。
テストモックは既存の `@ts-ignore` / `as Record<string, unknown>`
パターンで型互換性を維持。

### テスト結果推移

- 377 (before) → 342 (Export削除) → 339 (TocService削除) → 344 (sanitizeSvg追加)
  → 344 (fallbackHash削除・SHA-256失敗時はエラー返却に変更)
- E2E: 84 passed + 3 skipped

**Completed:** 全Phase実装・検証完了 🎉
