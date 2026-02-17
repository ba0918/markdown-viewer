import type { MessageResponse } from "../types.ts";

/**
 * Action関数の共通型定義
 *
 * 各メッセージタイプに対応するaction関数はこのシグネチャに従う。
 * payloadはランタイムバリデーションで検証するためunknown型。
 */
export type ActionHandler = (
  payload: unknown,
) => Promise<MessageResponse> | MessageResponse;
