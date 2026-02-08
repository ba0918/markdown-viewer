import { assertEquals } from 'jsr:@std/assert';
import { DEFAULT_VIEW_MODE, type ViewMode } from './view-mode.ts';

/**
 * ViewMode型のテスト
 */

Deno.test('ViewMode: should accept "view" as valid type', () => {
  const mode: ViewMode = 'view';
  assertEquals(mode, 'view');
});

Deno.test('ViewMode: should accept "raw" as valid type', () => {
  const mode: ViewMode = 'raw';
  assertEquals(mode, 'raw');
});

Deno.test('DEFAULT_VIEW_MODE: should be "view"', () => {
  assertEquals(DEFAULT_VIEW_MODE, 'view');
});
