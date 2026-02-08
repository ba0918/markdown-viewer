/**
 * TOC抽出ロジックのテスト
 */

import { assertEquals } from '@std/assert';
import { generateHeadingId, extractHeadings, buildTocTree } from './extractor.ts';

Deno.test('generateHeadingId: 基本的な変換', () => {
  assertEquals(generateHeadingId('Hello World'), 'hello-world');
  assertEquals(generateHeadingId('API Reference'), 'api-reference');
  assertEquals(generateHeadingId('Getting Started'), 'getting-started');
});

Deno.test('generateHeadingId: 特殊文字を削除', () => {
  assertEquals(generateHeadingId('Hello World!'), 'hello-world');
  assertEquals(generateHeadingId('API (v2.0)'), 'api-v20');
  assertEquals(generateHeadingId('C++ Programming'), 'c-programming');
  assertEquals(generateHeadingId('$100 Budget'), '100-budget');
});

Deno.test('generateHeadingId: 連続する空白とアンダースコア', () => {
  assertEquals(generateHeadingId('Hello   World'), 'hello-world');
  assertEquals(generateHeadingId('snake_case_example'), 'snake-case-example');
  assertEquals(generateHeadingId('mixed _ spaces'), 'mixed-spaces');
});

Deno.test('generateHeadingId: 先頭/末尾のハイフン削除', () => {
  assertEquals(generateHeadingId('-leading'), 'leading');
  assertEquals(generateHeadingId('trailing-'), 'trailing');
  assertEquals(generateHeadingId('--both--'), 'both');
});

Deno.test('generateHeadingId: 空文字列', () => {
  assertEquals(generateHeadingId(''), '');
  assertEquals(generateHeadingId('   '), '');
  assertEquals(generateHeadingId('!!!'), '');
});

Deno.test('extractHeadings: H1のみ', () => {
  const markdown = '# Title\n\nSome content.';
  const result = extractHeadings(markdown);

  assertEquals(result.length, 1);
  assertEquals(result[0].level, 1);
  assertEquals(result[0].text, 'Title');
  assertEquals(result[0].id, 'title');
});

Deno.test('extractHeadings: H1-H3混在', () => {
  const markdown = `
# Main Title
## Section 1
### Subsection 1.1
## Section 2
### Subsection 2.1
### Subsection 2.2
  `.trim();

  const result = extractHeadings(markdown);

  assertEquals(result.length, 6);
  assertEquals(result[0], { level: 1, text: 'Main Title', id: 'main-title' });
  assertEquals(result[1], { level: 2, text: 'Section 1', id: 'section-1' });
  assertEquals(result[2], { level: 3, text: 'Subsection 1.1', id: 'subsection-11' });
  assertEquals(result[3], { level: 2, text: 'Section 2', id: 'section-2' });
  assertEquals(result[4], { level: 3, text: 'Subsection 2.1', id: 'subsection-21' });
  assertEquals(result[5], { level: 3, text: 'Subsection 2.2', id: 'subsection-22' });
});

Deno.test('extractHeadings: H4-H6を無視', () => {
  const markdown = `
# H1 Title
## H2 Title
### H3 Title
#### H4 Title
##### H5 Title
###### H6 Title
  `.trim();

  const result = extractHeadings(markdown);

  assertEquals(result.length, 3);
  assertEquals(result[0].level, 1);
  assertEquals(result[1].level, 2);
  assertEquals(result[2].level, 3);
});

Deno.test('extractHeadings: 見出しなし', () => {
  const markdown = 'Just a paragraph.\n\nAnother paragraph.';
  const result = extractHeadings(markdown);

  assertEquals(result.length, 0);
});

Deno.test('extractHeadings: 特殊文字を含む見出し', () => {
  const markdown = `
# API Reference (v2.0)
## Getting Started!
### C++ Programming
  `.trim();

  const result = extractHeadings(markdown);

  assertEquals(result.length, 3);
  assertEquals(result[0].id, 'api-reference-v20');
  assertEquals(result[1].id, 'getting-started');
  assertEquals(result[2].id, 'c-programming');
});

Deno.test('buildTocTree: フラット構造を維持', () => {
  const headings = [
    { level: 1 as const, text: 'Title', id: 'title' },
    { level: 2 as const, text: 'Section', id: 'section' },
  ];

  const result = buildTocTree(headings);

  assertEquals(result.length, 2);
  assertEquals(result[0].level, 1);
  assertEquals(result[0].text, 'Title');
  assertEquals(result[0].children, []);
  assertEquals(result[1].level, 2);
  assertEquals(result[1].text, 'Section');
  assertEquals(result[1].children, []);
});
