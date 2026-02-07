# mathjax-full パッケージの正しいimport方法

調査日: 2026-02-08

## 概要

`mathjax-full@3.2.2` パッケージのDeno環境での正しいimport方法をまとめたドキュメント。

**重要**: mathjax-fullパッケージは非推奨（deprecated）であり、MathJax v4では`@mathjax/src`に置き換えられています。ただし、v3.2.2は安定版として使用可能。

## パッケージ情報

- **パッケージ名**: mathjax-full
- **バージョン**: 3.2.2
- **ライセンス**: Apache-2.0
- **エントリポイント**: `components/src/node-main/node-main.js`
- **npm URL**: https://www.npmjs.com/package/mathjax-full
- **非推奨警告**: Version 4 replaces this package with the scoped package @mathjax/src

## ディレクトリ構造

```
mathjax-full@3.2.2/
├── package.json
├── LICENSE
├── README.md
├── es5/              # ES5互換版（CommonJS）
├── js/               # ES6版（推奨）
│   ├── mathjax.js         # コアエンジン
│   ├── input/             # 入力処理
│   │   ├── tex/           # TeX入力
│   │   │   ├── tex.js
│   │   │   └── AllPackages.js
│   │   ├── mathml/        # MathML入力
│   │   └── asciimath/     # AsciiMath入力
│   ├── output/            # 出力処理
│   │   ├── svg/           # SVG出力
│   │   │   └── svg.js
│   │   ├── chtml/         # CommonHTML出力
│   │   └── common/        # 共通出力
│   ├── adaptors/          # DOM adaptor
│   │   ├── browserAdaptor.js
│   │   ├── liteAdaptor.js
│   │   └── lite/
│   ├── handlers/          # ハンドラ
│   │   ├── html.js
│   │   └── html/
│   ├── core/              # コアエンジン
│   ├── util/              # ユーティリティ
│   ├── components/        # UIコンポーネント
│   ├── a11y/              # アクセシビリティ
│   └── ui/                # UI機能
├── ts/               # TypeScriptソース
└── components/       # プリビルドコンポーネント
```

## 正しいimportパス

### 1. deno.jsonでのimports設定（推奨）

```json
{
  "imports": {
    "mathjax-full": "npm:mathjax-full@^3.2.2",
    "mathjax-full/": "npm:mathjax-full@^3.2.2/"
  }
}
```

この設定により、以下のようにシンプルにimportできる:

```typescript
import { mathjax } from 'mathjax-full/js/mathjax.js';
import { TeX } from 'mathjax-full/js/input/tex.js';
import { SVG } from 'mathjax-full/js/output/svg.js';
import { browserAdaptor } from 'mathjax-full/js/adaptors/browserAdaptor.js';
import { RegisterHTMLHandler } from 'mathjax-full/js/handlers/html.js';
import { AllPackages } from 'mathjax-full/js/input/tex/AllPackages.js';
```

### 2. 直接npm:を使う方法

deno.jsonのimports設定なしでも動作する:

```typescript
import { mathjax } from 'npm:mathjax-full@3.2.2/js/mathjax.js';
import { TeX } from 'npm:mathjax-full@3.2.2/js/input/tex.js';
import { SVG } from 'npm:mathjax-full@3.2.2/js/output/svg.js';
import { browserAdaptor } from 'npm:mathjax-full@3.2.2/js/adaptors/browserAdaptor.js';
import { RegisterHTMLHandler } from 'npm:mathjax-full@3.2.2/js/handlers/html.js';
import { AllPackages } from 'npm:mathjax-full@3.2.2/js/input/tex/AllPackages.js';
```

## 主要モジュールのexports

### mathjax.js

```typescript
import { mathjax } from 'mathjax-full/js/mathjax.js';

// Exports:
// - version: string
// - handlers: HandlerRegistry
// - document: Function
// - handleRetriesFor: Function
// - retryAfter: Function
// - asyncLoad: Function
```

### input/tex.js

```typescript
import { TeX } from 'mathjax-full/js/input/tex.js';

// Exports:
// - TeX: class (extends AbstractInputJax)
//   - TeX入力プロセッサ
//   - LaTeX/TeX記法のパース・コンパイル
```

### output/svg.js

```typescript
import { SVG, SVGNS, XLINKNS } from 'mathjax-full/js/output/svg.js';

// Exports:
// - SVG: class (extends CommonOutputJax)
//   - SVG出力レンダラー
// - SVGNS: 'http://www.w3.org/2000/svg'
// - XLINKNS: 'http://www.w3.org/1999/xlink'
```

### adaptors/browserAdaptor.js

```typescript
import { browserAdaptor } from 'mathjax-full/js/adaptors/browserAdaptor.js';

// Exports:
// - browserAdaptor: Function
//   - ブラウザDOMアダプタを作成
//   - ブラウザ環境でのDOM操作用
```

### handlers/html.js

```typescript
import { RegisterHTMLHandler } from 'mathjax-full/js/handlers/html.js';

// Exports:
// - RegisterHTMLHandler: Function(adaptor)
//   - HTMLハンドラを登録
//   - adaptorを受け取り、HTMLHandlerインスタンスを返す
```

