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
  /**
   * 起動世代カウンタ
   *
   * startHotReload() は初回ハッシュ取得でawaitを挟むため、その間に別の
   * start/stopが割り込むと「古い呼び出しがタイマーを登録して取り残される」
   * 競合が発生する（設定スライダー操作等で複数回連続呼び出しされる）。
   * 世代が進んでいたら古い呼び出しは何もしない。
   */
  generation: 0,
};

/**
 * 実行中のHot Reloadを停止し、世代を進めて進行中の起動処理を無効化する
 *
 * @returns 新しい世代番号
 */
const invalidateCurrentRun = (): number => {
  if (hotReloadState.intervalId !== null) {
    clearInterval(hotReloadState.intervalId);
    hotReloadState.intervalId = null;
  }
  hotReloadState.lastFileHash = null;
  hotReloadState.generation += 1;
  return hotReloadState.generation;
};

/**
 * Hot Reloadを開始
 *
 * ローカルファイル（file://）およびlocalhost環境でのみ動作。
 * リモートURLでは外部サーバーへの不必要な負荷を避けるため無効。
 *
 * 既に実行中の場合は停止してから開始する（多重起動防止）。
 *
 * @param interval - チェック間隔（ミリ秒、最小2000ms）
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

  const generation = invalidateCurrentRun();
  const safeInterval = normalizeHotReloadInterval(interval);

  // 初回ハッシュを取得（background側でSHA-256計算済み）
  let initialHash: string;
  try {
    initialHash = await sendMessage<string>({
      type: "CHECK_FILE_CHANGE",
      payload: { url: location.href },
    });
  } catch {
    return;
  }

  // 待機中に別のstart/stopが走っていた場合、この呼び出しは破棄する
  if (generation !== hotReloadState.generation) return;

  hotReloadState.lastFileHash = initialHash;

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

      // 待機中に停止・再起動された場合は結果を捨てる
      if (generation !== hotReloadState.generation) return;

      const changed = currentHash !== hotReloadState.lastFileHash;

      if (changed) {
        logger.log("File changed detected! Reloading...");
        stopHotReload();
        isChecking = false;
        globalThis.location.reload();
        return;
      }
    } catch (error) {
      if (generation !== hotReloadState.generation) return;
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
 *
 * 進行中の startHotReload()（初回ハッシュ取得待ち）も無効化する。
 */
export const stopHotReload = (): void => {
  const wasRunning = hotReloadState.intervalId !== null;
  invalidateCurrentRun();
  if (wasRunning) {
    logger.log("Hot Reload stopped");
  }
};
