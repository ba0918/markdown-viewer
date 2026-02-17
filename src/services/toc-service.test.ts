/**
 * TocService ユニットテスト
 *
 * TOC生成パイプライン（extractHeadings → normalizeHeadingLevels → buildTocTree）の
 * 統合テスト。services層としてdomain関数の組み合わせが正しく動作するかを検証。
 */

import { assertEquals } from "@std/assert";
import { TocService } from "./toc-service.ts";

Deno.test("TocService.generateToc", async (t) => {
  const service = new TocService();

  await t.step("H1/H2/H3の混在Markdownから正しい階層構造を生成", () => {
    const markdown = `# Heading 1
## Heading 1.1
### Heading 1.1.1
## Heading 1.2
# Heading 2`;

    const result = service.generateToc(markdown);

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

  await t.step("空文字列の場合は空配列を返す", () => {
    const result = service.generateToc("");
    assertEquals(result, []);
  });

  await t.step("見出しがないMarkdownの場合は空配列を返す", () => {
    const markdown = "This is a paragraph.\n\nAnother paragraph.";
    const result = service.generateToc(markdown);
    assertEquals(result, []);
  });

  await t.step("H2から始まるMarkdownでもレベル正規化される", () => {
    const markdown = `## Sub Heading
### Sub Sub Heading`;

    const result = service.generateToc(markdown);

    // normalizeHeadingLevels: H2は親(H1)がいないのでH2のまま、H3は親(H2)がいるのでH3のまま
    // buildTocTree: H2がルート、H3がその子になる
    assertEquals(result.length, 1);
    assertEquals(result[0].level, 2);
    assertEquals(result[0].children.length, 1);
    assertEquals(result[0].children[0].level, 3);
  });

  await t.step(
    "IDが正しく生成される（スペース→ハイフン変換、大文字維持）",
    () => {
      const markdown = "# Hello World";
      const result = service.generateToc(markdown);

      assertEquals(result.length, 1);
      // IDは大文字を維持する（generateHeadingIdの仕様）
      assertEquals(result[0].id, "Hello-World");
    },
  );
});
