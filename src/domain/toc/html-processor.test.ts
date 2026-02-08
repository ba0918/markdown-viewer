/**
 * HTML見出しID付与処理のテスト
 */

import { assertEquals } from '@std/assert';
import { addHeadingIds } from './html-processor.ts';

Deno.test('addHeadingIds: H1タグにIDを追加', () => {
  const html = '<h1>Hello World</h1>';
  const result = addHeadingIds(html);

  assertEquals(result, '<h1 id="hello-world">Hello World</h1>');
});

Deno.test('addHeadingIds: H1-H3全てにIDを追加', () => {
  const html = `
<h1>Main Title</h1>
<h2>Section 1</h2>
<h3>Subsection 1.1</h3>
  `.trim();

  const result = addHeadingIds(html);

  assertEquals(
    result,
    `<h1 id="main-title">Main Title</h1>
<h2 id="section-1">Section 1</h2>
<h3 id="subsection-11">Subsection 1.1</h3>`
  );
});

Deno.test('addHeadingIds: 既にid属性がある場合はスキップ', () => {
  const html = '<h1 id="custom-id">Title</h1>';
  const result = addHeadingIds(html);

  assertEquals(result, '<h1 id="custom-id">Title</h1>');
});

Deno.test('addHeadingIds: class属性がある場合も動作', () => {
  const html = '<h2 class="my-class">Section</h2>';
  const result = addHeadingIds(html);

  assertEquals(result, '<h2 class="my-class" id="section">Section</h2>');
});

Deno.test('addHeadingIds: 見出し内のHTMLタグを除去してIDを生成', () => {
  const html = '<h1>Hello <strong>World</strong></h1>';
  const result = addHeadingIds(html);

  assertEquals(result, '<h1 id="hello-world">Hello <strong>World</strong></h1>');
});

Deno.test('addHeadingIds: H4-H6は対象外', () => {
  const html = `
<h4>H4 Title</h4>
<h5>H5 Title</h5>
<h6>H6 Title</h6>
  `.trim();

  const result = addHeadingIds(html);

  assertEquals(result, html); // 変更なし
});

Deno.test('addHeadingIds: 複数の見出しが混在', () => {
  const html = `
<h1>Introduction</h1>
<p>Some text</p>
<h2>Getting Started</h2>
<p>More text</p>
<h3>Prerequisites</h3>
  `.trim();

  const result = addHeadingIds(html);

  assertEquals(
    result,
    `<h1 id="introduction">Introduction</h1>
<p>Some text</p>
<h2 id="getting-started">Getting Started</h2>
<p>More text</p>
<h3 id="prerequisites">Prerequisites</h3>`
  );
});
