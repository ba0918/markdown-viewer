/// <reference types="@types/chrome" />

/**
 * Offscreen Document Fetch Test
 *
 * 実験用: offscreen documentを使ってWSL2ファイルをfetchできるかテスト
 */

import { createOffscreenDocument } from './offscreen-manager.ts';

export async function testOffscreenFetch(url: string): Promise<void> {
  console.log('[OffscreenTest] Starting fetch test for:', url);

  // offscreen documentが存在することを確認
  await createOffscreenDocument('Test file fetching');

  try {
    // offscreen documentにfetchリクエスト送信
    const response = await chrome.runtime.sendMessage({
      type: 'FETCH_FILE',
      payload: { url },
    });

    if (response.success) {
      console.log('[OffscreenTest] ✅ Fetch SUCCESS:', {
        url,
        status: response.data.status,
        lastModified: response.data.lastModified,
      });
    } else {
      console.error('[OffscreenTest] ❌ Fetch FAILED:', {
        url,
        error: response.error,
      });
    }
  } catch (error) {
    console.error('[OffscreenTest] ❌ Exception:', error);
  }
}

// グローバルに公開（Consoleから手動実行できるように）
(globalThis as any).testOffscreenFetch = testOffscreenFetch;

console.log('[OffscreenTest] Test function loaded. Usage:');
console.log('  testOffscreenFetch("file:///C:/path/to/file.md")');
console.log('  testOffscreenFetch("file://wsl.localhost/Ubuntu-24.04/home/user/file.md")');
console.log('  testOffscreenFetch("http://localhost:8000/file.md")');
