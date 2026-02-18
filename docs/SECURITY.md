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

#### xss (js-xss)統合

```typescript
// src/domain/markdown/sanitizer.ts
import xss from "xss";

export const sanitizeHTML = (html: string): string => {
  return xss(html, {
    whiteList: {
      "p": ["class", "id"],
      "br": [],
      "strong": ["class", "id"],
      "em": ["class", "id"],
      "u": ["class", "id"],
      "s": ["class", "id"],
      "code": ["class", "id"],
      "pre": ["class", "id"],
      "a": ["href", "title", "class", "id"],
      "img": ["src", "alt", "title", "class", "id"],
      "h1": ["class", "id"],
      "h2": ["class", "id"],
      "h3": ["class", "id"],
      "h4": ["class", "id"],
      "h5": ["class", "id"],
      "h6": ["class", "id"],
      "ul": ["class", "id"],
      "ol": ["class", "id"],
      "li": ["class", "id"],
      "blockquote": ["class", "id"],
      "table": ["class", "id"],
      "thead": ["class", "id"],
      "tbody": ["class", "id"],
      "tr": ["class", "id"],
      "th": ["class", "id"],
      "td": ["class", "id"],
      "hr": ["class", "id"],
      "div": ["class", "id"],
      "span": ["class", "id"],
    },
    stripIgnoreTag: true,
    stripIgnoreTagBody: ["script", "style"],
  });
};
```

#### テストケース

```typescript
// src/domain/markdown/sanitizer.test.ts
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
    "extension_pages": "script-src 'self'; style-src 'self'; object-src 'none'"
  }
}
```

#### CSP詳細

- **script-src 'self'**: 拡張機能内のスクリプトのみ許可（`eval()`, `Function()`,
  WebAssembly含め外部コード実行を全てブロック）
- **style-src 'self'**: 外部CSSファイルのみ許可（インラインstyleタグ禁止）
- **object-src 'none'**: object/embed/appletを完全ブロック（使用箇所なし）

#### CSP適用スコープ

extension_pages CSPは以下にのみ適用される：

- **background.js** (Service Worker)
- **popup.html** (ポップアップUI)
- **options.html** (設定ページ)

Content Scripts（Markdownレンダリング）はホストページのCSPに従うため、
file://プロトコルではCSP制限なし。Mermaid(WebAssembly)やMathJax(インラインスタイル)は
Content Script内で実行されるため、extension_pages CSPの影響を受けない。

### 3. URL検証とオリジンバリデーション

```typescript
// src/shared/utils/url-validator.ts
// ローカルURL判定 - Hot Reloadの対象をローカルファイル/localhostに制限
export const isLocalUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "file:") return true;
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      const hostname = parsed.hostname;
      return hostname === "localhost" ||
        hostname === "127.0.0.1" ||
        hostname === "[::1]" ||
        hostname === "::1";
    }
    return false;
  } catch {
    return false;
  }
};
```

```typescript
// src/shared/utils/origin-validator.ts
// リモートURL設定でのカスタムオリジン入力値を検証
// セキュリティ上、httpsのみ許可しワイルドカードパターンを要求
export const validateOrigin = (
  origin: string,
  existingOrigins: string[] = [],
): ValidationResult => {
  if (!origin.trim()) return { valid: false, error: "Origin cannot be empty" };
  if (!origin.startsWith("https://")) {
    return { valid: false, error: "Origin must start with https://" };
  }
  if (!origin.endsWith("/*")) {
    return { valid: false, error: "Origin must end with /*" };
  }
  if (existingOrigins.includes(origin)) {
    return { valid: false, error: "This origin is already added" };
  }
  return { valid: true };
};
```

### 4. Prototype Pollution対策（Frontmatter）

```typescript
// src/domain/frontmatter/parser.ts
// YAML Frontmatterパース時にプロトタイプ汚染をチェック
let data = parse(yamlString) || {};

if (data && typeof data === "object") {
  if (
    Object.prototype.hasOwnProperty.call(data, "__proto__") ||
    Object.prototype.hasOwnProperty.call(data, "constructor") ||
    Object.prototype.hasOwnProperty.call(data, "prototype")
  ) {
    console.error(
      "Frontmatter: Prototype pollution attempt detected, ignoring data",
    );
    data = {};
  }
}
```

## Permissions設計

### 必要最小限の権限

```json
{
  "permissions": [
    "storage", // 設定保存
    "activeTab", // 現在のタブのみアクセス
    "scripting" // Content Script動的注入（リモートURL対応）
  ],
  "host_permissions": [
    "file:///*" // ローカルファイルアクセス（ユーザー明示許可必要）
  ],
  "optional_host_permissions": [
    "https://*/*" // リモートURL対応（ユーザーが明示的に許可した場合のみ）
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
deno task test  # sanitizer, url-validator, origin-validator等を含む全テスト
```

### E2Eセキュリティテスト

```typescript
// tests/e2e/security.spec.ts
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

- [ ] 全てのMarkdown描画でxss (js-xss)使用
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
- [js-xss Documentation](https://github.com/leizongmin/js-xss)
- [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
