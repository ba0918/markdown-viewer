# CSS Build System Refactoring

**Cycle ID**: 20260209024545 **Type**: Refactoring **Priority**: High
**Started**: 2026-02-09 02:45:45

## Overview

### Goal

**全CSSをPostCSS化**し、ビルドシステムを堅牢にして将来のバグを防ぐ（段階的移行）。

### Background

**現在の問題**:

- ToC CSSが単一ファイル（~725行）で、ベーススタイルとテーマ変数が混在
- ビルドスクリプトが行数ハードコード + 括弧カウントで脆弱
- **CSS変数の順序問題**:
  テーマ変数がベーススタイルより後に配置されてフォールバック値が使われる
- **フォールバック値は邪悪**:
  不具合の発覚を遅らせる毒であり、完全排除すべき（崩れて気づくほうがマシ）
- ダークテーマでホバー時に色が暗くなるバグが発生

**目指す姿**:

- **PostCSS統合**: ToC CSSを皮切りに、全CSSをPostCSS + Lightning
  CSSで処理（段階的移行）
- **@import + @layer併用**: 明示的な順序保証と優先順位制御
- **フォールバック完全排除**: CSS変数が未定義なら崩れて即座に発覚する設計
- **Fail-fast**: エラーは早期発見、品質を徹底保証
- 将来のCSS追加・変更に強い設計

## Architecture Design

### Design Decision: CSS集約アーキテクチャ

**方針**: 全CSSを `src/styles/`
に集約し、エントリーポイントから明示的に読み込む。

**理由**:

1. ビルドシステムの堅牢性（Fail-fast実現）
2. CSS変数順序問題の根本解決（一箇所で管理）
3. @layer戦略の実行可能性（優先順位を明確に制御）
4. テーマ変数の全コンポーネント共有
5. PostCSS + Lightning CSSによるツール駆動ビルドと相性が良い

**co-location原則について**: styled-componentやinline
styleを使わないビルドシステムでは、CSS集約が自然。グローバルCSSを扱う場合、エントリーポイントでの読み込み順序制御が本質的に重要。

### Current Structure (Before)

```
src/
  ui-components/
    markdown/
      TableOfContents/
        toc.css                    # 725行: ベーススタイル + 全テーマ変数が混在
      DocumentHeader/
        document-header.css        # コンポーネント固有CSS
      RawTextView/
        raw-text-view.css          # コンポーネント固有CSS
```

### Target Structure (After)

```
src/
  styles/
    entry-points/
      content.css                  # Content Script用エントリーポイント
    base/
      reset.css                    # CSS Reset
      variables.css                # グローバル変数
      typography.css               # タイポグラフィ
    components/
      toc/
        base.css                   # ToCベーススタイル（~437行）
      document-header/
        base.css                   # DocumentHeaderスタイル
      raw-text-view/
        base.css                   # RawTextViewスタイル
    themes/
      light.css                    # Lightテーマ変数（全コンポーネント共通）
      dark.css                     # Darkテーマ変数
      github.css                   # GitHubテーマ変数
      minimal.css                  # Minimalテーマ変数
      solarized-light.css
      solarized-dark.css
```

**テーマの配置理由**:
テーマは全コンポーネントに適用される概念であり、特定のコンポーネント（ToC）に紐づくものではない。`src/styles/themes/`
に配置することで、テーマの適用範囲が明確になる。

### Build Flow (After)

```
1. エントリーポイント (content.css)
   ↓ @layer定義 + @import
2. PostCSS + postcss-import
   ↓ @import解決、順序保証
3. Lightning CSS
   ↓ minify + optimize
4. テーマごとの最終CSS生成
   ├─ light.css (@layer順序: reset → base → components)
   ├─ dark.css  (@layer順序: reset → base → components)
   └─ ...
```

### CSS Layers Strategy

