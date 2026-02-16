/// <reference types="@types/chrome" />

import { handleBackgroundMessage } from "../messaging/handlers/background-handler.ts";
import { getContentScriptId } from "../shared/utils/encode.ts";

/**
 * Service Worker (Background Script)
 *
 * Chrome拡張のバックグラウンドで動作し、メッセージ受信とContent Script登録を管理する。
 * メッセージ処理はbackground-handlerに委譲する。
 */

/**
 * カスタムドメインのContent Scriptを再登録
 * 拡張リロード時にContent Script登録が消えるため、起動時に再登録する
 */
async function reregisterCustomOrigins() {
  try {
    const result = await chrome.storage.sync.get(["customOrigins"]);
    const customOrigins = result.customOrigins as Array<{
      origin: string;
      addedAt: number;
    }> || [];

    if (customOrigins.length === 0) {
      return;
    }

    try {
      const existingScripts = await chrome.scripting
        .getRegisteredContentScripts();
      const customScriptIds = existingScripts
        .filter((s) => s.id.startsWith("custom-origin-"))
        .map((s) => s.id);

      if (customScriptIds.length > 0) {
        await chrome.scripting.unregisterContentScripts({
          ids: customScriptIds,
        });
      }
    } catch (e) {
      console.warn("Failed to unregister existing scripts:", e);
    }

    for (const item of customOrigins) {
      try {
        const scriptId = getContentScriptId(item.origin);
        await chrome.scripting.registerContentScripts([{
          id: scriptId,
          matches: [item.origin],
          js: ["content.js"],
          runAt: "document_start",
        }]);
      } catch (err) {
        console.error(`Failed to register script for ${item.origin}:`, err);
      }
    }
  } catch (error) {
    console.error("Failed to re-register custom origins:", error);
  }
}

/**
 * 拡張機能インストール時
 */
chrome.runtime.onInstalled.addListener(() => {
  reregisterCustomOrigins();
});

/**
 * Service Worker起動時（拡張リロード含む）
 */
chrome.runtime.onStartup.addListener(() => {
  reregisterCustomOrigins();
});

/**
 * メッセージ受信ハンドラ
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleBackgroundMessage(message, sender)
    .then(sendResponse)
    .catch((error) => sendResponse({ success: false, error: error.message }));

  // 非同期レスポンスのためtrueを返す
  return true;
});
