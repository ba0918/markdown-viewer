import { assertEquals } from "@std/assert";
import {
  getUrlScheme,
  hasAllowedUrlScheme,
  normalizeUrlAttributeValue,
} from "./url-scheme.ts";

const TAB = String.fromCharCode(9);
const NEWLINE = String.fromCharCode(10);
const NUL = String.fromCharCode(0);

/**
 * normalizeUrlAttributeValue: ブラウザ解釈後の正規形への正規化
 */

Deno.test("normalize: 数値実体参照（10進）をデコードする", () => {
  assertEquals(
    normalizeUrlAttributeValue("java&#115;cript:alert(1)"),
    "javascript:alert(1)",
  );
});

Deno.test("normalize: 数値実体参照（16進）をデコードする", () => {
  assertEquals(
    normalizeUrlAttributeValue("java&#x73;cript:alert(1)"),
    "javascript:alert(1)",
  );
});

Deno.test("normalize: セミコロンなしの数値実体参照もデコードする", () => {
  assertEquals(
    normalizeUrlAttributeValue("java&#115cript:alert(1)"),
    "javascript:alert(1)",
  );
});

Deno.test("normalize: 名前付き実体参照 &Tab; をデコードして除去する", () => {
  assertEquals(
    normalizeUrlAttributeValue("java&Tab;script:alert(1)"),
    "javascript:alert(1)",
  );
});

Deno.test("normalize: 名前付き実体参照 &NewLine; をデコードして除去する", () => {
  assertEquals(
    normalizeUrlAttributeValue("java&NewLine;script:alert(1)"),
    "javascript:alert(1)",
  );
});

Deno.test("normalize: &colon; をコロンへデコードする", () => {
  assertEquals(
    normalizeUrlAttributeValue("javascript&colon;alert(1)"),
    "javascript:alert(1)",
  );
});

Deno.test("normalize: 多重エンコードを解消する", () => {
  assertEquals(
    normalizeUrlAttributeValue("&amp;#106;avascript:alert(1)"),
    "javascript:alert(1)",
  );
});

Deno.test("normalize: 生のタブ・改行・NUL文字を除去する", () => {
  assertEquals(
    normalizeUrlAttributeValue(`java${TAB}script:alert(1)`),
    "javascript:alert(1)",
  );
  assertEquals(
    normalizeUrlAttributeValue(`java${NEWLINE}script:alert(1)`),
    "javascript:alert(1)",
  );
  assertEquals(
    normalizeUrlAttributeValue(`java${NUL}script:alert(1)`),
    "javascript:alert(1)",
  );
});

Deno.test("normalize: 前後の空白を除去する", () => {
  assertEquals(
    normalizeUrlAttributeValue("  https://example.com  "),
    "https://example.com",
  );
});

Deno.test("normalize: 正常なURLの &amp; は & に戻る（再エスケープ前提）", () => {
  assertEquals(
    normalizeUrlAttributeValue("https://example.com/?a=1&amp;b=2"),
    "https://example.com/?a=1&b=2",
  );
});

Deno.test("normalize: 英数字が続く &amp はデコードしない（HTML属性値の仕様準拠）", () => {
  assertEquals(
    normalizeUrlAttributeValue("https://example.com/?x=1&amperror=2"),
    "https://example.com/?x=1&amperror=2",
  );
});

Deno.test("normalize: 不正なコードポイントは元の文字列を保持する", () => {
  assertEquals(
    normalizeUrlAttributeValue("https://example.com/&#999999999;"),
    "https://example.com/&#999999999;",
  );
});

/**
 * getUrlScheme: スキーム抽出
 */

Deno.test("getUrlScheme: 絶対URLのスキームを小文字で返す", () => {
  assertEquals(getUrlScheme("HTTPS://example.com"), "https:");
  assertEquals(getUrlScheme("mailto:a@b.com"), "mailto:");
});

Deno.test("getUrlScheme: 相対URL・フラグメントはnullを返す", () => {
  assertEquals(getUrlScheme("docs/a.md"), null);
  assertEquals(getUrlScheme("./a.md"), null);
  assertEquals(getUrlScheme("../a.md"), null);
  assertEquals(getUrlScheme("/abs/a.md"), null);
  assertEquals(getUrlScheme("//example.com/a"), null);
  assertEquals(getUrlScheme("#section"), null);
});

Deno.test("getUrlScheme: スキーム構文として不正な文字列はnullを返す", () => {
  // "&" はスキームに使えないため、ブラウザも相対URLとして扱う
  assertEquals(getUrlScheme("java&Tab;script:alert(1)"), null);
  // 数字始まりはスキームになれない
  assertEquals(getUrlScheme("1abc:x"), null);
});

/**
 * hasAllowedUrlScheme: 許可リスト判定
 */

const ALLOWED = ["http:", "https:"] as const;

Deno.test("hasAllowedUrlScheme: 許可スキームはtrue", () => {
  assertEquals(hasAllowedUrlScheme("https://example.com", ALLOWED), true);
  assertEquals(hasAllowedUrlScheme("HTTP://example.com", ALLOWED), true);
});

Deno.test("hasAllowedUrlScheme: 相対URLはtrue", () => {
  assertEquals(hasAllowedUrlScheme("docs/a.md", ALLOWED), true);
  assertEquals(hasAllowedUrlScheme("#anchor", ALLOWED), true);
});

Deno.test("hasAllowedUrlScheme: 未許可スキームはfalse", () => {
  assertEquals(hasAllowedUrlScheme("javascript:alert(1)", ALLOWED), false);
  assertEquals(hasAllowedUrlScheme("file:///etc/passwd", ALLOWED), false);
  assertEquals(hasAllowedUrlScheme("data:text/html,x", ALLOWED), false);
});

Deno.test("hasAllowedUrlScheme: 難読化されたjavascript:を全てブロックする", () => {
  const vectors = [
    "java&#115;cript:alert(1)",
    "java&#x73;cript:alert(1)",
    "java&#115cript:alert(1)",
    "&#106;avascript:alert(1)",
    "javascript&colon;alert(1)",
    "&amp;#106;avascript:alert(1)",
    `java${TAB}script:alert(1)`,
    `java${NEWLINE}script:alert(1)`,
    `${NUL}javascript:alert(1)`,
    "  javascript:alert(1)",
    "JaVaScRiPt:alert(1)",
    "vbscript:msgbox(1)",
  ];
  for (const vector of vectors) {
    assertEquals(
      hasAllowedUrlScheme(vector, ALLOWED),
      false,
      `should block: ${JSON.stringify(vector)}`,
    );
  }
});
