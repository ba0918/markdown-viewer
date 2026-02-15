# Chrome拡張機能における file:// URL 画像アクセスの制限事項

**調査日**: 2026-02-16 **調査背景**: Export HTML機能でローカル画像をBase64 Data
URLに変換してスタンドアロンHTMLに埋め込む試み **結論**: Background Script経由の
fetch()でWindows環境では変換可能だが、WSL2環境では動作しない。環境依存で中途半端な
対応になるため、機能として提供しない判断をした。

---

## 1. 背景

Export HTML機能では、Mermaid SVG・MathJax SVGはDOM
innerHTML方式で正常に埋め込めた。
しかし、ローカル画像（相対パス・`file://`）はエクスポート後のHTMLで表示できなかった。

画像をBase64 Data
URLに変換してHTMLに埋め込めば、スタンドアロンで表示できるはず。
この仮説を検証するため、複数のアプローチを試行した。

## 2. 試行したアプローチと結果

### 2.1 Content Script から fetch() (初期実装)

```typescript
// ExportMenuItem.tsx 内の convertLocalImagesToBase64()
const response = await fetch(absoluteUrl);
const blob = await response.blob();
const reader = new FileReader();
reader.readAsDataURL(blob);
```

**結果: 失敗**

- Content Script (Isolated World) から `file://` URLへの `fetch()`
  はChromeのセキュリティ制限でブロックされる
- エラーは `catch`
  で静かに握りつぶされ、ユーザーからは「画像が出力されない」ように見える
- `manifest.json` の `host_permissions: ["file:///*"]` があっても無効

### 2.2 Canvas API (第2の試行)

```typescript
// MarkdownViewer.tsx の getRenderedHTML() 内
const canvas = document.createElement("canvas");
canvas.width = originalImg.naturalWidth;
canvas.height = originalImg.naturalHeight;
const ctx = canvas.getContext("2d");
ctx.drawImage(originalImg, 0, 0);
const dataUrl = canvas.toDataURL("image/png"); // ← ここで例外
```

**結果: 失敗**

- `canvas.toDataURL()` が **tainted canvas** エラーを投げる
- Chromeは `file://` プロトコルの画像をクロスオリジンとして扱う
- `SecurityError: Failed to execute 'toDataURL' on 'HTMLCanvasElement': Tainted canvases may not be exported`
- ブラウザ上では `<img src="docs/images/demo.png">`
  として正常に表示されているが、Canvasで読み出すことはできない

### 2.3 Background Script (Service Worker) から fetch() (第3の試行)

```typescript
// background-handler.ts
case "FETCH_LOCAL_IMAGE": {
  const response = await fetch(imageUrl);
  const buffer = await response.arrayBuffer();
  const base64 = btoa(binary);
  return { success: true, data: `data:${contentType};base64,${base64}` };
}
```

**結果: Windows環境では成功、WSL2環境では失敗（環境依存）**

- **Windows ローカル (`file:///C:/...`)**: 成功
- **WSL2 (`file://wsl.localhost/...`)**: **完全にブロック**される
  - エラー: `Not allowed to load local resource: file://wsl.localhost/...`
  - `file://wsl.localhost/` はWindowsから見るとUNCパス (`\\wsl.localhost\...`)
    経由。Chromeのセキュリティがより厳しい

### 2.4 まとめ

| アプローチ                | Windows (file:///) | WSL2 (file://wsl.localhost/) | 安定性   |
| ------------------------- | ------------------ | ---------------------------- | -------- |
| Content Script fetch()    | NG                 | NG                           | -        |
| Canvas API toDataURL()    | NG (tainted)       | NG (tainted)                 | -        |
| Background Script fetch() | OK                 | NG                           | 環境依存 |

Background Script経由のfetch()は技術的には機能するが、WSL2環境では
Chromeのセキュリティポリシーによりブロックされる。

## 3. 機能として提供しない判断理由

技術的にはWindows環境で動作するが、以下の理由から機能として提供しないことを決定した。

> **ターゲット層を考えよ**
>
> このツールのターゲットは「エンジニア」、しかもChrome拡張でMarkdownを見ようとする
> 「開発環境にこだわりがあるエンジニア」。彼らの多く（特にWeb系）はWSL2を使っている
> 可能性が非常に高い。つまり「一番使ってほしい層に限って動かない機能」になってしまう。

> **「動かない」より「中途半端」が一番怖い**
>
> - 機能がない場合:
>   「画像埋め込みは非対応か、セキュリティ重視だしな」で納得される
> - 機能があるのに動かない場合:
>   「バグかな？コンソール見よう…CORSエラーか。作りが甘いな」と減点評価
>
> 「セキュリティ重視の堅牢なツール」というブランドイメージを守るためにも、
> 「不安定な機能は入れない（潔く削る）」方が信頼度は上がる。

## 4. 現在の仕様

Export HTMLで出力される画像の状態:

| 画像の種類              | 出力される形式                                  | スタンドアロン表示 |
| ----------------------- | ----------------------------------------------- | ------------------ |
| Mermaid SVG             | インラインSVG (`<div class="mermaid-diagram">`) | OK                 |
| MathJax SVG             | インラインSVG (`<mjx-container>`)               | OK                 |
| リモート画像 (https://) | 元のURL (`<img src="https://...">`)             | 要ネット接続       |
| ローカル画像 (相対パス) | 元のパス (`<img src="docs/...">`)               | NG (パス解決不可)  |

## 5. 将来的な可能性

Chrome拡張のセキュリティモデルが変更されない限り、以下のアプローチも同様に制限される可能性が高い:

- `XMLHttpRequest` (fetch同様のセキュリティ制限)
- `chrome.scripting.executeScript` (Main World実行でもtainted canvasは同じ)
- `Offscreen API` (Offscreen Documentもfetch制限は同様)
- `Native Messaging` (可能だがネイティブアプリのインストールが必要でUX悪い)

もし将来的に画像埋め込みを実現するなら:

- **localhostサーバー経由** (`http://localhost`)
  でMarkdownを表示するケースでは、CORS制限が緩和されて `fetch()` や Canvas API
  が使える可能性がある
- **Windows環境限定** で Background Script fetch()
  を復活させることは技術的に可能（ただし中途半端な対応になるリスクあり）
- `file://` プロトコル + WSL2 の組み合わせは Chrome
  のセキュリティポリシー変更がない限り解決不可能

## 6. コミット履歴

| コミット  | 内容                                                                 |
| --------- | -------------------------------------------------------------------- |
| `ee852d0` | feat: Export HTMLにMermaid SVG・MathJax SVG・Base64画像を埋め込み    |
| `0cd5690` | fix: Export HTML画像変換をfetchからCanvas APIに変更                  |
| `0e24e8e` | fix: Canvas taintedエラー時にBackground Script経由で画像をBase64変換 |
| `227bb72` | revert: Export HTMLからローカル画像Base64変換機能を削除              |

## 7. 教訓

1. **技術的には解決可能**: Background Script経由のfetch()でWindows環境では画像の
   Base64変換に成功した。技術的な敗北ではない
2. **WSL2は特殊**: `file://wsl.localhost/`
   はネットワークパス（UNCパス）として扱われ、通常の `file://` より制限が厳しい
3. **「一部で動く」は「動かない」より質が悪い**:
   ターゲット層（WSL2ユーザー率が高いエンジニア）で動かない機能は、ない方がマシ
4. **中途半端な機能はブランドを傷つける**:
   セキュリティ重視のツールで環境依存の挙動は信頼を損なう
5. **潔く引く判断力**:
   4コミットかけて実装→検証→削除。結果的にコードベースはシンプルになった