```css
/* content.css */
@layer reset, base, components, utilities;

@import "./base/reset.css" layer(reset);
@import "./base/variables.css" layer(base);
@import "./themes/light.css" layer(base); /* テーマごとに動的切り替え */
@import "./components/toc/base.css" layer(components);
@import "./components/document-header/base.css" layer(components);
```

**優先順位**: reset < base < components < utilities

## Implementation Steps

### Step 1: CSS集約ディレクトリ構造作成

**Affected Files**:

- `src/styles/` (新規ディレクトリ構造)

**Tasks**:

1. `src/styles/entry-points/` ディレクトリ作成
2. `src/styles/base/` ディレクトリ作成
3. `src/styles/components/toc/` ディレクトリ作成
4. `src/styles/components/document-header/` ディレクトリ作成
5. `src/styles/components/raw-text-view/` ディレクトリ作成
6. `src/styles/themes/` ディレクトリ作成（全コンポーネント共通テーマ）

### Step 2: 既存CSSの分析と抽出

**Affected Files**:

- `src/ui-components/markdown/TableOfContents/toc.css` (読み取り専用)
- `src/ui-components/markdown/DocumentHeader/document-header.css` (読み取り専用)
- `src/ui-components/markdown/RawTextView/raw-text-view.css` (読み取り専用)

**Tasks**:

1. `toc.css` からベーススタイル部分を特定（1-437行目相当）
2. `toc.css` から各テーマ変数ブロックを特定（`.toc-theme-*` クラス）
3. `document-header.css` の構造を分析
4. `raw-text-view.css` の構造を分析
5. 共通テーマ変数の抽出可能性を検討

### Step 3: CSSファイル移行 - ToC & テーマ変数抽出

**Affected Files**:

- `src/styles/components/toc/base.css` (新規作成)
- `src/styles/themes/*.css` (6ファイル新規作成)

**Tasks**:

1. ToCベーススタイルを `src/styles/components/toc/base.css` に移行
   - ⚠️ **セレクタ、プロパティ、値は既存CSSと完全一致させる**
   - ⚠️ **デザインに影響する変更は一切行わない**
2. 各テーマ変数を `src/styles/themes/{theme}.css`
   に分割移行（ToCに限定せず全コンポーネント共通）
   - light.css
   - dark.css
   - github.css
   - minimal.css
   - solarized-light.css
   - solarized-dark.css
   - ⚠️ **CSS変数の値は既存と完全一致させる**
3. CSS変数のフォールバック値を**完全削除**（未定義なら崩れてバグ発覚）
   - ⚠️ **削除はフォールバック構文のみ、変数値自体は変更しない**

### Step 4: CSSファイル移行 - 他コンポーネント

**Affected Files**:

- `src/styles/components/document-header/base.css` (新規作成)
- `src/styles/components/raw-text-view/base.css` (新規作成)

**Tasks**:

1. DocumentHeaderスタイルを `src/styles/components/document-header/base.css`
   に移行
2. RawTextViewスタイルを `src/styles/components/raw-text-view/base.css` に移行
3. 各コンポーネントで使用されるテーマ変数を整理

### Step 5: 他コンポーネントのテーマ変数統合

**Affected Files**:

- `src/styles/themes/*.css` (既存6ファイルに追記)

**Tasks**:

1. DocumentHeader/RawTextViewで使用されるテーマ変数を `src/styles/themes/*.css`
   に統合
2. 全コンポーネントで共通のカラーパレット、フォントサイズ等を定義
3. 各テーマファイルに全コンポーネント用の変数を集約（中程度の粒度）

### Step 6: エントリーポイント作成

**Affected Files**:

- `src/styles/entry-points/content.css` (新規作成)

**Tasks**:

1. `content.css` にエントリーポイント作成
2. @layer定義（reset, base, components, utilities）
3. @importで全CSSを読み込み、順序を明示的に制御

**content.css 構造**:

