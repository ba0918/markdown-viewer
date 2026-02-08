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
  const response: MessageResponse<T> = await chrome.runtime.sendMessage(
    message,
  );

  if (!response.success) {
    throw new Error(response.error);
  }

  return response.data;
};
