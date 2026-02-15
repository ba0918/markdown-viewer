import { assertEquals } from "@std/assert";
import { sanitizeHTML } from "./sanitizer.ts";

/**
 * XSS攻撃ベクターテスト
 * セキュリティファースト：全てのXSS攻撃をブロックする
 */

Deno.test("XSS: javascript: protocol", async () => {
  const malicious = "<a href=\"javascript:alert('XSS')\">Click</a>";
  const result = await sanitizeHTML(malicious);
  assertEquals(result.includes("javascript:"), false);
});

Deno.test("XSS: onerror attribute", async () => {
  const malicious = '<img src="x" onerror="alert(\'XSS\')">';
  const result = await sanitizeHTML(malicious);
  assertEquals(result.includes("onerror"), false);
});

Deno.test("XSS: onclick attribute", async () => {
  const malicious = "<button onclick=\"alert('XSS')\">Click</button>";
  const result = await sanitizeHTML(malicious);
  assertEquals(result.includes("onclick"), false);
});

Deno.test("XSS: onload attribute", async () => {
  const malicious = "<body onload=\"alert('XSS')\">";
  const result = await sanitizeHTML(malicious);
  assertEquals(result.includes("onload"), false);
});

Deno.test("XSS: script tag", async () => {
  const malicious = "<script>alert('XSS')</script>";
  const result = await sanitizeHTML(malicious);
  assertEquals(result.includes("<script"), false);
  assertEquals(result.includes("alert"), false);
});

Deno.test("正常なHTML: リンク保持", async () => {
  const valid = '<a href="https://example.com">Link</a>';
  const result = await sanitizeHTML(valid);
  assertEquals(result.includes("https://example.com"), true);
  assertEquals(result.includes("Link"), true);
});

Deno.test("正常なHTML: 画像保持", async () => {
  const valid = '<img src="https://example.com/image.png" alt="Test">';
  const result = await sanitizeHTML(valid);
  assertEquals(result.includes("https://example.com/image.png"), true);
  assertEquals(result.includes("alt"), true);
});

Deno.test("正常なHTML: 基本的なマークアップ保持", async () => {
  const valid = "<p>This is <strong>bold</strong> and <em>italic</em>.</p>";
  const result = await sanitizeHTML(valid);
  assertEquals(result.includes("<p>"), true);
  assertEquals(result.includes("<strong>"), true);
  assertEquals(result.includes("<em>"), true);
});

/**
 * GFM要素のサニタイズテスト
 * 打ち消し線とタスクリストが正しく保持されることを確認
 */

Deno.test("GFM: 打ち消し線（<del>タグ）保持", async () => {
  const valid = "<p>This is <del>strikethrough</del> text.</p>";
  const result = await sanitizeHTML(valid);
  assertEquals(result.includes("<del>"), true);
  assertEquals(result.includes("strikethrough"), true);
  assertEquals(result.includes("</del>"), true);
});

Deno.test("GFM: 打ち消し線（<s>タグ）保持", async () => {
  const valid = "<p>This is <s>strikethrough</s> text.</p>";
  const result = await sanitizeHTML(valid);
  assertEquals(result.includes("<s>"), true);
  assertEquals(result.includes("strikethrough"), true);
  assertEquals(result.includes("</s>"), true);
});

Deno.test("GFM: タスクリスト（未完了）保持", async () => {
  const valid = '<li><input type="checkbox" disabled> Todo item</li>';
  const result = await sanitizeHTML(valid);
  assertEquals(result.includes("<input"), true);
  assertEquals(result.includes('type="checkbox"'), true);
  assertEquals(result.includes("disabled"), true);
  assertEquals(result.includes("Todo item"), true);
});

Deno.test("GFM: タスクリスト（完了）保持", async () => {
  const valid = '<li><input type="checkbox" disabled checked> Done item</li>';
  const result = await sanitizeHTML(valid);
  assertEquals(result.includes("<input"), true);
  assertEquals(result.includes('type="checkbox"'), true);
  assertEquals(result.includes("disabled"), true);
  assertEquals(result.includes("checked"), true);
  assertEquals(result.includes("Done item"), true);
});

Deno.test("GFM: テーブル保持", async () => {
  const valid =
    "<table><thead><tr><th>Header</th></tr></thead><tbody><tr><td>Cell</td></tr></tbody></table>";
  const result = await sanitizeHTML(valid);
  assertEquals(result.includes("<table>"), true);
  assertEquals(result.includes("<thead>"), true);
  assertEquals(result.includes("<th>"), true);
  assertEquals(result.includes("<tbody>"), true);
  assertEquals(result.includes("<td>"), true);
});

Deno.test("セキュリティ: タスクリストのinputにイベントハンドラ注入を防ぐ", async () => {
  const malicious = '<input type="checkbox" onclick="alert(\'XSS\')" disabled>';
  const result = await sanitizeHTML(malicious);
  assertEquals(result.includes("onclick"), false);
  assertEquals(result.includes("alert"), false);
  // type, disabledは保持
  assertEquals(result.includes('type="checkbox"'), true);
  assertEquals(result.includes("disabled"), true);
});

/**
 * 画像の相対パス・セキュリティテスト
 */

Deno.test("画像: 相対パスのsrcが保持される", async () => {
  const valid = '<img src="images/photo.png" alt="Photo">';
  const result = await sanitizeHTML(valid);
  assertEquals(result.includes('src="images/photo.png"'), true);
  assertEquals(result.includes('alt="Photo"'), true);
});

Deno.test("画像: ./相対パスのsrcが保持される", async () => {
  const valid = '<img src="./img/test.png" alt="Test">';
  const result = await sanitizeHTML(valid);
  assertEquals(result.includes('src="./img/test.png"'), true);
});

Deno.test("画像: ../相対パスのsrcが保持される", async () => {
  const valid = '<img src="../assets/logo.svg" alt="Logo">';
  const result = await sanitizeHTML(valid);
  assertEquals(result.includes('src="../assets/logo.svg"'), true);
});

Deno.test("画像: file://絶対パスのsrcが保持される", async () => {
  const valid = '<img src="file:///home/user/images/photo.png" alt="Photo">';
  const result = await sanitizeHTML(valid);
  assertEquals(result.includes("file:///home/user/images/photo.png"), true);
});

Deno.test("画像: https://絶対URLのsrcが保持される", async () => {
  const valid = '<img src="https://example.com/image.png" alt="Remote">';
  const result = await sanitizeHTML(valid);
  assertEquals(result.includes("https://example.com/image.png"), true);
});

Deno.test("XSS: img srcのjavascript:プロトコルをブロック", async () => {
  const malicious = '<img src="javascript:alert(\'XSS\')" alt="XSS">';
  const result = await sanitizeHTML(malicious);
  assertEquals(result.includes("javascript:"), false);
});

Deno.test("XSS: img srcのdata:プロトコルをブロック", async () => {
  const malicious =
    '<img src="data:text/html,<script>alert(\'XSS\')</script>" alt="XSS">';
  const result = await sanitizeHTML(malicious);
  assertEquals(result.includes("data:"), false);
});

Deno.test("XSS: img srcのvbscript:プロトコルをブロック", async () => {
  const malicious = '<img src="vbscript:MsgBox(\'XSS\')" alt="XSS">';
  const result = await sanitizeHTML(malicious);
  assertEquals(result.includes("vbscript:"), false);
});
