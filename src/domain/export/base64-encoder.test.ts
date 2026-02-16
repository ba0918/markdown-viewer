import { assert, assertEquals } from "@std/assert";
import { encodeHtmlToDataUrl } from "./base64-encoder.ts";

Deno.test("encodeHtmlToDataUrl", async (t) => {
  await t.step("空文字列をData URLに変換", () => {
    const result = encodeHtmlToDataUrl("");
    assertEquals(result, "data:text/html;base64," + btoa(""));
  });

  await t.step("ASCII文字列をData URLに変換", () => {
    const html = "<h1>Hello</h1>";
    const result = encodeHtmlToDataUrl(html);
    // Data URLをデコードして元のHTMLと一致することを確認
    const base64Part = result.replace("data:text/html;base64,", "");
    const decoded = atob(base64Part);
    assertEquals(decoded, html);
  });

  await t.step("マルチバイト文字（日本語）を正しくエンコード", () => {
    const html = "<p>日本語テスト</p>";
    const result = encodeHtmlToDataUrl(html);
    // Data URLをデコードしてUTF-8としてパース
    const base64Part = result.replace("data:text/html;base64,", "");
    const binaryStr = atob(base64Part);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    const decoded = new TextDecoder().decode(bytes);
    assertEquals(decoded, html);
  });

  await t.step("data:text/html;base64, プレフィックスが付与される", () => {
    const result = encodeHtmlToDataUrl("test");
    assert(result.startsWith("data:text/html;base64,"));
  });

  await t.step("大容量HTML（100KB）でスタック溢れしない", () => {
    // 100KBのHTML文字列を生成
    const largeHtml = "<p>" + "x".repeat(100_000) + "</p>";
    const result = encodeHtmlToDataUrl(largeHtml);
    assert(result.startsWith("data:text/html;base64,"));
    // デコードして元のHTMLと一致することを確認
    const base64Part = result.replace("data:text/html;base64,", "");
    const decoded = atob(base64Part);
    assertEquals(decoded, largeHtml);
  });

  await t.step("絵文字を含むHTMLを正しくエンコード", () => {
    const html = "<p>Hello 🎉🚀</p>";
    const result = encodeHtmlToDataUrl(html);
    const base64Part = result.replace("data:text/html;base64,", "");
    const binaryStr = atob(base64Part);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    const decoded = new TextDecoder().decode(bytes);
    assertEquals(decoded, html);
  });
});
