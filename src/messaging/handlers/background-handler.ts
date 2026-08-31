import { createActionRegistry } from "./action-registry.ts";
import type { Message, MessageResponse } from "../types.ts";

const registry = createActionRegistry();

/**
 * background層のメッセージハンドラ
 *
 * content scriptからのメッセージを受信し、適切なactionへルーティングする。
 * 各actionはactions/ディレクトリに分離され、バリデーション + service委譲を担当。
 *
 * ランタイムバリデーション（各action内で実施）:
 * - 全ペイロードの型チェック（TypeScript型だけでなくランタイムでも検証）
 * - URL系はisLocalUrl()でローカル限定チェック（SSRF防止）
 * - themeIdはVALID_THEMESでバリデーション
 */
export const handleBackgroundMessage = async (
  message: Message,
  _sender?: { tab?: { id?: number } },
): Promise<MessageResponse> => {
  try {
    // Object.hasOwn でプロトタイプチェーン（toString, constructor 等）への
    // 意図しないヒットを防ぐ。message.type は外部入力のため必須。
    const type = message?.type;
    if (typeof type !== "string" || !Object.hasOwn(registry, type)) {
      return { success: false, error: "Unknown message type" };
    }
    const action = registry[type];
    return await action(message?.payload);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};
