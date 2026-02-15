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

// 未使用関数 getLastModified(), hasFileChanged() は削除されました
// 現在は Background Script の fetch を使用して Hot Reload を実装しています
