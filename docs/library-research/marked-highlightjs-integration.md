# marked と highlight.js の統合方法（最新版）

**調査日**: 2026-02-08 **調査方法**: Context7 公式ドキュメント
**対象バージョン**:

- marked: ^11.0.0 (Context7 Library ID: `/markedjs/marked`)
- highlight.js: ^11.9.0 (Context7 Library ID: `/highlightjs/highlight.js`)

---

## 1. marked の最新API仕様

### 1.1 カスタムレンダラーの設定方法

marked v11.x では `marked.use()` を使用してカスタムレンダラーを設定します。

```javascript
import { marked } from "marked";

const renderer = {
  // heading, link, code 等のレンダラーをオーバーライド
  code({ text, lang }) {
    const language = lang || "plaintext";
    return `
      <div class="code-block">
        <button class="copy-btn">Copy</button>
        <pre><code class="language-${language}">${text}</code></pre>
      </div>`;
  },
};

marked.use({ renderer });
```

**重要ポイント**:

- `marked.use()` で設定した内容はグローバルに適用される
- カスタムレンダラーは `{ renderer }` オブジェクトとして渡す
- レンダラー関数は `{ text, lang, tokens, depth }` 等のオブジェクトを受け取る

### 1.2 コードブロックのシンタックスハイライト統合方法

**公式推奨**: `marked-highlight` 拡張を使用

```javascript
import { marked } from "marked";
import { markedHighlight } from "marked-highlight";
import hljs from "highlight.js";

marked.use(markedHighlight({
  langPrefix: "hljs language-",
  highlight(code, lang) {
    const language = hljs.getLanguage(lang) ? lang : "plaintext";
    return hljs.highlight(code, { language }).value;
  },
}));
```

**設定項目**:

- `langPrefix`: 生成される `<code>` タグのクラス名プレフィックス
- `highlight`: ハイライト処理を行うコールバック関数
  - `code`: ハイライト対象のコード文字列
  - `lang`: Markdownで指定された言語名（例: `js`, `python`）
  - 返り値: ハイライト済みのHTML文字列

### 1.3 `highlight` オプションの async 対応

marked は **async モード** をサポートしています。

```javascript
import { marked } from "marked";

// async: true を設定すると marked.parse() が Promise を返す
marked.use({
  async: true,
  walkTokens: async (token) => {
    if (token.type === "link") {
      // 非同期処理が可能
      await fetch(token.href);
    }
  },
});

// marked.parse() は Promise を返す
const html = await marked.parse(markdown);
```

**重要ポイント**:

- `async: true` を設定すると `marked.parse()` が Promise を返す
- `walkTokens` 関数で非同期処理が可能になる
- **highlight 関数自体は同期関数を想定** → 非同期処理が必要な場合は `walkTokens`
  で事前処理

### 1.4 最新のAPIで推奨される実装パターン

```javascript
import { marked } from "marked";
import { markedHighlight } from "marked-highlight";
import hljs from "highlight.js";

// グローバル設定
marked.use({
  pedantic: false,
  gfm: true, // GitHub Flavored Markdown
  breaks: true, // 改行を <br> に変換
});

// シンタックスハイライト拡張
marked.use(markedHighlight({
  langPrefix: "hljs language-",
  highlight(code, lang) {
    const language = hljs.getLanguage(lang) ? lang : "plaintext";
    return hljs.highlight(code, { language }).value;
  },
}));

// カスタムレンダラー（必要に応じて）
marked.use({
  renderer: {
    link({ href, title, tokens }) {
      const text = this.parser.parseInline(tokens);
      return `<a href="${href}" target="_blank" rel="noopener">${text}</a>`;
    },
  },
});

// パース実行
const html = marked.parse(markdown);
```

**ベストプラクティス**:

1. **marked.use() でまとめて設定** → グローバル設定として一度だけ呼ぶ
2. **markedHighlight 拡張を使用** → カスタムレンダラーで実装するより安全
3. **複数の拡張を連続して use()** → チェーン可能

---

## 2. highlight.js の最新API仕様

### 2.1 基本的な使い方

#### ブラウザ環境（全ての `<pre><code>` を自動ハイライト）

```html
<!DOCTYPE html>
<html>
  <head>
    <link
      rel="stylesheet"
      href="//cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/default.min.css"
    >
    <script
      src="//cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/highlight.min.js"
    ></script>
    <script>
      hljs.highlightAll();
    </script>
  </head>
  <body>
    <pre>
<code class="language-javascript">
  function greet(name) {
    console.log('Hello, ' + name);
  }
  </code></pre>
  </body>
</html>
```

