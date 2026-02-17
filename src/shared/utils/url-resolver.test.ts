import { assertEquals } from "@std/assert";
import { isRelativeLink, resolveRelativeLink } from "./url-resolver.ts";

/**
 * 相対リンク判定テスト
 */

Deno.test("isRelativeLink: 絶対URL (http://) は相対リンクではない", () => {
  assertEquals(isRelativeLink("http://example.com/page.html"), false);
});

Deno.test("isRelativeLink: 絶対URL (https://) は相対リンクではない", () => {
  assertEquals(isRelativeLink("https://example.com/page.html"), false);
});

Deno.test("isRelativeLink: 絶対URL (file://) は相対リンクではない", () => {
  assertEquals(isRelativeLink("file:///home/user/file.md"), false);
});

Deno.test("isRelativeLink: 同一ページ内リンク (#) は相対リンクではない", () => {
  assertEquals(isRelativeLink("#section"), false);
});

Deno.test("isRelativeLink: 相対パス (path/to/link.md) は相対リンク", () => {
  assertEquals(isRelativeLink("path/to/link.md"), true);
});

Deno.test("isRelativeLink: 相対パス (./path/to/link.md) は相対リンク", () => {
  assertEquals(isRelativeLink("./path/to/link.md"), true);
});

Deno.test("isRelativeLink: 相対パス (../path/to/link.md) は相対リンク", () => {
  assertEquals(isRelativeLink("../path/to/link.md"), true);
});

/**
 * 相対リンク解決テスト: file:// (WSL2)
 */

const WSL2_BASE =
  "file://wsl.localhost/Ubuntu-24.04/home/user/project/markdown-viewer";

Deno.test("resolveRelativeLink (WSL2): path/to/link.md", () => {
  const currentUrl = `${WSL2_BASE}/README.md`;
  const relativeHref = "path/to/link.md";
  const expected = `${WSL2_BASE}/path/to/link.md`;

  assertEquals(resolveRelativeLink(currentUrl, relativeHref), expected);
});

Deno.test("resolveRelativeLink (WSL2): ./path/to/link.md", () => {
  const currentUrl = `${WSL2_BASE}/README.md`;
  const relativeHref = "./path/to/link.md";
  const expected = `${WSL2_BASE}/path/to/link.md`;

  assertEquals(resolveRelativeLink(currentUrl, relativeHref), expected);
});

Deno.test("resolveRelativeLink (WSL2): ../path/to/link.md", () => {
  const currentUrl = `${WSL2_BASE}/docs/ARCHITECTURE.md`;
  const relativeHref = "../path/to/link.md";
  const expected = `${WSL2_BASE}/path/to/link.md`;

  assertEquals(resolveRelativeLink(currentUrl, relativeHref), expected);
});

Deno.test("resolveRelativeLink (WSL2): path/to/../to/link.md", () => {
  const currentUrl = `${WSL2_BASE}/README.md`;
  const relativeHref = "path/to/../to/link.md";
  const expected = `${WSL2_BASE}/path/to/link.md`;

  assertEquals(resolveRelativeLink(currentUrl, relativeHref), expected);
});

Deno.test("resolveRelativeLink (WSL2): docs/ARCHITECTURE.md", () => {
  const currentUrl = `${WSL2_BASE}/README.md`;
  const relativeHref = "docs/ARCHITECTURE.md";
  const expected = `${WSL2_BASE}/docs/ARCHITECTURE.md`;

  assertEquals(resolveRelativeLink(currentUrl, relativeHref), expected);
});

Deno.test("resolveRelativeLink (WSL2): ./docs/ARCHITECTURE.md", () => {
  const currentUrl = `${WSL2_BASE}/README.md`;
  const relativeHref = "./docs/ARCHITECTURE.md";
  const expected = `${WSL2_BASE}/docs/ARCHITECTURE.md`;

  assertEquals(resolveRelativeLink(currentUrl, relativeHref), expected);
});

