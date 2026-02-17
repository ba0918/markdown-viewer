import type { AppState } from "../shared/types/state.ts";
import type { Theme } from "../shared/types/theme.ts";
import { DEFAULT_THEME, VALID_THEMES } from "../shared/constants/themes.ts";

/** save/saveAndLoad用の部分状態型 */
type PartialAppState = Partial<Omit<AppState, "hotReload">> & {
  hotReload?: Partial<AppState["hotReload"]>;
};

/**
 * StateManager
 *
 * Chrome Storage Sync APIを使用してアプリケーション状態（テーマ、Hot Reload設定等）を
 * 永続化・読み込みする。不正データ時はデフォルト値にフォールバック。
 *
 * save()操作はPromise-based mutexで排他制御され、
 * 並行呼び出し時のレースコンディション（lost update）を防止する。
 */
export class StateManager {
  private readonly STORAGE_KEY = "appState";

  /** save操作の排他制御用Promiseチェーン */
  private _mutex: Promise<void> = Promise.resolve();

  /**
   * デフォルト状態
   */
  private readonly DEFAULT_STATE: AppState = {
    theme: DEFAULT_THEME,
    hotReload: {
      enabled: false,
      interval: 3000, // デフォルト3秒（最小値2000ms）
      autoReload: false,
    },
  };

  /**
   * 排他制御付きで操作を実行する。
   * 前の操作が完了するまで待機し、操作を直列化する。
   * fnがエラーをthrowしても後続の操作はブロックされない。
   */
  private _withLock<T>(fn: () => Promise<T>): Promise<T> {
    const next = this._mutex.then(fn);
    // エラーが発生してもチェーンを壊さない
    this._mutex = next.then(
      () => {},
      () => {},
    );
    return next;
  }

  /**
   * 現在の状態と部分状態をマージする（内部用）。
   * hotReloadは深くマージされるため、部分的なフィールドのみの更新も可能。
   */
  private _mergeState(
    currentState: AppState,
    partialState: PartialAppState,
  ): AppState {
    return {
      ...currentState,
      ...partialState,
      hotReload: {
        ...currentState.hotReload,
        ...(partialState.hotReload || {}),
      },
    };
  }

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

      const theme = VALID_THEMES.includes(stored.theme as Theme)
        ? (stored.theme as Theme)
        : this.DEFAULT_STATE.theme;

      const hotReload = {
        enabled: typeof stored.hotReload?.enabled === "boolean"
          ? stored.hotReload.enabled
          : this.DEFAULT_STATE.hotReload.enabled,
        interval: typeof stored.hotReload?.interval === "number" &&
            stored.hotReload.interval >= 2000
          ? stored.hotReload.interval
          : this.DEFAULT_STATE.hotReload.interval,
        autoReload: typeof stored.hotReload?.autoReload === "boolean"
          ? stored.hotReload.autoReload
          : this.DEFAULT_STATE.hotReload.autoReload,
      };

      return { theme, hotReload };
    } catch (_error) {
      return this.DEFAULT_STATE;
    }
  }

  /**
   * 状態を保存する（部分更新）
   *
   * 排他制御により、並行呼び出し時もload→merge→setが直列化される。
   */
  async save(partialState: PartialAppState): Promise<void> {
    await this._withLock(async () => {
      const currentState = await this.load();
      const newState = this._mergeState(currentState, partialState);
      await chrome.storage.sync.set({ [this.STORAGE_KEY]: newState });
    });
  }

  /**
   * 状態を保存し、保存後の状態を返す（アトミック操作）。
   *
   * save→loadを同一クリティカルセクション内で実行し、
   * 別のsave()が間に割り込んで不整合な状態を返すのを防ぐ。
   */
  async saveAndLoad(partialState: PartialAppState): Promise<AppState> {
    return await this._withLock(async () => {
      const currentState = await this.load();
      const newState = this._mergeState(currentState, partialState);
      await chrome.storage.sync.set({ [this.STORAGE_KEY]: newState });
      return newState;
    });
  }

  /**
   * テーマのみを更新する
   */
  async updateTheme(theme: Theme): Promise<void> {
    await this.save({ theme });
  }

  /**
   * HotReload設定のみを更新する
   *
   * save()内でload()→マージ→保存を行うため、外側でのload()は不要。
   * 冗長なload()を排除してレースコンディションリスクを低減。
   */
  async updateHotReload(
    hotReload: Partial<AppState["hotReload"]>,
  ): Promise<void> {
    await this.save({ hotReload });
  }
}