#### プログラマティックな使用（推奨）

```javascript
import hljs from "highlight.js";

// 特定のコードをハイライト
const result = hljs.highlight(code, { language: "javascript" });
console.log(result.value); // ハイライト済みのHTML文字列
```

### 2.2 言語の自動検出 vs 明示的指定

#### 明示的指定（推奨）

```javascript
import hljs from "highlight.js";

const language = hljs.getLanguage(lang) ? lang : "plaintext";
const result = hljs.highlight(code, { language });
return result.value;
```

**メリット**:

- 高速（言語検出の計算コスト不要）
- 正確（誤検出なし）
- 予測可能（常に期待通りの結果）

#### 自動検出（非推奨 - marked との統合では不要）

```javascript
const result = hljs.highlightAuto(code, ["javascript", "python", "html"]);
console.log(result.language); // 検出された言語
console.log(result.relevance); // 信頼度スコア
console.log(result.value); // ハイライト済みHTML
```

**デメリット**:

- 遅い（全言語を試行）
- 誤検出の可能性
- marked では `lang` パラメータで言語が渡されるため不要

### 2.3 返り値の形式

`hljs.highlight()` の返り値は **オブジェクト** です。

```javascript
const result = hljs.highlight(code, { language: 'javascript' });

// result オブジェクトの構造
{
  language: 'javascript',  // 使用された言語名
  relevance: 10,           // 信頼度スコア
  value: '<span class="hljs-keyword">const</span> ...',  // ハイライト済みHTML
  illegal: false,          // 不正なシンタックスが検出されたか
  top: { ... }             // 言語定義オブジェクト
}
```

**markedHighlight で使用する場合**:

```javascript
highlight(code, lang) {
  const language = hljs.getLanguage(lang) ? lang : 'plaintext';
  return hljs.highlight(code, { language }).value;  // ← .value を返す
}
```

### 2.4 Service Worker 環境での動的 import 対応

**問題点**: highlight.js の全言語をインポートするとバンドルサイズが大きくなる

**解決策**: 必要な言語のみをインポート

```javascript
// 全言語をインポート（非推奨 - バンドルサイズ大）
import hljs from "highlight.js";

// コアのみをインポートして必要な言語を登録（推奨）
import hljs from "highlight.js/lib/core";
import javascript from "highlight.js/lib/languages/javascript";
import python from "highlight.js/lib/languages/python";
import typescript from "highlight.js/lib/languages/typescript";
import html from "highlight.js/lib/languages/xml"; // HTMLはxmlとして提供
import css from "highlight.js/lib/languages/css";
import json from "highlight.js/lib/languages/json";

hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("python", python);
hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("html", html);
hljs.registerLanguage("css", css);
hljs.registerLanguage("json", json);
```

**Service Worker での動的インポート（実験的）**:

```javascript
// 動的インポートで遅延ロード（実行時にロード）
async function loadLanguage(lang) {
  if (!hljs.getLanguage(lang)) {
    try {
      const module = await import(`highlight.js/lib/languages/${lang}`);
      hljs.registerLanguage(lang, module.default);
    } catch (err) {
      console.warn(`Language ${lang} not available`);
    }
  }
}
```

**注意点**:

- Chrome Extension の Service Worker では動的インポートが制限される場合がある
- **推奨**: よく使われる言語を事前に静的インポートしておく

---

## 3. 統合パターン（推奨実装）

### 3.1 基本統合パターン

```javascript
import { marked } from "marked";
import { markedHighlight } from "marked-highlight";
import hljs from "highlight.js";

// markedの設定
marked.use({
  pedantic: false,
  gfm: true,
  breaks: false,
});

// シンタックスハイライトの統合
marked.use(markedHighlight({
  langPrefix: "hljs language-",
  highlight(code, lang) {
    // 言語が指定されているか確認
    const language = hljs.getLanguage(lang) ? lang : "plaintext";
    // ハイライト実行（.value でHTML文字列を取得）
    return hljs.highlight(code, { language }).value;
  },
}));

// Markdownをパース
const html = marked.parse(markdown);
```

### 3.2 エラーハンドリング付き統合パターン

```javascript
marked.use(markedHighlight({
  langPrefix: "hljs language-",
  highlight(code, lang) {
    try {
      // 言語が指定されている場合
      if (lang && hljs.getLanguage(lang)) {
        return hljs.highlight(code, { language: lang }).value;
      }
      // 言語が指定されていない、または未サポートの場合
      return hljs.highlight(code, { language: "plaintext" }).value;
    } catch (err) {
      // ハイライトエラー時はエスケープのみ
      console.error("Syntax highlighting error:", err);
      return code; // エスケープなしで返す（marked側でエスケープされる）
    }
  },
}));
```

