/**
 * Chrome Extension API 型定義
 *
 * プロジェクト内で使用するChrome APIのサブセットを統一定義。
 * 各ソースファイルでの `declare const chrome` の分散を解消。
 *
 * 使用方法: ソースファイル先頭に以下を追加
 *   /// <reference path="../../shared/types/chrome.d.ts" />
 *   （パスは相対位置に応じて調整）
 */
declare const chrome: {
  runtime: {
    /** 拡張機能パッケージ内のリソースURLを取得 */
    getURL: (path: string) => string;
    /** Background Scriptにメッセージを送信 */
    // deno-lint-ignore no-explicit-any
    sendMessage: (message: unknown) => Promise<any>;
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
};