### input/tex/AllPackages.js

```typescript
import { AllPackages } from 'mathjax-full/js/input/tex/AllPackages.js';

// Exports:
// - AllPackages: Array<string>
//   - 全TeXパッケージ名の配列（30個）
//   - ['base', 'action', 'ams', 'amscd', 'bbox', ...]
```

## Deno環境での使用例

### 基本的なセットアップ

```typescript
import { mathjax } from 'mathjax-full/js/mathjax.js';
import { TeX } from 'mathjax-full/js/input/tex.js';
import { SVG } from 'mathjax-full/js/output/svg.js';
import { browserAdaptor } from 'mathjax-full/js/adaptors/browserAdaptor.js';
import { RegisterHTMLHandler } from 'mathjax-full/js/handlers/html.js';
import { AllPackages } from 'mathjax-full/js/input/tex/AllPackages.js';

// Browser環境での初期化
const adaptor = browserAdaptor();
RegisterHTMLHandler(adaptor);

const tex = new TeX({ packages: AllPackages });
const svg = new SVG({ fontCache: 'local' });

const html = mathjax.document(document, { InputJax: tex, OutputJax: svg });
```

### Node/Deno環境での使用（liteAdaptor）

```typescript
import { mathjax } from 'mathjax-full/js/mathjax.js';
import { TeX } from 'mathjax-full/js/input/tex.js';
import { SVG } from 'mathjax-full/js/output/svg.js';
import { liteAdaptor } from 'mathjax-full/js/adaptors/liteAdaptor.js';
import { RegisterHTMLHandler } from 'mathjax-full/js/handlers/html.js';

// liteAdaptorを使用（ブラウザDOM不要）
const adaptor = liteAdaptor();
RegisterHTMLHandler(adaptor);

const tex = new TeX({ packages: ['base', 'ams'] });
const svg = new SVG({ fontCache: 'local' });

const html = mathjax.document('', { InputJax: tex, OutputJax: svg });
const node = html.convert('E = mc^2', { display: true });
const svgString = adaptor.innerHTML(node);
```

## ESM vs CommonJS

mathjax-fullパッケージは両形式をサポート:

- **ES Modules (推奨)**: `/js/` ディレクトリ
- **CommonJS**: `/es5/` ディレクトリ（非推奨）

Deno環境では **ES Modules (`/js/`)** を使用すること。

package.jsonの仕組み:
- `import` → `/js/` (MJS)
- `require()` → `/es5/` (CJS)

## トラブルシューティング

### エラー: "Could not find a matching package"

```bash
deno install
```

を実行してnode_modulesを生成する。

### TypeScript型定義

mathjax-fullには`.d.ts`ファイルが含まれているため、型推論が効く:

```typescript
// 型が自動的に推論される
import { TeX } from 'mathjax-full/js/input/tex.js';

const tex = new TeX({
  packages: ['base', 'ams']  // TypeScriptが補完してくれる
});
```

## 参考資料

### 公式ドキュメント

- [MathJax Documentation](https://docs.mathjax.org/)
- [mathjax-full npm package](https://www.npmjs.com/package/mathjax-full)
- [MathJax ES6 Modules Guide](https://docs.mathjax.org/en/latest/upgrading/whats-new-4.0/es6-modules.html)
- [Linking to MathJax Directly in Node](https://docs.mathjax.org/en/v4.0/server/direct.html)

### Context7調査結果

- Context7 Library ID: `/mathjax/mathjax-docs`
- 主要な情報源として使用

## 注意事項

1. **mathjax-fullは非推奨**: MathJax v4では`@mathjax/src`を使用することが推奨されているが、v3.2.2は安定版として使用可能。

2. **パス重要**: `/js/` か `/es5/` かでモジュール形式が異なる。Deno環境では必ず `/js/` を使う。

3. **パッケージ依存関係**: 以下のパッケージが自動的にインストールされる
   - esm@^3.2.25
   - mhchemparser@^4.1.0
   - mj-context-menu@^0.6.1
   - speech-rule-engine@^4.0.6

4. **ブラウザ vs サーバー**:
   - ブラウザ: `browserAdaptor`
   - サーバー/Deno: `liteAdaptor`

## まとめ

✅ **推奨設定**:

```json
// deno.json
{
  "imports": {
    "mathjax-full/": "npm:mathjax-full@^3.2.2/"
  }
}
```

✅ **推奨importパターン**:

```typescript
import { mathjax } from 'mathjax-full/js/mathjax.js';
import { TeX } from 'mathjax-full/js/input/tex.js';
import { SVG } from 'mathjax-full/js/output/svg.js';
import { browserAdaptor } from 'mathjax-full/js/adaptors/browserAdaptor.js';
import { RegisterHTMLHandler } from 'mathjax-full/js/handlers/html.js';
import { AllPackages } from 'mathjax-full/js/input/tex/AllPackages.js';
```

このパターンで全てのインポートが正しく動作することを確認済み。