### 3.3 Chrome Extension Service Worker 向け最適化パターン

```javascript
// src/domain/markdown/highlighter.ts
import hljs from 'highlight.js/lib/core';

// よく使われる言語のみを登録してバンドルサイズを削減
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import python from 'highlight.js/lib/languages/python';
import xml from 'highlight.js/lib/languages/xml'; // HTML
import css from 'highlight.js/lib/languages/css';
import json from 'highlight.js/lib/languages/json';
import markdown from 'highlight.js/lib/languages/markdown';
import bash from 'highlight.js/lib/languages/bash';

// 言語を登録
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('js', javascript);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('ts', typescript);
hljs.registerLanguage('python', python);
hljs.registerLanguage('py', python);
hljs.registerLanguage('html', xml);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('css', css);
hljs.registerLanguage('json', json);
hljs.registerLanguage('markdown', markdown);
hljs.registerLanguage('md', markdown);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('sh', bash);

/**
 * コードをシンタックスハイライト
 * @param code - ハイライト対象のコード
 * @param lang - 言語名（Markdownで指定された値）
 * @returns ハイライト済みのHTML文字列
 */
export const highlightCode = (code: string, lang: string): string => {
  try {
    const language = hljs.getLanguage(lang) ? lang : 'plaintext';
    return hljs.highlight(code, { language }).value;
  } catch (err) {
    console.error(`Syntax highlighting error for language "${lang}":`, err);
    return code; // エラー時はエスケープなしで返す
  }
};
```

```javascript
// src/domain/markdown/parser.ts
import { marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
import { highlightCode } from './highlighter.ts';

// グローバル設定
marked.use({
  pedantic: false,
  gfm: true,
  breaks: false
});

// シンタックスハイライト統合
marked.use(markedHighlight({
  langPrefix: 'hljs language-',
  highlight: highlightCode
}));

/**
 * MarkdownをHTMLに変換
 * @param markdown - Markdown文字列
 * @returns HTML文字列
 */
export const parseMarkdown = (markdown: string): string => {
  return marked.parse(markdown);
};
```

---

## 4. Service Worker 対応の注意点

### 4.1 バンドルサイズの最適化

**問題**: highlight.js
の全言語（190+言語）をインポートすると数MB級のバンドルになる

**解決策**:

1. **コアのみをインポート**: `highlight.js/lib/core`
2. **必要な言語のみを登録**: よく使われる10-15言語に絞る
3. **エイリアス登録**: `js` → `javascript`, `py` → `python` 等

### 4.2 動的インポートの制限

Chrome Extension の Service Worker では以下の制限があります:

- `eval()` 使用不可（CSP違反）
- 動的な `new Function()` 使用不可
- `import()` の動的パス解決が制限される場合がある

**推奨**: 静的インポートで必要な言語を事前登録する

### 4.3 CSSテーマの読み込み

highlight.js のCSSテーマは Content Script または Offscreen Document で読み込む:

```javascript
// content.ts または offscreen.ts
import "highlight.js/styles/github.css";
```

**Service Worker では CSS をインポートできない** → ハイライト処理は Service
Worker で行い、CSSは UI層で読み込む

---

## 5. まとめ

### 推奨実装パターン

1. **marked-highlight 拡張を使用**
   - カスタムレンダラーより安全で簡潔

2. **hljs.getLanguage() で言語チェック**
   - 未サポート言語は `plaintext` にフォールバック

3. **hljs.highlight().value を返す**
   - 返り値はオブジェクトなので `.value` プロパティを取得

4. **Service Worker ではコア + 必要言語のみ**
   - バンドルサイズを最小化

5. **エラーハンドリング必須**
   - ハイライト失敗時はエスケープなしのコードを返す

### 依存関係

```json
{
  "dependencies": {
    "marked": "^11.0.0",
    "marked-highlight": "^2.1.0",
    "highlight.js": "^11.9.0"
  }
}
```

**注意**: `marked-highlight` は別パッケージとして提供されている

---

## 参考リンク

- [marked 公式ドキュメント](https://marked.js.org/)
- [highlight.js 公式ドキュメント](https://highlightjs.org/)
- [marked-highlight GitHub](https://github.com/markedjs/marked-highlight)
- Context7 Library ID: `/markedjs/marked`
- Context7 Library ID: `/highlightjs/highlight.js`