```css
/**
 * Content Script CSS Entry Point
 * @layer定義で優先順位を明確化
 */

@layer reset, base, components, utilities;

/* Base layer */
@import "../base/reset.css" layer(reset);
@import "../base/variables.css" layer(base);

/* Theme variables (動的に切り替え: ビルドスクリプトで制御) */
@import "../themes/light.css" layer(base);

/* Components layer */
@import "../components/toc/base.css" layer(components);
@import "../components/document-header/base.css" layer(components);
@import "../components/raw-text-view/base.css" layer(components);
```

### Step 7: PostCSS設定追加 & CSS変数検証プラグイン実装

**Affected Files**:

- `postcss.config.js` (新規作成)
- `scripts/postcss-validate-css-variables.ts` (新規作成)

**Tasks**:

1. PostCSS設定ファイル作成
2. postcss-import プラグイン設定（@import解決）
3. **CSS変数検証プラグイン実装**（Fail-fast実現）
4. Lightning CSS integration設定（minify + optimize）

**postcss.config.js**:

```javascript
import validateCssVariables from "./scripts/postcss-validate-css-variables.ts";

export default {
  plugins: {
    "postcss-import": {
      path: ["src/styles"],
    },
    validateCssVariables, // カスタムプラグイン: 未定義CSS変数を検出
    "lightningcss": {
      minify: true,
      targets: {
        chrome: 120,
      },
    },
  },
};
```

**scripts/postcss-validate-css-variables.ts**:

```typescript
/**
 * PostCSS Plugin: CSS変数の未定義エラーを検出
 * フォールバック値のないvar()が未定義変数を参照している場合、ビルドエラーを発生させる
 */
export default function validateCssVariables() {
  return {
    postcssPlugin: "validate-css-variables",
    Once(root, { result }) {
      const defined = new Set<string>();
      const used = new Map<
        string,
        { file: string; line: number; column: number }
      >();

      // 1. 定義された変数を収集
      root.walkDecls((decl) => {
        if (decl.prop.startsWith("--")) {
          defined.add(decl.prop);
        }
      });

      // 2. 使用されている変数を収集（フォールバックなしのみ）
      root.walkDecls((decl) => {
        // var(--name) または var(--name, fallback) をマッチ
        const varRegex = /var\((--[a-zA-Z0-9-_]+)(?:\s*,\s*(.+?))?\)/g;
        let match;

        while ((match = varRegex.exec(decl.value)) !== null) {
          const varName = match[1];
          const hasFallback = match[2] !== undefined;

          // フォールバックがない場合のみチェック対象
          if (!hasFallback) {
            used.set(varName, {
              file: decl.source?.input.file || "unknown",
              line: decl.source?.start?.line || 0,
              column: decl.source?.start?.column || 0,
            });
          }
        }
      });

      // 3. 未定義変数をチェック
      const undefinedVars: string[] = [];
      for (const [varName, location] of used.entries()) {
        if (!defined.has(varName)) {
          undefinedVars.push(
            `${location.file}:${location.line}:${location.column} - Undefined CSS variable: ${varName}`,
          );
        }
      }

      // 4. エラー発生（Fail-fast）
      if (undefinedVars.length > 0) {
        throw new Error(
          `CSS変数の未定義エラーが検出されました:\n${undefinedVars.join("\n")}`,
        );
      }
    },
  };
}

validateCssVariables.postcss = true;
```

### Step 8: ビルドスクリプト完全書き換え

**Affected Files**:

- `scripts/build.ts` (大幅書き換え)

**Tasks**:

1. 手動CSS解析コード**完全削除**（174-224行目）
2. PostCSS + Lightning CSS統合
3. テーマごとのエントリーポイント動的生成
4. **Fail-fast**エラーハンドリング実装

**新ビルドフロー**:

