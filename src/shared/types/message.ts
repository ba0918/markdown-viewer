import type { Theme } from './theme.ts';

/**
 * メッセージ型定義
 */
export type Message =
  | { type: 'RENDER_MARKDOWN'; payload: { markdown: string; themeId?: string } }
  | { type: 'LOAD_THEME'; payload: { themeId: string } }
  | { type: 'UPDATE_THEME'; payload: Theme };

/**
 * メッセージレスポンス型定義
 */
export type MessageResponse<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string };
