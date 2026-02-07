# MathJax数式表示機能

**Cycle ID:** `20260208065017`
**Started:** 2026-02-08 06:50:17
**Status:** 🟡 In Progress

---

## 📝 What & Why

Markdown内の数式（LaTeX記法）をMathJaxで美しくレンダリングする機能を追加。Dynamic Importで必要時のみロードし、パフォーマンスを最適化する。

## 🎯 Goals

- **LaTeX数式のレンダリング** - インライン数式 `$...$` とディスプレイ数式 `$$...$$` に対応
- **Dynamic Import実装** - 数式がある場合のみMathJaxをロード（パフォーマンス最適化）
- **非同期レンダリング** - `MathJax.typesetPromise()` で適切に処理
- **エラーハンドリング** - MathJax初期化失敗時のGraceful degradation
- **全テーマ対応** - MathJax出力が全6テーマで適切に表示される

## 📐 Design

### ⚠️ 方針転換（2026-02-08 更新）

**旧方針（❌ 失敗）:**
- CDN版 MathJax (tex-chtml.js) を動的ロード
- CHTML出力でフォントを別ファイルとして読み込み
- **問題:** Content Scriptのコンテキスト分離により `typesetPromise` が定義されない
- **原因:** Chrome拡張のパス制限、フォント動的ロードの失敗

**新方針（✅ 採用）:**
- `mathjax-full` パッケージを使用
- SVG出力でフォント情報をJS埋め込み
- esbuildで完全バンドル
- **利点:** Content Scriptで直接動作、パス解決不要、軽量化（Tree Shaking）

### MathJaxの基本仕様（mathjax-full版）

- **パッケージ**: `mathjax-full` (npm:mathjax-full@^3.2.2)
- **出力形式**: SVG（フォント情報埋め込み）
- **入力形式**: TeX（LaTeX構文）
- **統合方法**: ES Modules import → esbuildバンドル

### レイヤー構成（mathjax-full版）

```
content/components/MarkdownViewer.tsx
  ↓ useEffect でレンダリング
domain/math/
  detector.ts - 数式存在チェック（正規表現）✅
  renderer.ts - mathjax-full を使用したSVGレンダラー（SVG出力）
```

**削除するもの:**
- `loader.ts` - Dynamic Importが不要に（直接importするため）
- `script-loader.ts` - スクリプト動的ロード不要
- ローカルバンドルしたMathJaxファイル（1.7MB）
- manifest.json の web_accessible_resources 設定

### Files to Change（mathjax-full版）

```
📦 依存関係:
deno.json - mathjax-full パッケージ追加

🔧 実装ファイル:
src/domain/math/
  detector.ts - 数式存在チェック（既存コード流用）✅
  renderer.ts - mathjax-full を使用したSVGレンダラー（書き直し）
  renderer.test.ts - テスト更新

src/content/components/
  MarkdownViewer.tsx - useEffect で renderMath() 呼び出し（変更不要）

🧪 テスト:
tests/e2e/fixtures/
  math-test.md - 数式テスト用Markdownファイル

tests/e2e/
  math-rendering.spec.ts - MathJax E2Eテスト

🗑️ 削除するファイル:
src/domain/math/
  loader.ts - Dynamic Import不要
  loader.test.ts

src/shared/utils/
  script-loader.ts - スクリプト動的ロード不要
  script-loader.test.ts

mathjax/ - ローカルバンドルディレクトリ（1.7MB）
```

### Key Points（mathjax-full版）

- **数式検出ロジック**: 正規表現で `$...$` (inline) と `$$...$$` (display) を検出（既存コード流用）
- **SVG出力**: フォント情報をパスデータとしてJS内に埋め込み
- **完全バンドル**: esbuildでTree Shaking、必要な機能のみ含む
- **Content Script直接実行**: chrome-extension:// パス制約を完全回避
- **テーマ対応**: SVGはスタイル内包、必要に応じてコンテナCSSを追加

### mathjax-full実装例

```typescript
// domain/math/renderer.ts
import { mathjax } from 'mathjax-full/js/mathjax.js';
import { TeX } from 'mathjax-full/js/input/tex.js';
import { SVG } from 'mathjax-full/js/output/svg.js';
import { browserAdaptor } from 'mathjax-full/js/adaptors/browserAdaptor.js';
import { RegisterHTMLHandler } from 'mathjax-full/js/handlers/html.js';
import { AllPackages } from 'mathjax-full/js/input/tex/AllPackages.js';

RegisterHTMLHandler(browserAdaptor());

const mathDocument = mathjax.document(document, {
  InputJax: new TeX({
    packages: AllPackages,
    inlineMath: [['$', '$'], ['\\(', '\\)']],
    displayMath: [['$$', '$$'], ['\\[', '\\]']]
  }),
  OutputJax: new SVG({
    fontCache: 'local'
  })
});

export function renderMath(element: HTMLElement) {
  mathDocument.clear();
  mathDocument.findMath({ elements: [element] });
  mathDocument.compile();
  mathDocument.getMetrics();
  mathDocument.typeset();
  mathDocument.updateDocument();
}
```

