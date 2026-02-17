/**
 * 相対リンク解決モジュール
 *
 * Markdown内の相対リンク（例: docs/ARCHITECTURE.md）をクリック時に
 * 絶対URL（例: file://[base-url]/docs/ARCHITECTURE.md）に変換してナビゲートする。
 *
 * Note: removeEventListenerは不要。Content Scriptはページライフサイクルと同期し、
 * ページ遷移時にリスナーも自動解除される。重複登録はフラグで防止。
 */

import {
  isRelativeLink,
  resolveRelativeLink,
} from "../shared/utils/url-resolver.ts";
import { logger } from "../shared/utils/logger.ts";

/** 重複登録防止フラグ */
let handlerSetup = false;

/**
 * 相対リンクを絶対パスに解決するイベントハンドラを設定
 */
export const setupRelativeLinkHandler = (): void => {
  if (handlerSetup) return;
  handlerSetup = true;

  document.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    const anchor = target.closest("a");
    if (!anchor) return;

    const href = anchor.getAttribute("href");
    if (!href) return;

    if (!isRelativeLink(href)) return;

    event.preventDefault();
    const absoluteUrl = resolveRelativeLink(location.href, href);
    logger.log(`Navigating to ${absoluteUrl}`);
    location.href = absoluteUrl;
  }, true);

  logger.log("Relative link handler set up");
};
