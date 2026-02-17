import type { Message, MessageResponse } from "./types.ts";

/**
 * メッセージ送信ヘルパー
 * chrome.runtime.sendMessage() のラッパー
 *
 * @param message - 送信するメッセージ
 * @returns レスポンスデータ
 * @throws エラー時は Error をスロー
 */
export const sendMessage = async <T = unknown>(
  message: Message,
): Promise<T> => {
  const response: MessageResponse<T> | undefined = await chrome.runtime
    .sendMessage(
      message,
    );

  // Background Script未起動時（拡張リロード中など）はundefinedが返る
  if (!response) {
    throw new Error(
      "No response from background script. The extension may be reloading.",
    );
  }

  if (!response.success) {
    throw new Error(response.error);
  }

  return response.data;
};
