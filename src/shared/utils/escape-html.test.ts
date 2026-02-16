import { assertEquals } from "@std/assert";
import { escapeHtml } from "./escape-html.ts";

Deno.test("escapeHtml", async (t) => {
  await t.step("null入力で空文字列を返す", () => {
    assertEquals(escapeHtml(null), "");
  });

  await t.step("undefined入力で空文字列を返す", () => {
    assertEquals(escapeHtml(undefined), "");
  });

  await t.step("空文字列はそのまま返す", () => {
    assertEquals(escapeHtml(""), "");
  });

  await t.step("特殊文字なしの文字列はそのまま返す", () => {
    assertEquals(escapeHtml("Hello World"), "Hello World");
  });

  await t.step("& をエスケープ", () => {
    assertEquals(escapeHtml("foo & bar"), "foo &amp; bar");
  });

  await t.step("< をエスケープ", () => {
    assertEquals(escapeHtml("<script>"), "&lt;script&gt;");
  });

  await t.step("> をエスケープ", () => {
    assertEquals(escapeHtml("a > b"), "a &gt; b");
  });

  await t.step("ダブルクォートをエスケープ", () => {
    assertEquals(escapeHtml('"quoted"'), "&quot;quoted&quot;");
  });

  await t.step("シングルクォートをエスケープ", () => {
    assertEquals(escapeHtml("it's"), "it&#039;s");
  });

  await t.step("複合ケース: 全特殊文字を含む文字列", () => {
    assertEquals(
      escapeHtml(`<img src="x" onerror='alert(1)'>& more`),
      "&lt;img src=&quot;x&quot; onerror=&#039;alert(1)&#039;&gt;&amp; more",
    );
  });

  await t.step("XSS攻撃ベクター: scriptタグ", () => {
    assertEquals(
      escapeHtml('<script>alert("XSS")</script>'),
      "&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;",
    );
  });

  await t.step("マルチバイト文字はエスケープしない", () => {
    assertEquals(escapeHtml("日本語テスト"), "日本語テスト");
  });
});