Deno.test("resolveRelativeLink (WSL2): ../README.md (docsから親ディレクトリへ)", () => {
  const currentUrl = `${WSL2_BASE}/docs/ARCHITECTURE.md`;
  const relativeHref = "../README.md";
  const expected = `${WSL2_BASE}/README.md`;

  assertEquals(resolveRelativeLink(currentUrl, relativeHref), expected);
});

Deno.test("resolveRelativeLink (WSL2): ../../README.md (深い階層から)", () => {
  const currentUrl = `${WSL2_BASE}/src/content/index.ts`;
  const relativeHref = "../../README.md";
  const expected = `${WSL2_BASE}/README.md`;

  assertEquals(resolveRelativeLink(currentUrl, relativeHref), expected);
});

/**
 * 相対リンク解決テスト: file:// (Windows)
 */

const WINDOWS_BASE = "file:///C:/Users/user/projects/markdown-viewer";

Deno.test("resolveRelativeLink (Windows): path/to/link.md", () => {
  const currentUrl = `${WINDOWS_BASE}/README.md`;
  const relativeHref = "path/to/link.md";
  const expected = `${WINDOWS_BASE}/path/to/link.md`;

  assertEquals(resolveRelativeLink(currentUrl, relativeHref), expected);
});

Deno.test("resolveRelativeLink (Windows): ./path/to/link.md", () => {
  const currentUrl = `${WINDOWS_BASE}/README.md`;
  const relativeHref = "./path/to/link.md";
  const expected = `${WINDOWS_BASE}/path/to/link.md`;

  assertEquals(resolveRelativeLink(currentUrl, relativeHref), expected);
});

Deno.test("resolveRelativeLink (Windows): ../path/to/link.md", () => {
  const currentUrl = `${WINDOWS_BASE}/docs/ARCHITECTURE.md`;
  const relativeHref = "../path/to/link.md";
  const expected = `${WINDOWS_BASE}/path/to/link.md`;

  assertEquals(resolveRelativeLink(currentUrl, relativeHref), expected);
});

Deno.test("resolveRelativeLink (Windows): path/to/../to/link.md", () => {
  const currentUrl = `${WINDOWS_BASE}/README.md`;
  const relativeHref = "path/to/../to/link.md";
  const expected = `${WINDOWS_BASE}/path/to/link.md`;

  assertEquals(resolveRelativeLink(currentUrl, relativeHref), expected);
});

/**
 * 相対リンク解決テスト: localhost (開発サーバー)
 */

const LOCALHOST_BASE = "http://localhost:8000/markdown-viewer";

Deno.test("resolveRelativeLink (localhost): path/to/link.md", () => {
  const currentUrl = `${LOCALHOST_BASE}/README.md`;
  const relativeHref = "path/to/link.md";
  const expected = `${LOCALHOST_BASE}/path/to/link.md`;

  assertEquals(resolveRelativeLink(currentUrl, relativeHref), expected);
});

Deno.test("resolveRelativeLink (localhost): ./path/to/link.md", () => {
  const currentUrl = `${LOCALHOST_BASE}/README.md`;
  const relativeHref = "./path/to/link.md";
  const expected = `${LOCALHOST_BASE}/path/to/link.md`;

  assertEquals(resolveRelativeLink(currentUrl, relativeHref), expected);
});

Deno.test("resolveRelativeLink (localhost): ../path/to/link.md", () => {
  const currentUrl = `${LOCALHOST_BASE}/docs/ARCHITECTURE.md`;
  const relativeHref = "../path/to/link.md";
  const expected = `${LOCALHOST_BASE}/path/to/link.md`;

  assertEquals(resolveRelativeLink(currentUrl, relativeHref), expected);
});

Deno.test("resolveRelativeLink (localhost): path/to/../to/link.md", () => {
  const currentUrl = `${LOCALHOST_BASE}/README.md`;
  const relativeHref = "path/to/../to/link.md";
  const expected = `${LOCALHOST_BASE}/path/to/link.md`;

  assertEquals(resolveRelativeLink(currentUrl, relativeHref), expected);
});

/**
 * エッジケース
 */