```typescript
import postcss from "postcss";
import postcssImport from "postcss-import";
import { bundleAsync } from "lightningcss";

// 各テーマごとに
for (
  const theme of [
    "light",
    "dark",
    "github",
    "minimal",
    "solarized-light",
    "solarized-dark",
  ]
) {
  // 1. テーマ固有のエントリーポイント生成
  const entryContent = `
    @layer reset, base, components, utilities;

    @import '../base/reset.css' layer(reset);
    @import '../base/variables.css' layer(base);
    @import '../themes/${theme}.css' layer(base);
    @import '../components/toc/base.css' layer(components);
    @import '../components/document-header/base.css' layer(components);
    @import '../components/raw-text-view/base.css' layer(components);
  `;

  // 2. PostCSS処理（@import解決）
  const result = await postcss([postcssImport({ path: ["src/styles"] })])
    .process(entryContent, { from: "src/styles/entry-points/content.css" });

  // 3. Lightning CSS処理（minify + optimize）
  const bundled = await bundleAsync({
    filename: `content-${theme}.css`,
    code: Buffer.from(result.css),
    minify: true,
    targets: { chrome: 120 },
  });

  // 4. 最終CSS出力
  await Deno.writeTextFile(
    `dist/content/styles/themes/${theme}.css`,
    bundled.code.toString(),
  );

  console.log(`✅ Built: ${theme}.css`);
}
```

### Step 9: ビルドテスト & 検証

**Affected Files**:

- `dist/content/styles/themes/*.css` (出力確認)

**Tasks**:

1. `deno task build` 実行
2. 生成されたCSSファイル検証
   - @layer順序が正しいか（reset → base → components）
   - テーマ変数がベーススタイルより前に配置されているか
   - CSS変数が正しく解決されているか（フォールバック値が使われていないか）
   - ファイルサイズが妥当か
3. 拡張機能リロードして動作確認
   - ダークテーマのホバー色が明るくなるか
   - 全6テーマで正常動作するか
4. CSS未定義エラーの検証（フォールバック削除によりバグが即座に発覚するか）

### Step 10: 旧CSSファイル削除 & クリーンアップ（最終ステップ）

⚠️ **重要**: このステップは新システムが完全に動作確認できてから実行

**Affected Files**:

- `src/ui-components/markdown/TableOfContents/toc.css` (削除)
- `src/ui-components/markdown/DocumentHeader/document-header.css` (削除)
- `src/ui-components/markdown/RawTextView/raw-text-view.css` (削除)
- `scripts/build.ts` (旧ビルドコード削除)

**Tasks**:

1. **最終確認**: 新システムで全テーマが完璧に動作することを確認
2. **E2Eテスト全通過**: 既存E2Eテストが全て通ることを確認
3. 旧ビルドコード (`buildWithManualParsing`) を削除
4. 環境変数フラグ (`USE_NEW_CSS`) を削除し、新システムをデフォルトに
5. 旧CSSファイルを削除
6. コメント整理、エラーメッセージ改善

**削除前の最終チェックリスト**:

- [ ] 新システムで `deno task build` が成功
- [ ] 全6テーマで拡張機能が正常動作
- [ ] E2Eテスト全通過
- [ ] Visual Tests完了（ビフォーアフター比較で差異なし）
- [ ] 1週間以上、新システムで運用して問題なし

## Test List

### Build Tests (Fail-fast検証)

- [ ] CSS集約後もビルドが成功する
- [ ] 全6テーマのCSSが正しく生成される
- [ ] @layer順序が正しい（reset → base → components → utilities）
- [ ] テーマ変数がベーススタイルより前に配置される
- [ ] **CSS変数のフォールバック値が完全削除されている**（未定義ならビルドエラー
      or 崩れて発覚）
- [ ] PostCSS + Lightning
      CSSのエラーハンドリングが機能する（不正なCSS構文でビルド失敗）

### Visual Tests (Manual) - デザイン不変の検証

**⚠️ CRITICAL**: リファクタリング前後で**ピクセル単位で同一**であることを確認

