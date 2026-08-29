import { assertEquals } from "@std/assert";
import {
  isNavigableUrl,
  isRelativeLink,
  resolveRelativeLink,
} from "./url-resolver.ts";

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

/**
 * 大文字プロトコルの非相対リンク判定テスト（ケースインセンシティブ対応）
 */

Deno.test("isRelativeLink: JavaScript:(大文字)は相対リンクではない", () => {
  assertEquals(isRelativeLink("JavaScript:void(0)"), false);
});

Deno.test("isRelativeLink: MAILTO:(大文字)は相対リンクではない", () => {
  assertEquals(isRelativeLink("MAILTO:user@example.com"), false);
});

Deno.test("isRelativeLink: VBScript:(大文字)は相対リンクではない", () => {
  assertEquals(isRelativeLink("VBScript:MsgBox"), false);
});

Deno.test("isRelativeLink: HTTP:(大文字)は相対リンクではない", () => {
  assertEquals(isRelativeLink("HTTP://example.com"), false);
});

Deno.test("isRelativeLink: FILE:(大文字)は相対リンクではない", () => {
  assertEquals(isRelativeLink("FILE:///home/user/file.md"), false);
});

Deno.test("isRelativeLink: Data:(混在ケース)は相対リンクではない", () => {
  assertEquals(isRelativeLink("Data:text/html,<h1>test</h1>"), false);
});

/**
 * 難読化スキームの相対リンク判定テスト
 *
 * new URL() はタブ・改行を除去するため、これらを含む値を「相対リンク」と
 * 誤判定すると javascript: へ解決されてしまう。
 */

const TAB_CHAR = String.fromCharCode(9);
const NEWLINE_CHAR = String.fromCharCode(10);

Deno.test("isRelativeLink: タブで難読化したjavascript:は相対リンクではない", () => {
  assertEquals(isRelativeLink(`java${TAB_CHAR}script:alert(1)`), false);
});

Deno.test("isRelativeLink: 改行で難読化したjavascript:は相対リンクではない", () => {
  assertEquals(isRelativeLink(`java${NEWLINE_CHAR}script:alert(1)`), false);
});

Deno.test("isRelativeLink: 先頭空白付きjavascript:は相対リンクではない", () => {
  assertEquals(isRelativeLink(" javascript:alert(1)"), false);
});

Deno.test("isRelativeLink: 実体参照で難読化したjavascript:は相対リンクではない", () => {
  assertEquals(isRelativeLink("java&#115;cript:alert(1)"), false);
});

Deno.test("isRelativeLink: 未知スキーム(ftp:)も相対リンクではない", () => {
  assertEquals(isRelativeLink("ftp://example.com/a.md"), false);
});

/**
 * 遷移先URLの安全性判定テスト
 */

Deno.test("isNavigableUrl: http/https/fileは遷移可能", () => {
  assertEquals(isNavigableUrl("http://example.com/a.md"), true);
  assertEquals(isNavigableUrl("https://example.com/a.md"), true);
  assertEquals(isNavigableUrl("file:///home/user/a.md"), true);
});

Deno.test("isNavigableUrl: javascript:/data:/vbscript:は遷移不可", () => {
  assertEquals(isNavigableUrl("javascript:alert(1)"), false);
  assertEquals(isNavigableUrl("data:text/html,<h1>x</h1>"), false);
  assertEquals(isNavigableUrl("vbscript:msgbox"), false);
});

Deno.test("isNavigableUrl: スキームのない相対URLは遷移不可（解決漏れ検出）", () => {
  assertEquals(isNavigableUrl("docs/a.md"), false);
});

Deno.test("多層防御: タブ難読化リンクの解決結果はisNavigableUrlで拒否される", () => {
  // isRelativeLink が false を返すため通常はここに到達しないが、
  // 仮に到達しても解決後の検証でブロックされることを保証する
  const resolved = resolveRelativeLink(
    "file:///home/user/README.md",
    `java${TAB_CHAR}script:alert(1)`,
  );
  assertEquals(resolved, "javascript:alert(1)");
  assertEquals(isNavigableUrl(resolved), false);
});
