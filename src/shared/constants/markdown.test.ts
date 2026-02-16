import { assertEquals } from "@std/assert";
import { MARKDOWN_EXTENSION_PATTERN, MARKDOWN_EXTENSIONS } from "./markdown.ts";

Deno.test("MARKDOWN_EXTENSIONS: 必須拡張子が全て含まれている", () => {
  assertEquals(MARKDOWN_EXTENSIONS.includes(".md"), true);
  assertEquals(MARKDOWN_EXTENSIONS.includes(".markdown"), true);
  assertEquals(MARKDOWN_EXTENSIONS.includes(".mdown"), true);
  assertEquals(MARKDOWN_EXTENSIONS.includes(".mkd"), true);
});

Deno.test("MARKDOWN_EXTENSION_PATTERN: .md にマッチする", () => {
  assertEquals(MARKDOWN_EXTENSION_PATTERN.test("/path/to/file.md"), true);
});

Deno.test("MARKDOWN_EXTENSION_PATTERN: .markdown にマッチする", () => {
  assertEquals(MARKDOWN_EXTENSION_PATTERN.test("/path/to/file.markdown"), true);
});

Deno.test("MARKDOWN_EXTENSION_PATTERN: .mdown にマッチする", () => {
  assertEquals(MARKDOWN_EXTENSION_PATTERN.test("/path/to/file.mdown"), true);
});

Deno.test("MARKDOWN_EXTENSION_PATTERN: .mkd にマッチする", () => {
  assertEquals(MARKDOWN_EXTENSION_PATTERN.test("/path/to/file.mkd"), true);
});

Deno.test("MARKDOWN_EXTENSION_PATTERN: 大文字にもマッチする（case insensitive）", () => {
  assertEquals(MARKDOWN_EXTENSION_PATTERN.test("/path/to/file.MD"), true);
  assertEquals(MARKDOWN_EXTENSION_PATTERN.test("/path/to/file.Markdown"), true);
  assertEquals(MARKDOWN_EXTENSION_PATTERN.test("/path/to/file.MDOWN"), true);
  assertEquals(MARKDOWN_EXTENSION_PATTERN.test("/path/to/file.MKD"), true);
});

Deno.test("MARKDOWN_EXTENSION_PATTERN: 非Markdown拡張子にはマッチしない", () => {
  assertEquals(MARKDOWN_EXTENSION_PATTERN.test("/path/to/file.txt"), false);
  assertEquals(MARKDOWN_EXTENSION_PATTERN.test("/path/to/file.html"), false);
  assertEquals(MARKDOWN_EXTENSION_PATTERN.test("/path/to/file.js"), false);
  assertEquals(MARKDOWN_EXTENSION_PATTERN.test("/path/to/file.css"), false);
});

Deno.test("MARKDOWN_EXTENSION_PATTERN: パス途中の .md にはマッチしない", () => {
  // .md が末尾でない場合はマッチしないことを確認
  assertEquals(
    MARKDOWN_EXTENSION_PATTERN.test("/path/to/file.md.bak"),
    false,
  );
});