- [ ] Darkテーマ: ToCホバー時に明るくなる（既存と同じ色）
- [ ] Lightテーマ: ToCホバー時に適切な色になる（既存と同じ色）
- [ ] 全6テーマで ToC が正常表示される（既存と完全一致）
- [ ] ToC機能（折りたたみ、リサイズ等）が動作する
- [ ] DocumentHeaderが正常表示される（既存と完全一致）
- [ ] RawTextViewが正常表示される（既存と完全一致）
- [ ] **ビフォーアフター比較**: スクリーンショット撮影して目視確認（全6テーマ）
- [ ] **CSS出力比較**: 生成されたCSSが既存CSSと同等の視覚結果を生む

### E2E Tests (Existing)

- [ ] 既存E2Eテスト全通過（47テスト中46通過維持）

### Regression Tests (CSS未定義検証)

- [ ] CSS変数が未定義の場合、スタイルが崩れて即座に発覚する（フォールバック削除の検証）

## Security Checklist

- [x] CSS injection攻撃: N/A (ビルド時処理のみ、ユーザー入力なし)
- [x] Path traversal: N/A (ファイルパスはハードコード)
- [x] XSS: N/A (CSS生成のみ、HTML/JS影響なし)

## Dependencies

### New Dependencies

- `postcss` (v8.5.6) - already installed
- `postcss-import` (v16.1.1) - already installed
- `lightningcss` (v1.31.1) - already installed

### No New Chrome API Usage

This refactoring doesn't use any new Chrome APIs.

## Migration Strategy: Zero-Risk Approach

### 安全な移行手順

**方針**: 既存CSSを残したまま、新しい `src/styles/`
を構築し、ビルドスクリプトで切り替え可能にする。

**手順**:

1. 既存CSS (`src/ui-components/`) は**一切触らない**（削除もしない）
2. 新しいCSS構造 (`src/styles/`) を並行して構築
3. ビルドスクリプトにフラグを追加し、新旧システムを切り替え可能に
4. 新システムで動作確認完了後、既存CSSを削除

**ビルドスクリプトの切り替え実装**:

```typescript
// scripts/build.ts

// フラグで新旧CSS build systemを切り替え
const USE_NEW_CSS_SYSTEM = Deno.env.get("USE_NEW_CSS") === "true";

if (USE_NEW_CSS_SYSTEM) {
  // 新: PostCSS + Lightning CSS ビルド
  await buildWithPostCSS();
} else {
  // 旧: 手動CSS解析ビルド（既存コード）
  await buildWithManualParsing();
}
```

**メリット**:

- ✅ いつでも旧システムに即座に戻せる
- ✅ 新旧CSSの出力を並行比較可能
- ✅ ロールバックが一瞬（環境変数変更のみ）
- ✅ 既存CSSを壊すリスクゼロ

## Rollback Plan

If issues occur:

1. **即座のロールバック**: `USE_NEW_CSS=false deno task build`
   で旧システムに戻す
2. **Git revert**: 必要に応じてコミット前に戻す
3. **Build validation**: 新旧両システムでビルドし、CSS出力を比較
4. **既存CSS保持**: Step 10（旧CSS削除）まで既存CSSは削除しない

## Progress Tracking

| Step                                   | Status     | Started | Completed | Notes |
| -------------------------------------- | ---------- | ------- | --------- | ----- |
| 1. CSS集約ディレクトリ構造作成         | ⬜ Pending | -       | -         |       |
| 2. 既存CSSの分析と抽出                 | ⬜ Pending | -       | -         |       |
| 3. CSSファイル移行 - ToC               | ⬜ Pending | -       | -         |       |
| 4. CSSファイル移行 - 他コンポーネント  | ⬜ Pending | -       | -         |       |
| 5. 共通テーマ変数の抽出                | ⬜ Pending | -       | -         |       |
| 6. エントリーポイント作成              | ⬜ Pending | -       | -         |       |
| 7. PostCSS設定 & CSS変数検証プラグイン | ⬜ Pending | -       | -         |       |
| 8. ビルドスクリプト完全書き換え        | ⬜ Pending | -       | -         |       |
| 9. ビルドテスト & 検証                 | ⬜ Pending | -       | -         |       |
| 10. 旧CSSファイル削除 & クリーンアップ | ⬜ Pending | -       | -         |       |

