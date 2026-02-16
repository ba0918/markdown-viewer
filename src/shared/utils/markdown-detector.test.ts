/**
 * Markdownファイル判定ユーティリティのテスト
 */

import { assertEquals } from "@std/assert";
import { isMarkdownByContext } from "./markdown-detector.ts";

Deno.test("isMarkdownByContext", async (t) => {
  // ローカルファイル (file://)
  await t.step("file:// の .md ファイルはMarkdown", () => {
    assertEquals(
      isMarkdownByContext({
        url: "file:///home/user/doc.md",
        pathname: "/home/user/doc.md",
        contentType: "",
      }),
      true,
    );
  });

  await t.step("file:// の .markdown ファイルはMarkdown", () => {
    assertEquals(
      isMarkdownByContext({
        url: "file:///home/user/doc.markdown",
        pathname: "/home/user/doc.markdown",
        contentType: "",
      }),
      true,
    );
  });

  await t.step("file:// の .mdown ファイルはMarkdown", () => {
    assertEquals(
      isMarkdownByContext({
        url: "file:///home/user/doc.mdown",
        pathname: "/home/user/doc.mdown",
        contentType: "",
      }),
      true,
    );
  });

  await t.step("file:// の .mkd ファイルはMarkdown", () => {
    assertEquals(
      isMarkdownByContext({
        url: "file:///home/user/doc.mkd",
        pathname: "/home/user/doc.mkd",
        contentType: "",
      }),
      true,
    );
  });

  await t.step("file:// の .MD ファイルはMarkdown（大文字小文字不問）", () => {
    assertEquals(
      isMarkdownByContext({
        url: "file:///home/user/README.MD",
        pathname: "/home/user/README.MD",
        contentType: "",
      }),
      true,
    );
  });

  await t.step("file:// の .txt ファイルはMarkdownではない", () => {
    assertEquals(
      isMarkdownByContext({
        url: "file:///home/user/doc.txt",
        pathname: "/home/user/doc.txt",
        contentType: "",
      }),
      false,
    );
  });

  await t.step("file:// の .html ファイルはMarkdownではない", () => {
    assertEquals(
      isMarkdownByContext({
        url: "file:///home/user/index.html",
        pathname: "/home/user/index.html",
        contentType: "",
      }),
      false,
    );
  });

  // localhost
  await t.step("http://localhost の .md ファイルはMarkdown", () => {
    assertEquals(
      isMarkdownByContext({
        url: "http://localhost:8000/doc.md",
        pathname: "/doc.md",
        contentType: "text/plain",
      }),
      true,
    );
  });

  await t.step("http://localhost の .txt ファイルはMarkdownではない", () => {
    assertEquals(
      isMarkdownByContext({
        url: "http://localhost:8000/doc.txt",
        pathname: "/doc.txt",
        contentType: "text/plain",
      }),
      false,
    );
  });

  // リモートURL - 拡張子あり
  await t.step("リモートURLで .md 拡張子はMarkdown", () => {
    assertEquals(
      isMarkdownByContext({
        url: "https://example.com/doc.md",
        pathname: "/doc.md",
        contentType: "text/plain",
      }),
      true,
    );
  });

  await t.step("リモートURLで .markdown 拡張子はMarkdown", () => {
    assertEquals(
      isMarkdownByContext({
        url: "https://example.com/doc.markdown",
        pathname: "/doc.markdown",
        contentType: "",
      }),
      true,
    );
  });

  // リモートURL - 拡張子なし + Content-Type
  await t.step("拡張子なし + text/markdown はMarkdown", () => {
    assertEquals(
      isMarkdownByContext({
        url: "https://api.example.com/docs/readme",
        pathname: "/docs/readme",
        contentType: "text/markdown",
      }),
      true,
    );
  });

  await t.step("拡張子なし + text/markdown; charset=utf-8 はMarkdown", () => {
    assertEquals(
      isMarkdownByContext({
        url: "https://api.example.com/docs/readme",
        pathname: "/docs/readme",
        contentType: "text/markdown; charset=utf-8",
      }),
      true,
    );
  });

  await t.step("拡張子なし + text/html はMarkdownではない", () => {
    assertEquals(
      isMarkdownByContext({
        url: "https://example.com/page",
        pathname: "/page",
        contentType: "text/html",
      }),
      false,
    );
  });

  await t.step(
    "拡張子なし + text/plain はMarkdownではない（誤検知防止）",
    () => {
      assertEquals(
        isMarkdownByContext({
          url: "https://example.com/file",
          pathname: "/file",
          contentType: "text/plain",
        }),
        false,
      );
    },
  );

  await t.step("拡張子なし + 空文字列 はMarkdownではない", () => {
    assertEquals(
      isMarkdownByContext({
        url: "https://example.com/page",
        pathname: "/page",
        contentType: "",
      }),
      false,
    );
  });

  // エッジケース
  await t.step("localhostではパスで判定し、Content-Typeは無視", () => {
    assertEquals(
      isMarkdownByContext({
        url: "http://localhost:3000/api/doc",
        pathname: "/api/doc",
        contentType: "text/markdown",
      }),
      false,
    );
  });
});
