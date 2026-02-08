# Phase 1 完成プラン - 型エラー修正とビルド成功

## Context

### 現在の状況

Phase 1 (MVP) の実装は**95%完了**している状態です。以下が達成済み：

- ✅ 全レイヤーの実装完了（shared, domain, services, messaging, background,
  content）
- ✅ TDDサイクル遵守（22件のテストケース）
- ✅ セキュリティ実装（DOMPurify, CSP設定）
- ✅ アーキテクチャ準拠（レイヤー分離、依存関係の方向性）
- ✅ テーマCSS実装（light/dark）
- ✅ ビルドスクリプト実装

### 残っている問題

**型エラーが原因でビルドが失敗**しています：

1. **marked v11の`sanitize`オプション削除** -
   `parser.ts`で使用不可能なオプション指定
2. **Chrome API型定義の欠落** -
   `service-worker.ts`でグローバル`chrome`の型が解決されない
3. **不要なasync/await** -
   実際には同期処理なのにasyncが付いている（リンティング警告）

### なぜこの変更が必要か

- **ビルドを成功させる**:
  dist/ディレクトリに成果物を生成し、Chrome拡張として動作可能にする
- **型安全性を確保**: TypeScriptの型チェックを通過させ、実行時エラーを防ぐ
- **コード品質を向上**: 不要なasync/awaitを削除し、コードを明確にする

### 期待される成果

- `deno task build` が成功し、dist/background.js と dist/content.js が生成される
- `deno test` が全てパスする
- Chrome拡張として読み込み、.mdファイルが正しく表示される

---

## 実装原則

### 絶対遵守事項

1. **レイヤー分離を保つ** - 修正時にレイヤー間の境界を侵さない
2. **TDDを維持** - テストが既にあるので、修正後も全てパスすること
3. **最小限の変更** - 問題箇所のみを修正し、動作している部分は触らない
4. **セキュリティを保つ** - DOMPurifyによるサニタイズは絶対に維持

---

## 実装プラン

### Step 1: Chrome API型定義の追加

**問題**: `chrome`グローバルオブジェクトの型が解決されない

**解決策**: `@types/chrome`をdeno.jsonに追加

**作業内容**:

1. `deno.json`のimportsセクションに追加:

```json
"@types/chrome": "npm:@types/chrome@^0.0.254"
```

2. `src/background/service-worker.ts`の先頭に型参照を追加:

```typescript
/// <reference types="@types/chrome" />
```

**検証**:

```bash
deno check src/background/service-worker.ts
```

---

### Step 2: marked v11対応（sanitizeオプション削除）

**問題**: marked v11では`sanitize`オプションが削除された

**解決策**:
`sanitize: false`の行を削除する（DOMPurifyで既に処理しているため問題なし）

**作業内容**:

`src/domain/markdown/parser.ts`を修正:

```typescript
// 変更前
export const parseMarkdown = (markdown: string): string => {
  marked.setOptions({
    gfm: true,
    breaks: true,
    sanitize: false, // ← この行を削除
  });

  return marked.parse(markdown) as string;
};

// 変更後
export const parseMarkdown = (markdown: string): string => {
  marked.setOptions({
    gfm: true,
    breaks: true,
    // sanitizeオプションはmarked v11で削除されたため不要
    // DOMPurifyで別途サニタイズを実行
  });

  return marked.parse(markdown) as string;
};
```

**検証**:

```bash
deno test src/domain/markdown/parser.test.ts
```

---

### Step 3: 不要なasyncの削除（コード品質向上）

**問題**: 実際にはawaitを使わないのにasyncが付いている関数がある

**解決策**: asyncを削除し、Promiseラッパーを外す

**作業内容**:

1. **`src/services/markdown-service.ts`を修正**:

```typescript
// 変更前
export class MarkdownService {
  async render(markdown: string, theme: ThemeData): Promise<string> {
    const parsed = parseMarkdown(markdown);
    const sanitized = sanitizeHTML(parsed);
    return applyTheme(sanitized, theme);
  }
}

// 変更後
export class MarkdownService {
  render(markdown: string, theme: ThemeData): string {
    const parsed = parseMarkdown(markdown);
    const sanitized = sanitizeHTML(parsed);
    return applyTheme(sanitized, theme);
  }
}
```

