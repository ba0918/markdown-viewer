/**
 * Chrome Extension API 型定義
 *
 * プロジェクト内で使用するChrome APIのサブセットを統一定義。
 * 各ソースファイルでの `declare const chrome` や `/// <reference>` の分散を解消。
 *
 * deno.json の compilerOptions.types で自動読み込みされるため、
 * ソースファイルでの参照記述は不要。
 */
declare const chrome: {
  runtime: {
    /** 拡張機能パッケージ内のリソースURLを取得 */
    getURL: (path: string) => string;
    /** Background Scriptにメッセージを送信 */
    // deno-lint-ignore no-explicit-any
    sendMessage: (message: unknown) => Promise<any>;
    /** 拡張機能インストール/更新時のイベント */
    onInstalled: {
      addListener: (callback: () => void) => void;
    };
    /** ブラウザ起動時のイベント */
    onStartup: {
      addListener: (callback: () => void) => void;
    };
    /** メッセージ受信イベント */
    onMessage: {
      addListener: (
        callback: (
          message: unknown,
          sender: { tab?: { id?: number; url?: string }; id?: string },
          sendResponse: (response: unknown) => void,
        ) => boolean | void,
      ) => void;
    };
  };
  storage: {
    sync: {
      /** ストレージからデータを取得 */
      get: (
        keys: string | string[] | null,
      ) => Promise<Record<string, unknown>>;
      /** ストレージにデータを保存 */
      set: (items: Record<string, unknown>) => Promise<void>;
      /** ストレージを全クリア */
      clear: () => Promise<void>;
    };
    onChanged: {
      /** ストレージ変更リスナーを登録 */
      addListener: (
        callback: (
          changes: Record<string, { newValue?: unknown; oldValue?: unknown }>,
          area: string,
        ) => void,
      ) => void;
    };
  };
  scripting: {
    /** 登録済みContent Scriptを取得 */
    getRegisteredContentScripts: () => Promise<
      Array<{ id: string; matches?: string[] }>
    >;
    /** Content Scriptを動的に登録 */
    registerContentScripts: (
      scripts: Array<{
        id: string;
        matches: string[];
        js: string[];
        runAt?: string;
      }>,
    ) => Promise<void>;
    /** Content Scriptの登録を解除 */
    unregisterContentScripts: (filter?: { ids: string[] }) => Promise<void>;
  };
};
