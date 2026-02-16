import { assertEquals, assertStringIncludes } from "@std/assert";
import { parseMarkdown } from "./parser.ts";

/**
 * Markdownパーサーテスト
 * GFM (GitHub Flavored Markdown) サポート
 */

Deno.test("基本的なMarkdown変換: 見出し", () => {
  const markdown = "# Hello World";
  const html = parseMarkdown(markdown);
  assertStringIncludes(html, "<h1");
  assertStringIncludes(html, "Hello World");
});

Deno.test("基本的なMarkdown変換: 太字", () => {
  const markdown = "This is **bold**.";
  const html = parseMarkdown(markdown);
  assertStringIncludes(html, "<strong>bold</strong>");
});

Deno.test("基本的なMarkdown変換: 斜体", () => {
  const markdown = "This is *italic*.";
  const html = parseMarkdown(markdown);
  assertStringIncludes(html, "<em>italic</em>");
});

Deno.test("GFM: テーブル", () => {
  const markdown = "| A | B |\n|---|---|\n| 1 | 2 |";
  const html = parseMarkdown(markdown);
  assertStringIncludes(html, "<table");
  assertStringIncludes(html, "<thead");
  assertStringIncludes(html, "<tbody");
});

Deno.test("GFM: コードブロック", () => {
  const markdown = '```javascript\nconsole.log("hello");\n```';
  const html = parseMarkdown(markdown);
  assertStringIncludes(html, "<code");
  // シンタックスハイライトで分割されるため、個別に確認
  assertStringIncludes(html, "console");
  assertStringIncludes(html, "log");
});

Deno.test("シンタックスハイライト: JavaScriptコードブロック", () => {
  const markdown = "```javascript\nconst x = 42;\n```";
  const html = parseMarkdown(markdown);
  // highlight.js が <span> タグでハイライトを適用
  assertStringIncludes(html, "<span");
  assertStringIncludes(html, "const");
  // class属性に hljs が含まれる
  assertStringIncludes(html, "hljs");
});

Deno.test("シンタックスハイライト: 言語指定なしのコードブロック", () => {
  const markdown = "```\nplain text\n```";
  const html = parseMarkdown(markdown);
  // コードブロックは生成される
  assertStringIncludes(html, "<code");
  assertStringIncludes(html, "plain text");
});

Deno.test("GFM: リンク", () => {
  const markdown = "[Example](https://example.com)";
  const html = parseMarkdown(markdown);
  assertStringIncludes(html, "<a");
  assertStringIncludes(html, "https://example.com");
});

Deno.test("複雑なMarkdown: 混合要素", () => {
  const markdown = `# Title

This is **bold** and *italic*.

- Item 1
- Item 2

\`\`\`javascript
const x = 1;
\`\`\`
`;
  const html = parseMarkdown(markdown);
  assertStringIncludes(html, "<h1");
  assertStringIncludes(html, "<strong>");
  assertStringIncludes(html, "<em>");
  assertStringIncludes(html, "<ul");
  assertStringIncludes(html, "<code");
});

/**
 * GFM拡張機能のテスト
 * 打ち消し線、タスクリスト、オートリンク
 */

Deno.test("GFM: 打ち消し線（Strikethrough）", () => {
  const markdown = "This is ~~strikethrough~~ text.";
  const html = parseMarkdown(markdown);
  // markedは<del>タグを生成する
  assertStringIncludes(html, "<del>strikethrough</del>");
});

Deno.test("GFM: 打ち消し線（複数箇所）", () => {
  const markdown = "~~First~~ normal ~~second~~ text.";
  const html = parseMarkdown(markdown);
  assertStringIncludes(html, "<del>First</del>");
  assertStringIncludes(html, "<del>second</del>");
  assertStringIncludes(html, "normal");
});

Deno.test("GFM: タスクリスト（未完了）", () => {
  const markdown = "- [ ] Todo item";
  const html = parseMarkdown(markdown);
  // チェックボックス（unchecked）が生成される
  assertStringIncludes(html, "<input");
  assertStringIncludes(html, 'type="checkbox"');
  assertStringIncludes(html, "disabled");
  // checkedがないことを確認（負のテスト）
  assertEquals(html.includes("checked"), false);
  assertStringIncludes(html, "Todo item");
});

Deno.test("GFM: タスクリスト（完了）", () => {
  const markdown = "- [x] Done item";
  const html = parseMarkdown(markdown);
  // チェックボックス（checked）が生成される
  assertStringIncludes(html, "<input");
  assertStringIncludes(html, 'type="checkbox"');
  assertStringIncludes(html, "checked");
  assertStringIncludes(html, "disabled");
  assertStringIncludes(html, "Done item");
});