2. **`src/domain/theme/loader.ts`を修正**:

```typescript
// 変更前
export const loadTheme = async (themeId?: string): Promise<ThemeData> => {
  return THEMES[themeId || "light"] || THEMES.light;
};

// 変更後
export const loadTheme = (themeId?: string): ThemeData => {
  return THEMES[themeId || "light"] || THEMES.light;
};
```

3. **呼び出し側を修正**:

- `src/messaging/handlers/background-handler.ts`:

```typescript
// 変更前
const html = await markdownService.render(
  message.payload.markdown,
  theme,
);

// 変更後
const html = markdownService.render(
  message.payload.markdown,
  theme,
);
```

- `src/services/markdown-service.test.ts`:

```typescript
// 各テストケースでawaitを削除
// 変更前: const html = await service.render(markdown, theme);
// 変更後: const html = service.render(markdown, theme);
```

- `src/domain/theme/loader.test.ts`:

```typescript
// 各テストケースでawaitを削除
// 変更前: const theme = await loadTheme('light');
// 変更後: const theme = loadTheme('light');
```

- `src/domain/theme/applier.test.ts`:

```typescript
// 各テストケースでawaitを削除（loadTheme呼び出し箇所）
```

**注意**:
この変更により、将来非同期処理が必要になった場合は再度asyncに戻す必要があるが、現時点では不要な複雑さを削除することを優先

**検証**:

```bash
deno test
deno lint
```

---

### Step 4: ビルド実行

**作業内容**:

```bash
deno task build
```

**期待される出力**:

```
🔨 Building Markdown Viewer...

📁 Created dist/ directory
📦 Building background script...
✅ background.js built
📦 Building content script...
✅ content.js built

🎉 Build completed successfully!
```

**確認**:

```bash
ls -la dist/
# 期待: background.js, background.js.map, content.js, content.js.map
```

---

### Step 5: 全テスト実行

**作業内容**:

```bash
deno task test
```

**期待される結果**:

- 全22件のテストケースがパス
- 型エラーなし
- 実行時エラーなし

---

### Step 6: Chrome拡張として動作確認

**作業内容**:

1. **テストMarkdownファイル作成**:

````bash
cat > /tmp/test.md <<'EOF'
# Test Markdown

This is **bold** and *italic*.

## Code Block
```javascript
console.log('Hello, world!');
````

## Table

| Name  | Age |
| ----- | --- |
| Alice | 30  |
| Bob   | 25  |

## XSS Test (should be blocked)

<script>alert('XSS')</script>

[Click me](javascript:alert('XSS'))
<img src="x" onerror="alert('XSS')"> EOF

````
2. **Chrome拡張として読み込み**:
   - chrome://extensions/ を開く
   - 「デベロッパーモード」有効化
   - 「パッケージ化されていない拡張機能を読み込む」
   - プロジェクトルートディレクトリ `/home/mizumi/develop/ba-markdown-viewer` を選択

3. **テストファイルを開く**:
   - Chromeで `file:///tmp/test.md` を開く

4. **確認項目**:
   - ✅ Markdownが正しくHTMLに変換されて表示される
   - ✅ テーマ（light）が適用されている
   - ✅ XSS攻撃（script, javascript:, onerror）が全てブロックされる
   - ✅ テーブルが正しく描画される
   - ✅ コードブロックが正しく描画される

5. **DevToolsで確認**:
   - Console タブでエラーが出ていないか確認
   - Elements タブで `<style>` と `<div class="markdown-body theme-light">` が存在するか確認

---

## Critical Files

今回の修正で変更するファイル：

1. **`deno.json`**
   - Chrome API型定義の追加
   - プロジェクト設定の中心

2. **`src/domain/markdown/parser.ts`**
   - marked v11対応
   - セキュリティの要（サニタイズはDOMPurifyで実施）

3. **`src/services/markdown-service.ts`**
   - async削除
   - ビジネスフローの中核

4. **`src/domain/theme/loader.ts`**
   - async削除
   - テーマ読み込み

