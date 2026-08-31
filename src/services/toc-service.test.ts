/**
 * TocService ユニットテスト
 *
 * TOC生成パイプライン（normalizeHeadingLevels → buildTocTree）の統合テスト。
 * services層としてdomain関数の組み合わせが正しく動作するかを検証。
 *
 * 見出しの抽出は domain/toc/html-processor.ts の addHeadingIds() が担うため、
 * ここでは抽出済みの見出しリストを入力として渡す。
 */

import { assertEquals } from "@std/assert";
import { TocService } from "./toc-service.ts";
import { addHeadingIds } from "../domain/toc/html-processor.ts";
import type { TocHeading } from "../shared/types/toc.ts";

/** テスト用: 見出しレベルとテキストから見出しリストを組み立てる */
const headings = (...specs: [1 | 2 | 3, string][]): TocHeading[] =>
  specs.map(([level, text]) => ({
    level,
    text,
    id: text.replace(/\s+/g, "-"),
  }));

Deno.test("TocService.generateToc", async (t) => {
  const service = new TocService();

  await t.step("H1/H2/H3の混在から正しい階層構造を生成", () => {
    const result = service.generateToc(headings(
      [1, "Heading 1"],
      [2, "Heading 1.1"],
      [3, "Heading 1.1.1"],
      [2, "Heading 1.2"],
      [1, "Heading 2"],
    ));

    assertEquals(result.length, 2);
    // 最初のH1
    assertEquals(result[0].text, "Heading 1");
    assertEquals(result[0].level, 1);
    assertEquals(result[0].children.length, 2);
    // H1配下のH2
    assertEquals(result[0].children[0].text, "Heading 1.1");
    assertEquals(result[0].children[0].level, 2);
    assertEquals(result[0].children[0].children.length, 1);
    // H2配下のH3
    assertEquals(result[0].children[0].children[0].text, "Heading 1.1.1");
    assertEquals(result[0].children[0].children[0].level, 3);
    // 2番目のH2
    assertEquals(result[0].children[1].text, "Heading 1.2");
    // 2番目のH1
    assertEquals(result[1].text, "Heading 2");
    assertEquals(result[1].children.length, 0);
  });

  await t.step("見出しが空の場合は空配列を返す", () => {
    assertEquals(service.generateToc([]), []);
  });

  await t.step("H2から始まる場合もレベル正規化される", () => {
    const result = service.generateToc(headings(
      [2, "Sub Heading"],
      [3, "Sub Sub Heading"],
    ));

    // normalizeHeadingLevels: H2は親(H1)がいないのでH2のまま、H3は親(H2)がいるのでH3のまま
    // buildTocTree: H2がルート、H3がその子になる
    assertEquals(result.length, 1);
    assertEquals(result[0].level, 2);
    assertEquals(result[0].children.length, 1);
    assertEquals(result[0].children[0].level, 3);
  });

  await t.step("addHeadingIds の出力をそのまま受け取れる", () => {
    const { headings: extracted } = addHeadingIds(
      "<h1>Hello World</h1><h2>Sub Section</h2>",
    );

    const result = service.generateToc(extracted);

    assertEquals(result.length, 1);
    // IDは大文字を維持する（generateHeadingIdの仕様）
    assertEquals(result[0].id, "Hello-World");
    assertEquals(result[0].children[0].id, "Sub-Section");
  });
});
