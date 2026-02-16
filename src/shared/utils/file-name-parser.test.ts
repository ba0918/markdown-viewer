/**
 * ファイル名解析ユーティリティのテスト
 */

import { assertEquals } from "@std/assert";
import {
  extractFilenameFromUrl,
  extractTitleFromFilename,
} from "./file-name-parser.ts";

Deno.test("extractFilenameFromUrl", async (t) => {
  // 基本
  await t.step("URLの末尾からファイル名を抽出", () => {
    assertEquals(
      extractFilenameFromUrl("https://example.com/doc.md"),
      "doc.md",
    );
  });

  await t.step("パス階層のあるURLからファイル名を抽出", () => {
    assertEquals(
      extractFilenameFromUrl("file:///home/user/docs/README.md"),
      "README.md",
    );
  });

  // URLエンコード
  await t.step("URLエンコードされた日本語ファイル名をデコード", () => {
    assertEquals(
      extractFilenameFromUrl(
        "file:///home/user/%E3%83%86%E3%82%B9%E3%83%88.md",
      ),
      "テスト.md",
    );
  });

  await t.step("二重エンコードされたファイル名をデコード", () => {
    // %25E3%2583%2586... は "%E3%83%86..." の二重エンコード
    assertEquals(
      extractFilenameFromUrl(
        "https://example.com/%25E3%2583%2586%25E3%2582%25B9%25E3%2583%2588.md",
      ),
      "テスト.md",
    );
  });

  // フォールバック
  await t.step("URLにファイル名がない場合はデフォルト値", () => {
    assertEquals(
      extractFilenameFromUrl("https://example.com/"),
      "document.md",
    );
  });

  await t.step("カスタムフォールバック値", () => {
    assertEquals(
      extractFilenameFromUrl("https://example.com/", "index.md"),
      "index.md",
    );
  });

  // エッジケース
  await t.step("空文字列はデフォルト値", () => {
    assertEquals(extractFilenameFromUrl(""), "document.md");
  });

  await t.step("不正なエンコード文字列はそのまま返す", () => {
    const result = extractFilenameFromUrl("https://example.com/%ZZinvalid.md");
    // decodeURIComponentが失敗するため、そのまま返る
    assertEquals(result, "%ZZinvalid.md");
  });
});

Deno.test("extractTitleFromFilename", async (t) => {
  // 拡張子除去
  await t.step(".md を除去", () => {
    assertEquals(extractTitleFromFilename("README.md"), "README");
  });

  await t.step(".markdown を除去", () => {
    assertEquals(extractTitleFromFilename("doc.markdown"), "doc");
  });

  await t.step(".mdown を除去", () => {
    assertEquals(extractTitleFromFilename("doc.mdown"), "doc");
  });

  await t.step(".mkd を除去", () => {
    assertEquals(extractTitleFromFilename("doc.mkd"), "doc");
  });

  await t.step("大文字拡張子 .MD を除去", () => {
    assertEquals(extractTitleFromFilename("README.MD"), "README");
  });

  await t.step("拡張子なしはそのまま返す", () => {
    assertEquals(extractTitleFromFilename("README"), "README");
  });

  await t.step(".txt は除去しない", () => {
    assertEquals(extractTitleFromFilename("doc.txt"), "doc.txt");
  });

  // エッジケース
  await t.step("ドットを含むファイル名", () => {
    assertEquals(
      extractTitleFromFilename("my.document.md"),
      "my.document",
    );
  });

  await t.step("日本語ファイル名", () => {
    assertEquals(extractTitleFromFilename("設計書.md"), "設計書");
  });

  await t.step("空文字列", () => {
    assertEquals(extractTitleFromFilename(""), "");
  });
});