5. **`src/messaging/handlers/background-handler.ts`**
   - await削除
   - ルーティング層

6. **`src/background/service-worker.ts`**
   - Chrome API型参照追加
   - Service Worker層

7. **テストファイル群**:
   - `src/services/markdown-service.test.ts`
   - `src/domain/theme/loader.test.ts`
   - `src/domain/theme/applier.test.ts`

---

## 変更の影響範囲

### 影響あり

- ✅ `markdown-service.ts` の呼び出し元（background-handler.ts）
- ✅ `loadTheme()` の呼び出し元（テストファイル）
- ✅ テストファイルでのawait削除

### 影響なし

- ✅ domain/markdown/sanitizer.ts（変更不要、DOMPurifyは既に正しく実装済み）
- ✅ content層（messaging経由なので間接的な影響のみ）
- ✅ UI層（ErrorBoundary, MarkdownViewer）
- ✅ CSS（変更不要）

---

## 検証方法（Phase 1完了確認）

### 1. 型チェック
```bash
deno check src/**/*.ts
# 期待: エラーなし
````

### 2. リンティング

```bash
deno lint
# 期待: エラーなし（または既知の軽微な警告のみ）
```

### 3. テスト実行

```bash
deno task test
# 期待: 全22件パス
```

### 4. ビルド実行

```bash
deno task build
# 期待: dist/background.js, dist/content.js 生成
```

### 5. ファイルサイズ確認

```bash
ls -lh dist/
# 期待: background.js と content.js が数十〜数百KB程度
```

### 6. Chrome拡張動作確認

- テストMarkdownファイルが正しく表示される
- XSS攻撃がブロックされる
- DevToolsにエラーが出ない

---

## 成功基準

Phase 1完了と判断できる条件：

- ✅ 型チェックがパスする（`deno check`）
- ✅ 全テストがパスする（`deno test`）
- ✅ ビルドが成功する（`deno task build`）
- ✅ Chrome拡張として読み込める
- ✅ .mdファイルがブラウザで正しく表示される
- ✅ XSS攻撃が全てブロックされる
- ✅ テーマ（light/dark）が適用される

---

## 実装時の注意事項

### async/await削除時の注意

- **将来の拡張性**: 現時点では同期処理だが、将来的にChrome Storage
  APIを使う場合は再度asyncに戻す必要がある
- **テストの一貫性**: テストファイルでもawaitを削除し、同期テストに変更
- **エラーハンドリング**: try-catchは引き続き使用（同期例外のキャッチ）

### marked v11対応

- `sanitize`オプションは完全に削除された（後方互換性なし）
- DOMPurifyで別途サニタイズしているため、セキュリティ上の問題はなし
- markedのドキュメント: https://marked.js.org/

### Chrome API型定義

- `@types/chrome`はnpm経由で提供
- Service Workerでのみ使用（content scriptは不要）
- `/// <reference types="..." />` はファイル先頭に記述

---

## トラブルシューティング

### ビルドエラーが出る場合

1. `deno cache --reload src/background/service-worker.ts src/content/index.ts`
2. `rm -rf dist/` してから再ビルド
3. esbuildのバージョン確認（0.19.0以上）

### テストが失敗する場合

1. `deno test --watch` で変更を監視
2. 個別ファイルでテスト: `deno test src/domain/markdown/parser.test.ts`
3. カバレッジ確認: `deno test --coverage=coverage`

### Chrome拡張が読み込めない場合

1. `manifest.json`の構文確認: `cat manifest.json | jq .`
2. distディレクトリ内のファイル確認: `ls -la dist/`
3. Chromeのエラーログ確認: chrome://extensions/ → 「エラー」ボタン

---

## Phase 2への準備

Phase 1完了後、以下の実装に進む予定：

- **Settings UI**: popup.html, options.html
- **Hot Reload**: ファイル監視機能
- **Theme管理**: Chrome Storage API統合
- **E2Eテスト**: Playwright実装

---

このプランにより、Phase
1が完全に完了し、Chrome拡張としてMarkdownファイルを安全に表示できる状態になります。
