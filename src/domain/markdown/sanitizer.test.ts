import { assertEquals } from '@std/assert';
import { sanitizeHTML } from './sanitizer.ts';

/**
 * XSS攻撃ベクターテスト
 * セキュリティファースト：全てのXSS攻撃をブロックする
 */

Deno.test('XSS: javascript: protocol', async () => {
  const malicious = '<a href="javascript:alert(\'XSS\')">Click</a>';
  const result = await sanitizeHTML(malicious);
  assertEquals(result.includes('javascript:'), false);
});

Deno.test('XSS: onerror attribute', async () => {
  const malicious = '<img src="x" onerror="alert(\'XSS\')">';
  const result = await sanitizeHTML(malicious);
  assertEquals(result.includes('onerror'), false);
});

Deno.test('XSS: onclick attribute', async () => {
  const malicious = '<button onclick="alert(\'XSS\')">Click</button>';
  const result = await sanitizeHTML(malicious);
  assertEquals(result.includes('onclick'), false);
});

Deno.test('XSS: onload attribute', async () => {
  const malicious = '<body onload="alert(\'XSS\')">';
  const result = await sanitizeHTML(malicious);
  assertEquals(result.includes('onload'), false);
});

Deno.test('XSS: script tag', async () => {
  const malicious = '<script>alert(\'XSS\')</script>';
  const result = await sanitizeHTML(malicious);
  assertEquals(result.includes('<script'), false);
  assertEquals(result.includes('alert'), false);
});

Deno.test('正常なHTML: リンク保持', async () => {
  const valid = '<a href="https://example.com">Link</a>';
  const result = await sanitizeHTML(valid);
  assertEquals(result.includes('https://example.com'), true);
  assertEquals(result.includes('Link'), true);
});

Deno.test('正常なHTML: 画像保持', async () => {
  const valid = '<img src="https://example.com/image.png" alt="Test">';
  const result = await sanitizeHTML(valid);
  assertEquals(result.includes('https://example.com/image.png'), true);
  assertEquals(result.includes('alt'), true);
});

Deno.test('正常なHTML: 基本的なマークアップ保持', async () => {
  const valid = '<p>This is <strong>bold</strong> and <em>italic</em>.</p>';
  const result = await sanitizeHTML(valid);
  assertEquals(result.includes('<p>'), true);
  assertEquals(result.includes('<strong>'), true);
  assertEquals(result.includes('<em>'), true);
});
