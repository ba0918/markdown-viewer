/**
 * HTML見出しID付与処理のテスト
 */

import { assertEquals } from "@std/assert";
import { marked } from "marked";
import { addHeadingIds } from "./html-processor.ts";

Deno.test("addHeadingIds: H1タグにIDを追加", () => {
  const html = "<h1>Hello World</h1>";
  const result = addHeadingIds(html).html;

  assertEquals(result, '<h1 id="Hello-World">Hello World</h1>');
});

Deno.test("addHeadingIds: H1-H3全てにIDを追加", () => {
  const html = `
<h1>Main Title</h1>
<h2>Section 1</h2>
<h3>Subsection 1.1</h3>
  `.trim();

  const result = addHeadingIds(html).html;

  assertEquals(
    result,
    `<h1 id="Main-Title">Main Title</h1>
<h2 id="Section-1">Section 1</h2>
<h3 id="Subsection-1.1">Subsection 1.1</h3>`,
  );
});

Deno.test("addHeadingIds: 既にid属性がある場合はスキップ", () => {
  const html = '<h1 id="custom-id">Title</h1>';
  const result = addHeadingIds(html).html;

  assertEquals(result, '<h1 id="custom-id">Title</h1>');
});

Deno.test("addHeadingIds: class属性がある場合も動作", () => {
  const html = '<h2 class="my-class">Section</h2>';
  const result = addHeadingIds(html).html;

  assertEquals(result, '<h2 class="my-class" id="Section">Section</h2>');
});

Deno.test("addHeadingIds: 見出し内のHTMLタグを除去してIDを生成", () => {
  const html = "<h1>Hello <strong>World</strong></h1>";
  const result = addHeadingIds(html).html;

  assertEquals(
    result,
    '<h1 id="Hello-World">Hello <strong>World</strong></h1>',
  );
});

Deno.test("addHeadingIds: H4-H6は対象外", () => {
  const html = `
<h4>H4 Title</h4>
<h5>H5 Title</h5>
<h6>H6 Title</h6>
  `.trim();

  const result = addHeadingIds(html).html;

  assertEquals(result, html); // 変更なし
});

Deno.test("addHeadingIds: 複数の見出しが混在", () => {
  const html = `
<h1>Introduction</h1>
<p>Some text</p>
<h2>Getting Started</h2>
<p>More text</p>
<h3>Prerequisites</h3>
  `.trim();

  const result = addHeadingIds(html).html;

  assertEquals(
    result,
    `<h1 id="Introduction">Introduction</h1>
<p>Some text</p>
<h2 id="Getting-Started">Getting Started</h2>
<p>More text</p>
<h3 id="Prerequisites">Prerequisites</h3>`,
  );
});

Deno.test("addHeadingIds: 重複する見出しに連番を付与", () => {
  const html = `
<h1>ステータス</h1>
<p>Text</p>
<h2>ステータス</h2>
<p>More text</p>
<h3>ステータス</h3>
<h2>別の見出し</h2>
<h2>ステータス</h2>
  `.trim();

  const result = addHeadingIds(html).html;

  assertEquals(
    result,
    `<h1 id="ステータス">ステータス</h1>
<p>Text</p>
<h2 id="ステータス-1">ステータス</h2>
<p>More text</p>
<h3 id="ステータス-2">ステータス</h3>
<h2 id="別の見出し">別の見出し</h2>
<h2 id="ステータス-3">ステータス</h2>`,
  );
});

/**
 * HTMLエンティティを含む見出しのID生成
 *
 * markedは `&` `<` `>` `"` をエスケープするため、デコードしてからIDを生成しないと
 * ToCの表示テキストとIDも同じデコード結果から生成される。
 */

Deno.test("addHeadingIds: &amp; をデコードしてIDを生成", () => {
  const result = addHeadingIds("<h1>Tips &amp; Tricks</h1>").html;

  assertEquals(result, '<h1 id="Tips-&amp;-Tricks">Tips &amp; Tricks</h1>');
});

Deno.test("addHeadingIds: &lt; &gt; をデコードしてIDを生成", () => {
  const result = addHeadingIds("<h2>A &lt; B</h2>").html;

  // generateHeadingId が < を除去するため "A-B" になる
  assertEquals(result, '<h2 id="A-B">A &lt; B</h2>');
});

Deno.test("addHeadingIds: &quot; をデコードしてIDを生成", () => {
  const result = addHeadingIds("<h3>He said &quot;hi&quot;</h3>").html;

  assertEquals(result, '<h3 id="He-said-hi">He said &quot;hi&quot;</h3>');
});

Deno.test("addHeadingIds: ID属性値はHTMLエスケープされる", () => {
  const result = addHeadingIds("<h1>A &amp; B</h1>").html;

  // 属性値内に生の & を出力しない
  assertEquals(result.includes('id="A-&-B"'), false);
  assertEquals(result.includes('id="A-&amp;-B"'), true);
});

/**
 * 見出しリストの返却
 *
 * ToCはこのリストから構築されるため、id属性とToCのIDは構造的に一致する。
 */

Deno.test("addHeadingIds: 見出しリストをドキュメント順で返す", () => {
  const { headings } = addHeadingIds(
    "<h1>Title</h1><h2>Section</h2><h3>Detail</h3>",
  );

  assertEquals(headings, [
    { level: 1, text: "Title", id: "Title" },
    { level: 2, text: "Section", id: "Section" },
    { level: 3, text: "Detail", id: "Detail" },
  ]);
});

