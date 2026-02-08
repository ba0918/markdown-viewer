# セキュリティ設計

このドキュメントでは、Markdown Viewer
Chrome拡張機能のセキュリティ設計について詳述します。

## 脅威モデル

### 攻撃ベクター

1. **Markdown経由のXSS**
   - 悪意のあるMarkdownファイルによるスクリプトインジェクション
   - `javascript:` プロトコルを使用したリンク
   - イベントハンドラ付き画像タグ

2. **CSS Injection** (対策済み)
   - ユーザーカスタムCSSは提供しない（プリセットテーマのみ）
   - CSS経由のデータ漏洩リスクを完全排除

3. **Path Traversal**
   - ファイルパス操作による意図しないファイルアクセス
   - `file://../../../etc/passwd`等

4. **Prototype Pollution**
   - JSONパース時の`__proto__`汚染
   - オブジェクトマージ処理の脆弱性

## セキュリティ対策

### 1. XSS Protection

#### DOMPurify統合

```typescript
// src/shared/utils/security/sanitizer.ts
import DOMPurify from "dompurify";

export const sanitizeHTML = (html: string): string => {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "p",
      "br",
      "strong",
      "em",
      "u",
      "s",
      "code",
      "pre",
      "a",
      "img",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "ul",
      "ol",
      "li",
      "blockquote",
      "table",
      "thead",
      "tbody",
      "tr",
      "th",
      "td",
      "hr",
      "div",
      "span",
    ],
    ALLOWED_ATTR: [
      "href",
      "src",
      "alt",
      "title",
      "class",
      "id",
      "width",
      "height",
      "align",
      "start",
      "type",
    ],
    ALLOWED_URI_REGEXP:
      /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|data):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    ALLOW_DATA_ATTR: false,
    ALLOW_UNKNOWN_PROTOCOLS: false,
    SAFE_FOR_TEMPLATES: true,
    KEEP_CONTENT: true,
  });
};
```

#### テストケース

```typescript
// src/shared/utils/security/sanitizer.test.ts
import { assertEquals, assertStringIncludes } from "@std/assert";
import { sanitizeHTML } from "./sanitizer.ts";

Deno.test("XSS: javascript: protocol", () => {
  const malicious = "<a href=\"javascript:alert('XSS')\">Click</a>";
  const result = sanitizeHTML(malicious);
  assertEquals(result.includes("javascript:"), false);
});

Deno.test("XSS: onerror attribute", () => {
  const malicious = "<img src=x onerror=\"alert('XSS')\">";
  const result = sanitizeHTML(malicious);
  assertEquals(result.includes("onerror"), false);
});

Deno.test("XSS: onload attribute", () => {
  const malicious = "<body onload=\"alert('XSS')\">";
  const result = sanitizeHTML(malicious);
  assertEquals(result.includes("onload"), false);
});

Deno.test("正常なHTML: リンク", () => {
  const valid = '<a href="https://example.com">Link</a>';
  const result = sanitizeHTML(valid);
  assertStringIncludes(result, "https://example.com");
});

Deno.test("正常なHTML: 画像", () => {
  const valid = '<img src="https://example.com/image.png" alt="Test">';
  const result = sanitizeHTML(valid);
  assertStringIncludes(result, "https://example.com/image.png");
});
```

### 2. Content Security Policy

#### manifest.json設定

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; object-src 'self'"
  }
}
```

#### CSP詳細

- **script-src 'self'**: 拡張機能内のスクリプトのみ許可
- **'wasm-unsafe-eval'**: Mermaid diagram用（WebAssembly使用）
- **style-src 'self' 'unsafe-inline'**: MathJax用（インラインスタイル必要）
- **object-src 'self'**: オブジェクト埋め込み制限

### 3. Path Traversal対策

```typescript
// src/shared/utils/security/path-validator.ts
export const isValidFilePath = (filePath: string): boolean => {
  // file:// プロトコルチェック
  if (!filePath.startsWith("file://")) {
    return false;
  }

  // パストラバーサル検出
  const normalized = new URL(filePath).pathname;
  if (normalized.includes("..")) {
    return false;
  }

  // Markdownファイル拡張子チェック
  const validExtensions = [".md", ".markdown", ".mdown", ".mkd"];
  return validExtensions.some((ext) => normalized.toLowerCase().endsWith(ext));
};
```

### 4. Prototype Pollution対策

```typescript
// src/shared/utils/security/object-utils.ts
export const safeMerge = <T extends object>(
  target: T,
  source: Partial<T>,
): T => {
  const result = { ...target };

  for (const key in source) {
    // __proto__, constructor, prototype は除外
    if (key === "__proto__" || key === "constructor" || key === "prototype") {
      continue;
    }

    if (Object.prototype.hasOwnProperty.call(source, key)) {
      result[key] = source[key]!;
    }
  }

  return result;
};
```

## Permissions設計

### 必要最小限の権限

```json
{
  "permissions": [
    "storage", // 設定保存
    "activeTab" // 現在のタブのみアクセス
  ],
  "host_permissions": [
    "file:///*" // ローカルファイルアクセス（ユーザー明示許可必要）
  ]
}
```

### 権限リクエストフロー

1. 初回起動時に権限リクエスト
2. ユーザーが明示的に許可
3. 拒否された場合は機能制限モード
4. 設定画面から再リクエスト可能

## セキュリティテスト

### ユニットテスト

```bash
# セキュリティ関連テスト実行
deno test src/shared/utils/security/
```

### E2Eセキュリティテスト

```typescript
// e2e/security.spec.ts
import { expect, test } from "@playwright/test";

test("XSS攻撃の防御", async ({ page }) => {
  // 悪意のあるMarkdownファイル
  const xssPayload = `
# Test
[Click me](javascript:alert('XSS'))
<img src=x onerror="alert('XSS')">
<script>alert('XSS')</script>
  `;

  // アラートダイアログが表示されないことを確認
  let dialogAppeared = false;
  page.on("dialog", () => {
    dialogAppeared = true;
  });

  await page.goto(`data:text/markdown,${encodeURIComponent(xssPayload)}`);
  await page.waitForTimeout(1000);

  expect(dialogAppeared).toBe(false);
});

test("安全なリンクは保持される", async ({ page }) => {
  const safeMarkdown = "[Example](https://example.com)";
  await page.goto(`data:text/markdown,${encodeURIComponent(safeMarkdown)}`);

  const link = await page.locator('a[href="https://example.com"]');
  await expect(link).toBeVisible();
});
```

## セキュリティチェックリスト

実装時に以下を確認：

- [ ] 全てのMarkdown描画でDOMPurify使用
- [ ] `javascript:` プロトコル完全ブロック
- [ ] イベントハンドラ属性除去
- [ ] CSP設定が適切
- [ ] Permissions最小化
- [ ] ユーザー入力の検証
- [ ] Path Traversal対策実装
- [ ] Prototype Pollution対策実装
- [ ] セキュリティテスト実装
- [ ] E2Eセキュリティテスト実装

## 脆弱性報告

セキュリティ上の問題を発見した場合は、GitHubのSecurity
Advisoriesから報告してください。

## 参考資料

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Chrome Extension Security Best Practices](https://developer.chrome.com/docs/extensions/mv3/security/)
- [DOMPurify Documentation](https://github.com/cure53/DOMPurify)
- [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
