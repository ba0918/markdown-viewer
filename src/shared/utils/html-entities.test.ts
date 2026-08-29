import { assertEquals } from "@std/assert";
import { decodeBasicHtmlEntities } from "./html-entities.ts";

Deno.test("decodeBasicHtmlEntities: &amp; をデコードする", () => {
  assertEquals(decodeBasicHtmlEntities("A &amp; B"), "A & B");
});

Deno.test("decodeBasicHtmlEntities: &lt; &gt; をデコードする", () => {
  assertEquals(decodeBasicHtmlEntities("&lt;div&gt;"), "<div>");
});

Deno.test("decodeBasicHtmlEntities: &quot; をデコードする", () => {
  assertEquals(decodeBasicHtmlEntities("say &quot;hi&quot;"), 'say "hi"');
});

Deno.test("decodeBasicHtmlEntities: シングルクォート系をデコードする", () => {
  assertEquals(decodeBasicHtmlEntities("it&#39;s"), "it's");
  assertEquals(decodeBasicHtmlEntities("it&#x27;s"), "it's");
  assertEquals(decodeBasicHtmlEntities("it&apos;s"), "it's");
});

Deno.test("decodeBasicHtmlEntities: 大文字のエンティティもデコードする", () => {
  assertEquals(decodeBasicHtmlEntities("A &AMP; B"), "A & B");
  assertEquals(decodeBasicHtmlEntities("&LT;div&GT;"), "<div>");
});

Deno.test("decodeBasicHtmlEntities: 単一パスのみ（多重デコードしない）", () => {
  // HTMLエスケープを1回適用した文字列を元に戻すのが責務
  assertEquals(decodeBasicHtmlEntities("&amp;lt;"), "&lt;");
});

Deno.test("decodeBasicHtmlEntities: 未知のエンティティは保持する", () => {
  assertEquals(decodeBasicHtmlEntities("&nbsp;&copy;"), "&nbsp;&copy;");
});

Deno.test("decodeBasicHtmlEntities: エンティティを含まない文字列はそのまま", () => {
  assertEquals(decodeBasicHtmlEntities("plain text"), "plain text");
});