Deno.test("GFM: タスクリスト（混在）", () => {
  const markdown = `- [x] Completed task
- [ ] Pending task
- [x] Another completed`;
  const html = parseMarkdown(markdown);
  // チェックボックスが複数存在
  const checkboxCount = (html.match(/type="checkbox"/g) || []).length;
  assertEquals(checkboxCount, 3);
  // checkedが2つ存在
  const checkedCount = (html.match(/checked/g) || []).length;
  assertEquals(checkedCount, 2);
});

Deno.test("GFM: オートリンク（URL）", () => {
  const markdown = "Visit https://example.com for more info.";
  const html = parseMarkdown(markdown);
  // URLが自動的にリンクになる
  assertStringIncludes(html, "<a");
  assertStringIncludes(html, "https://example.com");
  assertStringIncludes(html, "for more info");
});

Deno.test("GFM: オートリンク（複数URL）", () => {
  const markdown = "Check https://example.com and https://github.com";
  const html = parseMarkdown(markdown);
  assertStringIncludes(html, "https://example.com");
  assertStringIncludes(html, "https://github.com");
  // 両方ともリンクになっているか確認
  const linkCount = (html.match(/<a/g) || []).length;
  assertEquals(linkCount >= 2, true);
});

Deno.test("GFM: 複合機能（テーブル + 打ち消し線）", () => {
  const markdown = `| Feature | Status |
|---------|--------|
| ~~Old~~ | Deprecated |
| New     | Active |`;
  const html = parseMarkdown(markdown);
  // テーブルと打ち消し線の両方が機能する
  assertStringIncludes(html, "<table");
  assertStringIncludes(html, "<del>Old</del>");
  assertStringIncludes(html, "Deprecated");
  assertStringIncludes(html, "Active");
});

Deno.test("GFM: 複合機能（タスクリスト + 打ち消し線 + リンク）", () => {
  const markdown = `- [x] ~~Complete~~ this task
- [ ] Visit https://example.com
- [x] **Bold** and *italic* task`;
  const html = parseMarkdown(markdown);
  // タスクリスト
  assertStringIncludes(html, "<input");
  assertStringIncludes(html, 'type="checkbox"');
  // 打ち消し線
  assertStringIncludes(html, "<del>Complete</del>");
  // オートリンク
  assertStringIncludes(html, "https://example.com");
  // 太字・斜体
  assertStringIncludes(html, "<strong>Bold</strong>");
  assertStringIncludes(html, "<em>italic</em>");
});

/**
 * エッジケーステスト
 */

Deno.test("エッジケース: 空文字列 → 空のHTMLが返る", () => {
  const html = parseMarkdown("");
  // 空文字列でもクラッシュせず、空（または改行のみ）のHTMLが返る
  assertEquals(html.trim().length === 0 || html === "\n", true);
});

Deno.test("エッジケース: 空白文字のみ → クラッシュしない", () => {
  const html = parseMarkdown("   \n\n  \t  ");
  assertEquals(typeof html, "string");
});

Deno.test("エッジケース: 超長文Markdown（100KB相当）→ OOMしない", () => {
  // 100KBの繰り返しMarkdown
  const longMarkdown = "# Heading\n\nParagraph with **bold** text.\n\n".repeat(
    2500,
  );
  const html = parseMarkdown(longMarkdown);
  assertStringIncludes(html, "<h1");
  assertStringIncludes(html, "<strong>");
  // 長さが元のMarkdownより大きい（HTMLタグが追加されるため）
  assertEquals(html.length > longMarkdown.length, true);
});

Deno.test("エッジケース: 見出しだけのMarkdown", () => {
  const html = parseMarkdown("# Title");
  assertStringIncludes(html, "<h1");
  assertStringIncludes(html, "Title");
});

Deno.test("エッジケース: 深いネスト（6段階見出し）", () => {
  const markdown = `# H1\n## H2\n### H3\n#### H4\n##### H5\n###### H6`;
  const html = parseMarkdown(markdown);
  assertStringIncludes(html, "<h1");
  assertStringIncludes(html, "<h6");
});

Deno.test("エッジケース: 特殊文字を含むMarkdown", () => {
  const markdown = "Special chars: <>&\"' and `backtick`";
  const html = parseMarkdown(markdown);
  // バッククォートはcode要素になる
  assertStringIncludes(html, "<code>");
  assertStringIncludes(html, "backtick");
});