Deno.test("resolveRelativeLink: 空文字列", () => {
  const currentUrl = `${WSL2_BASE}/README.md`;
  const relativeHref = "";
  const expected = `${WSL2_BASE}/`;

  assertEquals(resolveRelativeLink(currentUrl, relativeHref), expected);
});

Deno.test("resolveRelativeLink: . (現在のディレクトリ)", () => {
  const currentUrl = `${WSL2_BASE}/README.md`;
  const relativeHref = ".";
  const expected = `${WSL2_BASE}/`;

  assertEquals(resolveRelativeLink(currentUrl, relativeHref), expected);
});

Deno.test("resolveRelativeLink: .. (親ディレクトリ)", () => {
  const currentUrl = `${WSL2_BASE}/docs/ARCHITECTURE.md`;
  const relativeHref = "..";
  const expected = `${WSL2_BASE}/`;

  assertEquals(resolveRelativeLink(currentUrl, relativeHref), expected);
});

Deno.test("resolveRelativeLink: ./../README.md (複雑なパス)", () => {
  const currentUrl = `${WSL2_BASE}/docs/ARCHITECTURE.md`;
  const relativeHref = "./../README.md";
  const expected = `${WSL2_BASE}/README.md`;

  assertEquals(resolveRelativeLink(currentUrl, relativeHref), expected);
});

Deno.test("resolveRelativeLink: ./././README.md (複数の.)", () => {
  const currentUrl = `${WSL2_BASE}/docs/ARCHITECTURE.md`;
  const relativeHref = "./././../README.md";
  const expected = `${WSL2_BASE}/README.md`;

  assertEquals(resolveRelativeLink(currentUrl, relativeHref), expected);
});

Deno.test("resolveRelativeLink: クエリパラメータ付き", () => {
  const currentUrl = `${WSL2_BASE}/README.md`;
  const relativeHref = "docs/ARCHITECTURE.md?section=intro";
  const expected = `${WSL2_BASE}/docs/ARCHITECTURE.md?section=intro`;

  assertEquals(resolveRelativeLink(currentUrl, relativeHref), expected);
});

Deno.test("resolveRelativeLink: フラグメント付き", () => {
  const currentUrl = `${WSL2_BASE}/README.md`;
  const relativeHref = "docs/ARCHITECTURE.md#section";
  const expected = `${WSL2_BASE}/docs/ARCHITECTURE.md#section`;

  assertEquals(resolveRelativeLink(currentUrl, relativeHref), expected);
});

Deno.test("resolveRelativeLink: 日本語パス", () => {
  const currentUrl = `${WSL2_BASE}/README.md`;
  const relativeHref = "ドキュメント/アーキテクチャ.md";
  const expected = `${WSL2_BASE}/${encodeURIComponent("ドキュメント")}/${
    encodeURIComponent("アーキテクチャ.md")
  }`;

  assertEquals(resolveRelativeLink(currentUrl, relativeHref), expected);
});

Deno.test("resolveRelativeLink: スペース含むパス", () => {
  const currentUrl = `${WSL2_BASE}/README.md`;
  const relativeHref = "my docs/architecture.md";
  const expected = `${WSL2_BASE}/my%20docs/architecture.md`;

  assertEquals(resolveRelativeLink(currentUrl, relativeHref), expected);
});

/**
 * 非相対リンク判定テスト（プロトコル付きリンク）
 */

Deno.test("isRelativeLink: mailto:リンクは相対リンクではない", () => {
  assertEquals(isRelativeLink("mailto:user@example.com"), false);
});

Deno.test("isRelativeLink: tel:リンクは相対リンクではない", () => {
  assertEquals(isRelativeLink("tel:+81-3-1234-5678"), false);
});

Deno.test("isRelativeLink: javascript:リンクは相対リンクではない", () => {
  assertEquals(isRelativeLink("javascript:void(0)"), false);
});

Deno.test("isRelativeLink: data:リンクは相対リンクではない", () => {
  assertEquals(isRelativeLink("data:text/html,<h1>test</h1>"), false);
});

Deno.test("isRelativeLink: vbscript:リンクは相対リンクではない", () => {
  assertEquals(isRelativeLink("vbscript:msgbox"), false);
});
