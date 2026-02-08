import type { Theme } from "./theme.ts";

/**
 * アプリケーション状態
 */
export interface AppState {
  /** テーマ設定 */
  theme: Theme;

  /** Hot Reload設定 */
  hotReload: {
    /** Hot Reload有効化 */
    enabled: boolean;
    /** チェック間隔（秒）。0 = タブフォーカス時のみ */
    interval: number;
    /** 自動リロード（通知なし） */
    autoReload: boolean;
  };
}
