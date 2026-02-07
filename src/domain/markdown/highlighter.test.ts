import { assertEquals, assertStringIncludes } from '@std/assert';
import { highlightCode } from './highlighter.ts';

/**
 * highlighter.ts のユニットテスト
 */

Deno.test('highlightCode: JavaScript コードをハイライト', () => {
  const code = 'const x = 42;';
  const result = highlightCode(code, 'javascript');

  // ハイライトされたHTMLが返される
  assertStringIncludes(result, '<span');
  assertStringIncludes(result, 'const');
  assertStringIncludes(result, '42');
});

Deno.test('highlightCode: TypeScript コードをハイライト', () => {
  const code = 'const x: number = 42;';
  const result = highlightCode(code, 'typescript');

  // ハイライトされたHTMLが返される
  assertStringIncludes(result, '<span');
  assertStringIncludes(result, 'const');
  assertStringIncludes(result, 'number');
});

Deno.test('highlightCode: Python コードをハイライト', () => {
  const code = 'def hello():\n    print("Hello")';
  const result = highlightCode(code, 'python');

  // ハイライトされたHTMLが返される
  assertStringIncludes(result, '<span');
  assertStringIncludes(result, 'def');
  assertStringIncludes(result, 'print');
});

Deno.test('highlightCode: エイリアス言語名（js）', () => {
  const code = 'const x = 42;';
  const result = highlightCode(code, 'js');

  // javascript と同じ結果
  assertStringIncludes(result, '<span');
  assertStringIncludes(result, 'const');
});

Deno.test('highlightCode: 未対応言語はplaintextとして処理', () => {
  const code = 'some unknown language';
  const result = highlightCode(code, 'unknownlang');

  // コードがそのまま返される（ハイライトなし）
  assertEquals(result, code);
});

Deno.test('highlightCode: 空文字列を処理', () => {
  const result = highlightCode('', 'javascript');

  // 空文字列が返される
  assertEquals(result, '');
});

Deno.test('highlightCode: 複数行のコード', () => {
  const code = `function test() {
  return 42;
}`;
  const result = highlightCode(code, 'javascript');

  // 複数行がハイライトされる
  assertStringIncludes(result, 'function');
  assertStringIncludes(result, 'return');
  assertStringIncludes(result, '42');
});

Deno.test('highlightCode: 特殊文字を含むコード', () => {
  const code = 'const str = "<script>alert(1)</script>";';
  const result = highlightCode(code, 'javascript');

  // highlight.jsはHTMLエスケープを行う
  assertStringIncludes(result, '&lt;script&gt;');
  assertStringIncludes(result, 'alert');
});
