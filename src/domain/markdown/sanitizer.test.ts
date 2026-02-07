import { assertEquals } from '@std/assert';
import { sanitizeHTML } from './sanitizer.ts';

/**
 * XSS攻撃ベクターテスト
 * セキュリティファースト：全てのXSS攻撃をブロックする
 */

Deno.test('XSS: javascript: protocol', () => {
  const malicious = '<a href="javascript:alert(\'XSS\')">Click</a>';
  const result = sanitizeHTML(malicious);
  assertEquals(result.includes('javascript:'), false);
});

Deno.test('XSS: onerror attribute', () => {
  const malicious = '<img src="x" onerror="alert(\'XSS\')">';
  const result = sanitizeHTML(malicious);
  assertEquals(result.includes('onerror'), false);
});

Deno.test('XSS: onclick attribute', () => {
  const malicious = '<button onclick="alert(\'XSS\')">Click</button>';
  const result = sanitizeHTML(malicious);
  assertEquals(result.includes('onclick'), false);
});

Deno.test('XSS: onload attribute', () => {
  const malicious = '<body onload="alert(\'XSS\')">';
  const result = sanitizeHTML(malicious);
  assertEquals(result.includes('onload'), false);
});

Deno.test('XSS: script tag', () => {
  const malicious = '<script>alert(\'XSS\')</script>';
  const result = sanitizeHTML(malicious);
  assertEquals(result.includes('<script'), false);
  assertEquals(result.includes('alert'), false);
});

Deno.test('正常なHTML: リンク保持', () => {
  const valid = '<a href="https://example.com">Link</a>';
  const result = sanitizeHTML(valid);
  assertEquals(result.includes('https://example.com'), true);
  assertEquals(result.includes('Link'), true);
});

Deno.test('正常なHTML: 画像保持', () => {
  const valid = '<img src="https://example.com/image.png" alt="Test">';
  const result = sanitizeHTML(valid);
  assertEquals(result.includes('https://example.com/image.png'), true);
  assertEquals(result.includes('alt'), true);
});

Deno.test('正常なHTML: 基本的なマークアップ保持', () => {
  const valid = '<p>This is <strong>bold</strong> and <em>italic</em>.</p>';
  const result = sanitizeHTML(valid);
  assertEquals(result.includes('<p>'), true);
  assertEquals(result.includes('<strong>'), true);
  assertEquals(result.includes('<em>'), true);
});
