/**
 * Hot Reload モジュール
 *
 * ローカルファイル（file://）およびlocalhost環境でのファイル変更検知と自動リロード。
 * Content Scriptのページライフサイクルと同期し、ページ遷移時に自動的にクリーンアップ。
 */

import { sendMessage } from "../messaging/client.ts";
import { isWslFile } from "../shared/utils/wsl-detector.ts";
import { isLocalUrl } from "../shared/utils/url-validator.ts";
import { normalizeHotReloadInterval } from "../shared/utils/validators.ts";
import { logger } from "../shared/utils/logger.ts";

/** Hot Reload の内部状態 */
const hotReloadState = {
  /** インターバルタイマーID */
  intervalId: null as ReturnType<typeof globalThis.setInterval> | null,
  /** 最後に取得したファイルのSHA-256ハッシュ（変更検知用） */
  lastFileHash: null as string | null,
};

/**
 * Hot Reloadを開始
 *
 * ローカルファイル（file://）およびlocalhost環境でのみ動作。
 * リモートURLでは外部サーバーへの不必要な負荷を避けるため無効。
 *
 * @param interval - チェック間隔（ミリ秒、最小1000ms）
 */
export const startHotReload = async (interval: number): Promise<void> => {
  if (!isLocalUrl(location.href)) {
    logger.log(
      "Hot Reload is only available for local files (file://) and localhost. " +
        "Remote URLs are not supported to avoid unnecessary server load.",
    );
    return;
  }

  if (isWslFile(location.href)) {
    logger.log(
      "Hot Reload is not available for WSL2 files (file://wsl.localhost/...). Please use a localhost HTTP server instead.",
    );
    return;
  }

  if (hotReloadState.intervalId !== null) {
    clearInterval(hotReloadState.intervalId);
  }

  const safeInterval = normalizeHotReloadInterval(interval);

  // 初回ハッシュを取得（background側でSHA-256計算済み）
  try {
    hotReloadState.lastFileHash = await sendMessage<string>({
      type: "CHECK_FILE_CHANGE",
      payload: { url: location.href },
    });
  } catch {
    return;
  }

  logger.log(`Hot Reload started (interval: ${safeInterval}ms)`);

  let isChecking = false;

  hotReloadState.intervalId = globalThis.setInterval(async () => {
    if (isChecking) return;

    isChecking = true;
    try {
      const currentHash = await sendMessage<string>({
        type: "CHECK_FILE_CHANGE",
        payload: { url: location.href },
      });

      const changed = currentHash !== hotReloadState.lastFileHash;

      if (changed) {
        logger.log("File changed detected! Reloading...");
        stopHotReload();
        isChecking = false;
        globalThis.location.reload();
        return;
      }
    } catch (error) {
      logger.warn(
        "Hot Reload fetch failed, stopping:",
        error instanceof Error ? error.message : error,
      );
      stopHotReload();
    } finally {
      isChecking = false;
    }
  }, safeInterval);
};

/**
 * Hot Reloadを停止
 */
export const stopHotReload = (): void => {
  if (hotReloadState.intervalId !== null) {
    clearInterval(hotReloadState.intervalId);
    hotReloadState.intervalId = null;
    hotReloadState.lastFileHash = null;
    logger.log("Hot Reload stopped");
  }
};
