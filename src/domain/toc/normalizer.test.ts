/**
 * ToC見出しレベル正規化テスト
 *
 * TDD: RED フェーズ - テストを先に書く
 */

import { assertEquals } from '@std/assert';
import { normalizeHeadingLevels } from './normalizer.ts';
import type { TocHeading } from './types.ts';

Deno.test('normalizeHeadingLevels: h1から始まる正常な文書 - 正規化なし', () => {
  const headings: TocHeading[] = [
    { level: 1, text: 'Title', id: 'Title' },
    { level: 2, text: 'Section 1', id: 'Section-1' },
    { level: 3, text: 'Sub 1.1', id: 'Sub-1.1' },
  ];

  const result = normalizeHeadingLevels(headings);

  // 最小レベルが1の場合、正規化の影響なし
  assertEquals(result.length, 3);
  assertEquals(result[0].level, 1);
  assertEquals(result[1].level, 2);
  assertEquals(result[2].level, 3);
  assertEquals(result[0].text, 'Title');
  assertEquals(result[1].text, 'Section 1');
  assertEquals(result[2].text, 'Sub 1.1');
});

Deno.test('normalizeHeadingLevels: h2から始まる文書 - h2→疑似h1に正規化', () => {
  const headings: TocHeading[] = [
    { level: 2, text: 'Introduction', id: 'Introduction' },
    { level: 3, text: 'Overview', id: 'Overview' },
    { level: 3, text: 'Features', id: 'Features' },
    { level: 2, text: 'Setup', id: 'Setup' },
  ];

  const result = normalizeHeadingLevels(headings);

  // 最小レベルが2 → h2を1、h3を2に正規化
  assertEquals(result.length, 4);
  assertEquals(result[0].level, 1); // h2 → h1
  assertEquals(result[1].level, 2); // h3 → h2
  assertEquals(result[2].level, 2); // h3 → h2
  assertEquals(result[3].level, 1); // h2 → h1
  assertEquals(result[0].text, 'Introduction');
  assertEquals(result[1].text, 'Overview');
});

Deno.test('normalizeHeadingLevels: h3から始まる文書 - h3→疑似h1に正規化', () => {
  const headings: TocHeading[] = [
    { level: 3, text: 'Section 1', id: 'Section-1' },
    { level: 3, text: 'Section 2', id: 'Section-2' },
    { level: 2, text: 'Part A', id: 'Part-A' },
  ];

  const result = normalizeHeadingLevels(headings);

  // 最小レベルが2 → h3を2、h2を1に正規化
  assertEquals(result.length, 3);
  assertEquals(result[0].level, 2); // h3 → h2 (最小がh2なので)
  assertEquals(result[1].level, 2); // h3 → h2
  assertEquals(result[2].level, 1); // h2 → h1 (最小レベルなので)
  assertEquals(result[0].text, 'Section 1');
  assertEquals(result[2].text, 'Part A');
});

Deno.test('normalizeHeadingLevels: 空配列 - 空配列を返す', () => {
  const headings: TocHeading[] = [];

  const result = normalizeHeadingLevels(headings);

  assertEquals(result.length, 0);
});

Deno.test('normalizeHeadingLevels: 混在ケース（h2→h3→h2） - 相対的な階層保持', () => {
  const headings: TocHeading[] = [
    { level: 2, text: 'Chapter 1', id: 'Chapter-1' },
    { level: 3, text: 'Section 1.1', id: 'Section-1.1' },
    { level: 3, text: 'Section 1.2', id: 'Section-1.2' },
    { level: 2, text: 'Chapter 2', id: 'Chapter-2' },
    { level: 3, text: 'Section 2.1', id: 'Section-2.1' },
  ];

  const result = normalizeHeadingLevels(headings);

  // 最小レベルが2 → h2を1、h3を2に正規化
  assertEquals(result.length, 5);
  assertEquals(result[0].level, 1); // h2 → h1
  assertEquals(result[1].level, 2); // h3 → h2
  assertEquals(result[2].level, 2); // h3 → h2
  assertEquals(result[3].level, 1); // h2 → h1
  assertEquals(result[4].level, 2); // h3 → h2
  assertEquals(result[0].text, 'Chapter 1');
  assertEquals(result[1].text, 'Section 1.1');
});

Deno.test('normalizeHeadingLevels: 単一見出し（h3のみ） - h3→h1に正規化', () => {
  const headings: TocHeading[] = [
    { level: 3, text: 'Only Heading', id: 'Only-Heading' },
  ];

  const result = normalizeHeadingLevels(headings);

  // 最小レベルが3 → h3を1に正規化
  assertEquals(result.length, 1);
  assertEquals(result[0].level, 1); // h3 → h1
  assertEquals(result[0].text, 'Only Heading');
});

Deno.test('normalizeHeadingLevels: id とtextは変更されない', () => {
  const headings: TocHeading[] = [
    { level: 2, text: 'Test Heading', id: 'test-heading-123' },
  ];

  const result = normalizeHeadingLevels(headings);

  // levelは変わるが、textとidは保持される
  assertEquals(result[0].level, 1);
  assertEquals(result[0].text, 'Test Heading');
  assertEquals(result[0].id, 'test-heading-123');
});
