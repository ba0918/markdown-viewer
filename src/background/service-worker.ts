/// <reference types="@types/chrome" />

import { handleBackgroundMessage } from '../messaging/handlers/background-handler.ts';
import { createOffscreenDocument } from './offscreen-manager.ts';
import './offscreen-test.ts'; // グローバル関数として読み込み

/**
 * Service Worker (Background Script)
 *
 * 責務: messaging I/O のみ
 *
 * ❌ 絶対禁止: ビジネスロジック、domain/services直接呼び出し
 * ✅ OK: handlerへの委譲のみ
 */

/**
 * 拡張機能インストール時
 */
chrome.runtime.onInstalled.addListener(async () => {
  console.log('Markdown Viewer installed');

  // [実験] offscreen document作成テスト
  try {
    await createOffscreenDocument('Experimental Hot Reload file fetching');
    console.log('[Experiment] Offscreen document created successfully');
  } catch (error) {
    console.error('[Experiment] Failed to create offscreen document:', error);
  }
});

/**
 * メッセージ受信ハンドラ
 * ✅ OK: handlerに委譲するだけ
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleBackgroundMessage(message)
    .then(sendResponse)
    .catch(error => sendResponse({ success: false, error: error.message }));

  // 非同期レスポンスのためtrueを返す
  return true;
});
