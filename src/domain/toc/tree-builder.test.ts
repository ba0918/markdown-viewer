/**
 * TOCツリー構築のテスト
 */

import { assertEquals } from "@std/assert";
import { buildTocTree } from "./tree-builder.ts";

Deno.test("buildTocTree: H1のみ（子要素なし）", () => {
  const headings = [
    { level: 1 as const, text: "Title 1", id: "Title-1" },
    { level: 1 as const, text: "Title 2", id: "Title-2" },
  ];

  const result = buildTocTree(headings);

  assertEquals(result.length, 2);
  assertEquals(result[0].level, 1);
  assertEquals(result[0].text, "Title 1");
  assertEquals(result[0].children, []);
  assertEquals(result[1].level, 1);
  assertEquals(result[1].text, "Title 2");
  assertEquals(result[1].children, []);
});

Deno.test("buildTocTree: H1 → H2の階層構造", () => {
  const headings = [
    { level: 1 as const, text: "Title", id: "Title" },
    { level: 2 as const, text: "Section", id: "Section" },
  ];

  const result = buildTocTree(headings);

  // ルートはH1のみ
  assertEquals(result.length, 1);
  assertEquals(result[0].level, 1);
  assertEquals(result[0].text, "Title");

  // H2はH1の子要素
  assertEquals(result[0].children.length, 1);
  assertEquals(result[0].children[0].level, 2);
  assertEquals(result[0].children[0].text, "Section");
  assertEquals(result[0].children[0].children, []);
});

Deno.test("buildTocTree: H1 → H2 → H3の階層構造", () => {
  const headings = [
    { level: 1 as const, text: "Main", id: "Main" },
    { level: 2 as const, text: "Section", id: "Section" },
    { level: 3 as const, text: "Subsection", id: "Subsection" },
  ];

  const result = buildTocTree(headings);

  // ルートはH1のみ
  assertEquals(result.length, 1);
  assertEquals(result[0].text, "Main");

  // H1 → H2
  assertEquals(result[0].children.length, 1);
  assertEquals(result[0].children[0].text, "Section");

  // H2 → H3
  assertEquals(result[0].children[0].children.length, 1);
  assertEquals(result[0].children[0].children[0].text, "Subsection");
  assertEquals(result[0].children[0].children[0].children, []);
});

Deno.test("buildTocTree: 複雑な階層構造", () => {
  const headings = [
    { level: 1 as const, text: "H1-1", id: "H1-1" },
    { level: 2 as const, text: "H2-1", id: "H2-1" },
    { level: 3 as const, text: "H3-1", id: "H3-1" },
    { level: 3 as const, text: "H3-2", id: "H3-2" },
    { level: 2 as const, text: "H2-2", id: "H2-2" },
    { level: 1 as const, text: "H1-2", id: "H1-2" },
    { level: 2 as const, text: "H2-3", id: "H2-3" },
  ];

  const result = buildTocTree(headings);

  // ルートはH1が2つ
  assertEquals(result.length, 2);
  assertEquals(result[0].text, "H1-1");
  assertEquals(result[1].text, "H1-2");

  // H1-1の子要素（H2が2つ）
  assertEquals(result[0].children.length, 2);
  assertEquals(result[0].children[0].text, "H2-1");
  assertEquals(result[0].children[1].text, "H2-2");

  // H2-1の子要素（H3が2つ）
  assertEquals(result[0].children[0].children.length, 2);
  assertEquals(result[0].children[0].children[0].text, "H3-1");
  assertEquals(result[0].children[0].children[1].text, "H3-2");

  // H2-2の子要素（なし）
  assertEquals(result[0].children[1].children, []);

  // H1-2の子要素（H2が1つ）
  assertEquals(result[1].children.length, 1);
  assertEquals(result[1].children[0].text, "H2-3");
  assertEquals(result[1].children[0].children, []);
});

Deno.test("buildTocTree: H2から始まる場合", () => {
  const headings = [
    { level: 2 as const, text: "Section", id: "Section" },
    { level: 3 as const, text: "Subsection", id: "Subsection" },
  ];

  const result = buildTocTree(headings);

  // H2がルートになる
  assertEquals(result.length, 1);
  assertEquals(result[0].level, 2);
  assertEquals(result[0].text, "Section");

  // H3はH2の子要素
  assertEquals(result[0].children.length, 1);
  assertEquals(result[0].children[0].text, "Subsection");
});