## ✅ Tests（mathjax-full版）

### Unit Tests

#### domain/math/detector.test.ts（既存テスト流用）
- [x] インライン数式 `$x^2$` を検出
- [x] ディスプレイ数式 `$$\frac{a}{b}$$` を検出
- [x] 数式が存在しない場合は `false` を返す
- [x] エスケープされた `\$` は無視

#### domain/math/renderer.test.ts（更新が必要）
- [ ] `renderMath()` が特定要素をレンダリング
- [ ] インライン数式が `<mjx-container>` に変換される
- [ ] ディスプレイ数式が `<mjx-container>` に変換される
- [ ] SVG要素が生成される
- [ ] 数式が存在しない場合は何もしない

### E2E Tests (math-rendering.spec.ts)

- [ ] インライン数式が正しくレンダリングされる
- [ ] ディスプレイ数式が正しくレンダリングされる
- [ ] 複数の数式が同時にレンダリングされる
- [ ] 数式がない場合はMathJaxがロードされない
- [ ] 全テーマで数式が適切に表示される

## 🔒 Security（mathjax-full版）

- [x] CDN不要：全てバンドルで配信（HTTPS不要）
- [x] CSP対応：`script-src 'self'` で動作（外部スクリプト読み込みなし）
- [ ] XSS対策：ユーザー入力をLaTeXとして直接評価しない（数式検出は正規表現ベース）
- [x] DOMPurifyとの連携：MathJax出力後にサニタイズ不要（SVG出力は安全）

## 📊 Progress（mathjax-full版）

| Step | Status |
|------|--------|
| 方針転換の決定（CDN → mathjax-full） | 🟢 |
| WIPコミットのリセット | ⚪ |
| deno.json に mathjax-full 追加 | ⚪ |
| domain/math/renderer.ts 再実装（SVG版） | ⚪ |
| 不要ファイル削除（loader/script-loader） | ⚪ |
| Unit Tests 更新・実行 | ⚪ |
| E2E Tests 実行 | ⚪ |
| 動作確認（全テーマ） | ⚪ |
| Security Check | ⚪ |
| 正式コミット | ⚪ |

**Legend:** ⚪ Pending · 🟡 In Progress · 🟢 Done · 🔴 Blocked

---

## 🔄 方針転換の経緯

### 旧方針の問題点（CDN版MathJax）

**Problem:** `MathJax.typesetPromise` が定義されない

**Analysis:**
- ✅ MathJaxスクリプトは正常にロードされている (`chrome-extension://*/mathjax/tex-chtml.js`)
- ✅ 設定オブジェクトは `window.MathJax` に適用されている
- ❌ しかし、スクリプト実行後も `typesetPromise` が `undefined` のまま
- ❌ `Object.keys(MathJax)` が4つのみ = 設定オブジェクトのまま、MathJax本体がマージされていない

**Root Cause:**
- Chrome拡張のContent Scriptは隔離されたコンテキストで動作
- CDN版MathJaxは `window.MathJax` へのグローバルマージを前提とした設計
- CHTML出力はフォントファイルを別途ロードするため `chrome-extension://` パス制約に引っかかる

### 新方針の利点（mathjax-full + SVG）

1. **完全バンドル可能** - フォント情報をJSに埋め込み、外部ファイル不要
2. **Content Scriptで直接動作** - ES Modules import でコンテキスト分離問題を回避
3. **パス解決不要** - chrome-extension:// の制約を完全回避
4. **軽量化** - Tree Shakingで必要な機能のみ含む
5. **CSP準拠** - 外部スクリプトロード不要、`script-src 'self'` で動作

---

## 📚 参考資料

- [MathJax Documentation](https://docs.mathjax.org/)
- [mathjax-full on npm](https://www.npmjs.com/package/mathjax-full)
- [LaTeX Math Symbols](https://www.overleaf.com/learn/latex/List_of_Greek_letters_and_math_symbols)
- 参考実装: `.vscode/example/markdown-viewer/content/mathjax.js` (CDN版)
- アドバイス: Geminiからの mathjax-full + SVG 実装ガイド

---

## 🚀 Implementation Steps

1. **WIPコミットをリセット** - 現在の3コミットを取り消し
2. **mathjax-full導入** - deno.json に追加
3. **renderer.ts再実装** - SVG版で書き直し
4. **不要ファイル削除** - loader, script-loader
5. **テスト更新** - renderer.test.ts を mathjax-full に対応
6. **E2Eテスト実行** - 数式レンダリング動作確認
7. **正式コミット** - 完成版をコミット

**Next:** WIPコミットリセット → mathjax-full実装 → テスト通過 → コミット 🚀
