/**
 * @file file-watcher.ts
 * @description File Watcher Domain層
 *
 * ドキュメントの最終更新時刻を監視し、変更を検知する純粋関数。
 *
 * ## 責務
 * - `document.lastModified` の取得（Content Script環境で実行）
 * - タイムスタンプ比較による変更検知
 *
 * ## 制約
 * - Chrome API非依存（純粋関数のみ）
 * - DOM API使用可能（Content Script環境を前提）
 * - 副作用なし（同じ入力 → 同じ出力）
 *
 * ## 使用例
 * ```typescript
 * // Content Script内で使用
 * let lastTimestamp = getLastModified(); // 初回取得
 *
 * setInterval(() => {
 *   const currentTimestamp = getLastModified();
 *   if (hasFileChanged(lastTimestamp, currentTimestamp)) {
 *     console.log('File changed! Reloading...');
 *     window.location.reload();
 *     lastTimestamp = currentTimestamp;
 *   }
 * }, 3000); // 3秒ごとにチェック
 * ```
 */

/**
 * ドキュメントの最終更新時刻を取得
 *
 * `document.lastModified` は "MM/DD/YYYY HH:MM:SS" 形式の文字列を返す。
 * この関数は Content Script 環境（DOM API利用可能）で実行されることを前提とする。
 *
 * @returns {string} ドキュメントの最終更新時刻（例: "02/08/2026 04:00:00"）
 *
 * @example
 * ```typescript
 * const timestamp = getLastModified();
 * console.log(timestamp); // "02/08/2026 04:00:00"
 * ```
 */
export const getLastModified = (): string => {
  // Content Script環境ではdocumentオブジェクトが利用可能
  // document.lastModified は常に文字列を返す（空の場合もあり得る）
  return document.lastModified;
};

/**
 * ファイルが変更されたかを判定
 *
 * 2つのタイムスタンプを比較し、変更があったかを返す。
 *
 * ## 判定ロジック
 * - `oldTimestamp === newTimestamp` → 変更なし（false）
 * - `oldTimestamp !== newTimestamp` → 変更あり（true）
 * - `oldTimestamp` が `undefined` → 初回チェック、変更なし（false）
 * - `newTimestamp` が空文字列 → エラー回避、変更なし（false）
 *
 * @param {string | undefined} oldTimestamp - 以前のタイムスタンプ
 * @param {string} newTimestamp - 現在のタイムスタンプ
 * @returns {boolean} 変更があった場合 true、変更なしの場合 false
 *
 * @example
 * ```typescript
 * const old = "02/08/2026 04:00:00";
 * const new1 = "02/08/2026 04:00:00";
 * const new2 = "02/08/2026 04:01:00";
 *
 * hasFileChanged(old, new1); // false（変更なし）
 * hasFileChanged(old, new2); // true（変更あり）
 * hasFileChanged(undefined, new1); // false（初回チェック）
 * ```
 */
export const hasFileChanged = (
  oldTimestamp: string | undefined,
  newTimestamp: string,
): boolean => {
  // 初回チェック時（oldTimestamp が未定義）
  if (oldTimestamp === undefined) {
    return false; // 初回は「変更なし」として扱う（リロード不要）
  }

  // 新タイムスタンプが空文字列の場合（エラー回避）
  // または両方が空文字列の場合
  if (newTimestamp === '' || (oldTimestamp === '' && newTimestamp === '')) {
    return false; // 空の場合は「変更なし」として扱う
  }

  // タイムスタンプが異なる場合は「変更あり」
  // 注意: 新しいタイムスタンプが古い場合（時計が巻き戻った）も「変更あり」として扱う
  return oldTimestamp !== newTimestamp;
};
