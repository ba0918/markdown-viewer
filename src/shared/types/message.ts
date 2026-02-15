import type { Theme } from "./theme.ts";
import type { AppState } from "./state.ts";

/**
 * メッセージ型定義
 */
export type Message =
  | { type: "RENDER_MARKDOWN"; payload: { markdown: string; themeId?: Theme } }
  | { type: "LOAD_THEME"; payload: { themeId: Theme } }
  | { type: "UPDATE_THEME"; payload: { themeId: Theme } }
  | {
    type: "UPDATE_HOT_RELOAD";
    payload: { enabled: boolean; interval: number; autoReload: boolean };
  }
  | { type: "CHECK_FILE_CHANGE"; payload: { url: string } }
  | { type: "GET_SETTINGS"; payload: Record<string, never> }
  | { type: "UPDATE_SETTINGS"; payload: Partial<AppState> }
  | {
    type: "GENERATE_EXPORT_HTML";
    payload: {
      html: string;
      themeId: Theme;
      filename: string;
      title?: string;
    };
  }
  | {
    type: "EXPORT_AND_DOWNLOAD";
    payload: {
      html: string;
      themeId: Theme;
      filename: string;
      title?: string;
    };
  }
  | {
    type: "FETCH_LOCAL_IMAGE";
    payload: {
      /** 画像の絶対URL (file:///...) */
      imageUrl: string;
    };
  };

/**
 * メッセージレスポンス型定義
 */
export type MessageResponse<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string };
