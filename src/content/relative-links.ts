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
  isNavigableUrl,
  isRelativeLink,
  resolveRelativeLink,
} from "../shared/utils/url-resolver.ts";
import { logger } from "../shared/utils/logger.ts";

/** 重複登録防止フラグ */
let handlerSetup = false;

/**
 * ブラウザ標準の挙動に委ねるべきクリックかを判定
 *
 * 修飾キー付きクリック（新規タブ/ウィンドウで開く）や左ボタン以外のクリックを
 * 横取りすると「新しいタブで開く」が壊れるため、これらは処理しない。
 */
const isModifiedClick = (event: MouseEvent): boolean =>
  event.button !== 0 || event.ctrlKey || event.metaKey ||
  event.shiftKey || event.altKey;

/**
 * 相対リンクを絶対パスに解決するイベントハンドラを設定
 */
export const setupRelativeLinkHandler = (): void => {
  if (handlerSetup) return;
  handlerSetup = true;

  document.addEventListener("click", (event) => {
    if (event.defaultPrevented || isModifiedClick(event)) return;

    const target = event.target as HTMLElement;
    const anchor = target.closest("a");
    if (!anchor) return;

    // 別タブ/ダウンロード指定はブラウザ標準の挙動に委ねる
    if (anchor.target && anchor.target !== "_self") return;
    if (anchor.hasAttribute("download")) return;

    const href = anchor.getAttribute("href");
    if (!href) return;

    if (!isRelativeLink(href)) return;

    let absoluteUrl: string;
    try {
      absoluteUrl = resolveRelativeLink(location.href, href);
    } catch {
      // URL解決に失敗した場合はブラウザ標準の挙動に委ねる
      return;
    }

    // 多層防御: 解決後のスキームを検証する。
    // new URL() は制御文字を除去するため、サニタイザを通過した相対リンクでも
    // 解決結果が javascript: などになる可能性がある。
    if (!isNavigableUrl(absoluteUrl)) {
      logger.warn(`Blocked navigation to unsupported URL: ${absoluteUrl}`);
      event.preventDefault();
      return;
    }

    event.preventDefault();
    logger.log(`Navigating to ${absoluteUrl}`);
    location.href = absoluteUrl;
  }, true);

  logger.log("Relative link handler set up");
};