Deno.test("addHeadingIds: H4以降は見出しリストに含めない", () => {
  const { headings } = addHeadingIds("<h3>Keep</h3><h4>Skip</h4>");

  assertEquals(headings.map((h) => h.text), ["Keep"]);
});

Deno.test("addHeadingIds: IDが空になる見出しは見出しリストに含めない", () => {
  const { html, headings } = addHeadingIds("<h1>((()))</h1><h2>Real</h2>");

  assertEquals(headings.map((h) => h.id), ["Real"]);
  assertEquals(html.includes("<h1 id="), false);
});

Deno.test("addHeadingIds: 既存id属性の見出しもToCに含め、採番を予約する", () => {
  const { html, headings } = addHeadingIds(
    '<h1 id="Intro">Intro</h1><h2>Intro</h2>',
  );

  // 既存IDは維持され、同じIDでToCにも含まれる
  assertEquals(headings.map((h) => h.id), ["Intro", "Intro-1"]);
  // 後続の自動採番が既存IDと衝突しない
  assertEquals(html.includes('<h1 id="Intro">'), true);
  assertEquals(html.includes('<h2 id="Intro-1">'), true);
});

Deno.test("addHeadingIds: 既存の連番IDと後続の自動採番が衝突しない", () => {
  const { html, headings } = addHeadingIds(
    '<h1 id="Intro-1">Fixed</h1><h2>Intro</h2><h2>Intro</h2>',
  );

  assertEquals(headings.map((h) => h.id), ["Intro-1", "Intro", "Intro-2"]);
  assertEquals(html.includes('<h2 id="Intro-1">Intro</h2>'), false);
  assertEquals(html.includes('<h2 id="Intro-2">Intro</h2>'), true);
});

/**
 * Markdown記法を含む見出しのID・表示テキスト
 *
 * かつてはMarkdownトークンからToCを組み立てていたため、表示テキストに
 * `**bold**` のような記法がそのまま残っていた。HTML由来に統一して解消。
 */

Deno.test("addHeadingIds: Markdown記法を含む見出しのIDと表示テキスト", async (t) => {
  const cases: [string, string, string, string][] = [
    ["ボールド", "# **bold** text", "bold-text", "bold text"],
    ["インラインコード", "# `inline code`", "inline-code", "inline code"],
    ["取り消し線", "# ~~strikethrough~~", "strikethrough", "strikethrough"],
    [
      "ボールドイタリック",
      "# ***bold italic*** text",
      "bold-italic-text",
      "bold italic text",
    ],
    [
      "リンク",
      "# [link text](http://example.com)",
      "link-text",
      "link text",
    ],
    ["画像", "# image ![alt](img.png) here", "image-here", "image  here"],
    [
      "ボールドリンク",
      "# [**bold link**](http://example.com)",
      "bold-link",
      "bold link",
    ],
    ["日本語", "# 日本語の見出し", "日本語の見出し", "日本語の見出し"],
    [
      "記号混在",
      "# ADR-001: domain/層の導入",
      "ADR-001-domain層の導入",
      "ADR-001: domain/層の導入",
    ],
    [
      "参照リンク",
      "# [link text][ref]\n\n[ref]: http://example.com",
      "link-text",
      "link text",
    ],
    [
      "HTMLタグ",
      "# text with <em>html</em>",
      "text-with-html",
      "text with html",
    ],
  ];

  for (const [desc, md, expectedId, expectedText] of cases) {
    await t.step(desc, () => {
      const { headings } = addHeadingIds(marked.parse(md) as string);

      assertEquals(headings[0].id, expectedId, `id for ${md}`);
      assertEquals(headings[0].text, expectedText, `text for ${md}`);
    });
  }
});

/**
 * 既存id属性の検出（id属性の重複出力防止）
 *
 * 引用符の種類や値なしの形式を取りこぼすと id属性が2つ出力され、
 * ブラウザは先頭を採用するためToCリンクが機能しなくなる。
 */

Deno.test("addHeadingIds: 既存id属性を全ての記法で検出する", async (t) => {
  const cases: [string, string, string[]][] = [
    ["ダブルクォート", '<h1 id="Existing">Title</h1>', ["Existing"]],
    ["シングルクォート", "<h1 id='Existing'>Title</h1>", ["Existing"]],
    ["引用符なし", "<h1 id=Existing>Title</h1>", ["Existing"]],
    ["大文字", '<h1 ID="Existing">Title</h1>', ["Existing"]],
    ["値なし", "<h1 id>Title</h1>", []],
    ["空白あり", '<h1 id = "Existing">Title</h1>', ["Existing"]],
  ];

  for (const [desc, html, expectedIds] of cases) {
    await t.step(desc, () => {
      const result = addHeadingIds(html);

      // 元のHTMLのまま（id属性を追加しない）
      assertEquals(result.html, html);
      assertEquals(result.headings.map((heading) => heading.id), expectedIds);
    });
  }
});

Deno.test("addHeadingIds: id以外の属性は既存idと誤認しない", () => {
  assertEquals(
    addHeadingIds('<h1 data-id="x">Title</h1>').html,
    '<h1 data-id="x" id="Title">Title</h1>',
  );
  assertEquals(
    addHeadingIds('<h1 class="identifier">Title</h1>').html,
    '<h1 class="identifier" id="Title">Title</h1>',
  );
});
