/// <reference types="@types/chrome" />

import { handleBackgroundMessage } from "../messaging/handlers/background-handler.ts";

/**
 * Service Worker (Background Script)
 *
 * 責務: messaging I/O のみ
 *
 * ❌ 絶対禁止: ビジネスロジック、domain/services直接呼び出し
 * ✅ OK: handlerへの委譲のみ
 */

/**
 * カスタムドメインのContent Scriptを再登録
 * 拡張リロード時にContent Script登録が消えるため、起動時に再登録する
 */
async function reregisterCustomOrigins() {
  try {
    // Storageからカスタムドメイン一覧を取得
    const result = await chrome.storage.sync.get(["customOrigins"]);
    const customOrigins = result.customOrigins as Array<{
      origin: string;
      addedAt: number;
    }> || [];

    if (customOrigins.length === 0) {
      console.log("No custom origins to register");
      return;
    }

    // 既存の登録済みContent Scriptをクリア
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
        console.log(`Unregistered ${customScriptIds.length} custom scripts`);
      }
    } catch (e) {
      console.warn("Failed to unregister existing scripts:", e);
    }

    // 各カスタムドメインのContent Scriptを登録
    for (const item of customOrigins) {
      try {
        // IDはドメインをBase64エンコードして一意性を確保（URLセーフ）
        const scriptId = `custom-origin-${
          btoa(item.origin).replace(
            /[+/=]/g,
            (c) => ({ "+": "-", "/": "_", "=": "" }[c] || c),
          )
        }`;
        await chrome.scripting.registerContentScripts([{
          id: scriptId,
          matches: [item.origin],
          js: ["content.js"],
          runAt: "document_start",
        }]);
        console.log(
          `Registered Content Script for ${item.origin} (id: ${scriptId})`,
        );
      } catch (err) {
        console.error(`Failed to register script for ${item.origin}:`, err);
      }
    }

    console.log(
      `Successfully re-registered ${customOrigins.length} custom origins`,
    );
  } catch (error) {
    console.error("Failed to re-register custom origins:", error);
  }
}

/**
 * 拡張機能インストール時
 */
chrome.runtime.onInstalled.addListener(() => {
  console.log("Markdown Viewer installed");
  // インストール/更新時にカスタムドメインを再登録
  reregisterCustomOrigins();
});

/**
 * Service Worker起動時（拡張リロード含む）
 */
chrome.runtime.onStartup.addListener(() => {
  console.log("Markdown Viewer started");
  // 起動時にカスタムドメインを再登録
  reregisterCustomOrigins();
});

/**
 * メッセージ受信ハンドラ
 * ✅ OK: handlerに委譲するだけ
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleBackgroundMessage(message, sender)
    .then(sendResponse)
    .catch((error) => sendResponse({ success: false, error: error.message }));

  // 非同期レスポンスのためtrueを返す
  return true;
});