## Notes

- **Breaking Change**: None (内部実装の変更のみ)
- **⚠️ CRITICAL: デザイン・スタイル不変の原則**
  - このリファクタリングは**見た目に一切影響を与えない**
  - 生成されるCSSは既存と**完全に同一の視覚結果**を保証
  - ビルドシステムの変更のみ、デザイン変更は一切行わない
  - ピクセル単位で既存デザインを維持
- **Performance Impact**: Lightning CSS minifyで若干高速化の可能性
- **Architecture Shift**:
  コンポーネント分散CSSからCSS集約アーキテクチャへ（ビルド品質優先）
- **Fallback Elimination**:
  CSS変数のフォールバック値を完全削除（崩れて気づくほうがマシ）
- **Future Work**: Settings UI CSS、他の拡張機能ページも同様に構造化

## Key Principles

1. **デザイン不変**: 見た目に一切影響を与えない（最優先原則）
   - リファクタリング前後で**ピクセル単位で同一**の視覚結果
   - CSS変数の値、セレクタ、プロパティは既存を完全踏襲
   - ビルドシステムの変更のみ、デザイン変更は禁止
2. **Fail-fast**: エラーは早期発見、品質を徹底保証
   - カスタムPostCSS pluginでCSS変数の未定義を**ビルド時に検出**
   - フォールバック値のない `var()` が未定義変数を参照したら即座にビルドエラー
3. **@layer優先**: 明示的な優先順位制御で順序問題を根本解決
4. **フォールバック排除**: 不具合の発覚を遅らせる毒は許さない
   - `var(--color, #fallback)` 形式を完全禁止
   - `var(--color)` のみ許可（未定義ならビルドエラー）
5. **ツール駆動**: 手動パースからPostCSS + Lightning CSSへ
6. **CSS集約**: ビルドシステムと相性の良いアーキテクチャ

## Technical Decisions

### CSS変数検証戦略

**決定**: PostCSS custom pluginで未定義CSS変数を検出（Lightning
CSSにビルトイン機能なし）

**実装方針**:

- フォールバック値なしの `var()` のみをチェック対象
- 定義された変数（`--name: value`）を全て収集
- 使用されている変数（`var(--name)`）と照合
- 未定義があればビルドエラーを発生（Fail-fast）

**検出例**:

```css
/* ✅ OK: 変数が定義されている */
:root {
  --color: red;
}
.foo {
  color: var(--color);
}

/* ❌ NG: 未定義変数（ビルドエラー） */
.bar {
  color: var(--undefined);
}

/* ⚠️ 警告対象外: フォールバックあり（本来は削除すべき） */
.baz {
  color: var(--maybe-undefined, blue);
}
```

---

**Last Updated**: 2026-02-09 04:00:00

## Decision Log

### 2026-02-09 04:00 - CSS変数検証戦略の決定

**質問**: フォールバック削除後、未定義変数のエラーハンドリング戦略は？

**選択肢**:

- A: フォールバック削除のみ（Visual Test依存）
- B: ビルド時にLightning CSSで検出
- C: PostCSS pluginで独自検証

**決定**: C（PostCSS plugin）

**理由**:

- Lightning CSSにCSS変数検証機能が存在しない（Context7調査済み）
- Fail-fast実現のためにビルド時検証が必須
- カスタムプラグインは100行以内で実装可能（コスト許容範囲）
- プロジェクト固有ルール（フォールバック禁止）を強制可能

### 2026-02-09 03:45 - CSS集約とテーマ戦略の決定

**決定事項**:

1. **CSS移行範囲**: 全CSSを一度に移行
2. **テーマ切り替え**: ハイブリッド（全テーマバンドル + @layer優先順位制御）
3. **共通変数粒度**: 中程度（色・フォント・spacing・shadow等）

**理由**: 一貫性のあるアーキテクチャを一度に完成、手戻りなし
