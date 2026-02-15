# Export HTMLスタンドアロン改善

**Cycle ID:** `20260216025915` **Started:** 2026-02-16 02:59:15 **Completed:**
2026-02-16 **Status:** 🟢 Completed

---

## 📝 What & Why

Export HTMLが「見た目通りに出力」されない問題を修正。
現在、Mermaid/MathJax/ローカル画像がExport HTMLに含まれず、
ダウンロードしたHTMLを開くとダイアグラムが生コード、数式が未レンダリング、画像がリンク切れになる。

## 🎯 Goals

- Mermaid SVGがExport HTMLに含まれる
- MathJax SVGがExport HTMLに含まれる
- ローカル画像がBase64 Data URLとして埋め込まれる
- リモート画像はURLのまま保持（CORS/権限の問題で対応しない）

## 📐 Design

### 根本原因

`ExportMenuItem` が受け取る `html` は `result.html`（services層のもの）。
これはMermaid/MathJax変換 **前** のHTML。

```
MarkdownService.render() → result.html (Mermaid/MathJax変換前)
    ↓
MarkdownViewer.tsx: dangerouslySetInnerHTML={{ __html: result.html }}
    ↓ useEffect内で
    ↓ renderMath() → DOM上でMathJax SVGに変換
    ↓ renderMermaid() → DOM上でMermaid SVGに変換
    ↓
ExportMenuItem: html={result.html} ← ❌ 変換前のHTMLを使っている！
```

### 解決アプローチ

Export時に `result.html` ではなく、**DOM上のレンダリング済み `innerHTML`**
を取得する。 さらにローカル画像をBase64に変換してから送信する。

### 実装した変更

```
src/
  content/components/MarkdownViewer.tsx
    - getRenderedHTML() コールバック追加（containerRef.cloneNode + UI要素クリーンアップ）
    - ExportMenuItem に getRenderedHTML を渡す（html propsを置き換え）

  ui-components/markdown/DocumentHeaderMenu/ExportMenuItem.tsx
    - props: html → getRenderedHTML に変更
    - convertLocalImagesToBase64() 関数追加
    - export時にDOM HTML取得 → 画像Base64変換 → Background Scriptに送信

  domain/export/html-exporter.test.ts
    - Mermaid SVG埋め込みテスト追加
    - MathJax SVG埋め込みテスト追加
    - Base64画像埋め込みテスト追加
    - Mermaid + MathJax + Base64画像の複合テスト追加

  tests/e2e/html-export.spec.ts
    - Mermaid SVGがDOMに含まれることの検証
    - MathJax SVGがDOMに含まれることの検証
    - コピーボタンがクリーンアップされることの検証
    - Mermaid/MathJaxページでのエクスポートエラーなし検証
```

### Key Points

- **DOM innerHTML方式**: Export時にcontainerRefの `innerHTML` を取得することで、
  Mermaid SVGとMathJax SVGが自動的に含まれる（一石二鳥）
- **ローカル画像Base64変換**: DOMParser + `<img src>`
  走査、相対パス/file://の画像を `fetch()` → `Blob` → `FileReader` → Data
  URLに変換
- **リモート画像は対応しない**: CORS/権限の問題。URLのまま保持。
- **MathJax CSS不要**: `<mjx-container>`
  のスタイルはMathJaxがインラインで適用するため追加CSS不要
- **Mermaid SVG CSS不要**: SVGはインラインで生成されるため追加CSS不要
- **コピーボタン除去**: DOMクローン → `.code-block-copy-button` のコンテナを
  `remove()`
- **fileUrlからベースURL算出**: `pageUrl`
  を別propsにせず、`new URL(src, baseUrlDir)` で `fileUrl` から相対パスを解決

## ✅ Tests

- [x] ExportMenuItem: DOM HTMLを使用してexportする
- [x] ExportMenuItem: コピーボタンがexport HTMLに含まれない
- [x] ExportMenuItem: Mermaid SVGがexport HTMLに含まれる
- [x] ExportMenuItem: MathJax SVGがexport HTMLに含まれる
- [x] ExportMenuItem: ローカル画像がBase64 Data URLに変換される
- [x] ExportMenuItem: リモート画像はURLのまま保持される
- [x] html-exporter: Mermaid SVG付きHTMLの生成
- [x] html-exporter: MathJax SVG付きHTMLの生成
- [x] html-exporter: Base64画像付きHTMLの生成
- [x] html-exporter: 複合テスト（Mermaid + MathJax + Base64画像）

## 🔒 Security

- [x] Base64変換はローカル画像のみ（リモートへのfetchは行わない）
- [x] XSSベクターとなるdata: URLは画像のみ許可（sanitizerで制御済み）
- [x] export HTMLにscriptタグが含まれないことを確認

## 📊 Progress

| Step                           | Status |
| ------------------------------ | ------ |
| DOM HTML取得 (Mermaid+MathJax) | 🟢     |
| ローカル画像 Base64 埋め込み   | 🟢     |
| Export HTML テンプレート調整   | 🟢     |
| Tests                          | 🟢     |
| Build & 全テスト検証           | 🟢     |
| Commit                         | 🟢     |

**Legend:** ⚪ Pending · 🟡 In Progress · 🟢 Done

## 📈 Test Results

- **Unit tests:** 243 passed (14 export-related, 4 new)
- **E2E tests:** 88 passed, 6 skipped (5 new export tests)
- **Lint:** 0 errors
- **Build:** Success

---

**Learning:** DOM innerHTML方式は非常にエレガントな解決策。Mermaid SVGとMathJax
SVGを
個別に処理する必要がなく、DOMが持っているレンダリング済みの状態をそのまま取得できる。
コピーボタン等のUI要素はDOMクローン + querySelectorAll + remove()
でクリーンアップ。
