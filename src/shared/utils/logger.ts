/**
 * 開発用ログユーティリティ
 *
 * DEBUGフラグはesbuildのdefineで注入される:
 * - 開発ビルド（deno task dev）: DEBUG = true → ログ出力あり
 * - 本番ビルド（deno task build）: DEBUG = false → tree-shakingで完全削除
 *
 * @example
 * ```typescript
 * import { logger } from "../shared/utils/logger.ts";
 * logger.log("Theme loaded:", theme);  // [Markdown Viewer] Theme loaded: dark
 * logger.warn("Fetch failed:", error); // [Markdown Viewer] Fetch failed: ...
 * ```
 */
declare const DEBUG: boolean;

const PREFIX = "[Markdown Viewer]";

export const logger = {
  log: (...args: unknown[]): void => {
    if (DEBUG) console.log(PREFIX, ...args);
  },
  warn: (...args: unknown[]): void => {
    if (DEBUG) console.warn(PREFIX, ...args);
  },
} as const;
