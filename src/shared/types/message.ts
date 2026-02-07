import type { Theme } from './theme.ts';
import type { AppState } from './state.ts';

/**
 * メッセージ型定義
 */
export type Message =
  | { type: 'RENDER_MARKDOWN'; payload: { markdown: string; themeId?: Theme } }
  | { type: 'LOAD_THEME'; payload: { themeId: Theme } }
  | { type: 'UPDATE_THEME'; payload: { themeId: Theme } }
  | { type: 'GET_SETTINGS'; payload: Record<string, never> }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<AppState> };

/**
 * メッセージレスポンス型定義
 */
export type MessageResponse<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string };
