import type { AppState } from "../shared/types/state.ts";
import type { Theme } from "../shared/types/theme.ts";
import { DEFAULT_THEME, VALID_THEMES } from "../shared/constants/themes.ts";

// Chrome API型定義（実行時はグローバルに存在する）
// テスト時はモックで上書きされる
declare const chrome: {
  storage: {
    sync: {
      get: (keys: string | string[] | null) => Promise<Record<string, unknown>>;
      set: (items: Record<string, unknown>) => Promise<void>;
      clear: () => Promise<void>;
    };
  };
};

/**
 * StateManager
 *
 * 責務: Chrome Storage Sync APIとの通信、状態の読み書き、デフォルト値の管理
 *
 * レイヤー: background層（Chrome API直接使用可能）
 */
export class StateManager {
  private readonly STORAGE_KEY = "appState";

  /**
   * デフォルト状態
   */
  private readonly DEFAULT_STATE: AppState = {
    theme: DEFAULT_THEME,
    hotReload: {
      enabled: false,
      interval: 3000, // デフォルト3秒（最小値1000ms）
      autoReload: false,
    },
  };

  /**
   * 状態を読み込む
   *
   * ストレージにデータがない場合はデフォルト値を返す
   * 不正なデータの場合もデフォルト値にフォールバック
   */
  async load(): Promise<AppState> {
    try {
      const result = await chrome.storage.sync.get(this.STORAGE_KEY);
      const stored = result[this.STORAGE_KEY] as Partial<AppState> | undefined;

      if (!stored) {
        return this.DEFAULT_STATE;
      }

      // バリデーション: theme が valid かチェック
      const theme = VALID_THEMES.includes(stored.theme as Theme)
        ? (stored.theme as Theme)
        : this.DEFAULT_STATE.theme;

      // hotReload設定をマージ
      const hotReload = {
        ...this.DEFAULT_STATE.hotReload,
        ...stored.hotReload,
      };

      return { theme, hotReload };
    } catch (_error) {
      // エラー時はデフォルトを返す
      return this.DEFAULT_STATE;
    }
  }

  /**
   * 状態を保存する（部分更新）
   *
   * 既存の状態とマージして保存
   */
  async save(partialState: Partial<AppState>): Promise<void> {
    const currentState = await this.load();
    const newState: AppState = {
      ...currentState,
      ...partialState,
      // hotReloadは深くマージ
      hotReload: {
        ...currentState.hotReload,
        ...(partialState.hotReload || {}),
      },
    };

    await chrome.storage.sync.set({ [this.STORAGE_KEY]: newState });
  }

  /**
   * テーマのみを更新する
   */
  async updateTheme(theme: Theme): Promise<void> {
    await this.save({ theme });
  }

  /**
   * HotReload設定のみを更新する
   */
  async updateHotReload(
    hotReload: Partial<AppState["hotReload"]>,
  ): Promise<void> {
    const currentState = await this.load();
    await this.save({
      hotReload: {
        ...currentState.hotReload,
        ...hotReload,
      },
    });
  }
}
