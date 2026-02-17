/**
 * テーマCSS読み込みモジュール
 *
 * <link>タグによるテーマCSS管理とbodyへのテーマクラス付与。
 * テーマ変更時は新しい<link>を先にロードして暗転を防ぐ。
 */

import type { Theme } from "../shared/types/theme.ts";
import { getThemeCssPath } from "../shared/constants/themes.ts";
import { logger } from "../shared/utils/logger.ts";

// Chrome API型定義（実行時はグローバルに存在する）
declare const chrome: {
  runtime: {
    getURL: (path: string) => string;
  };
};

/**
 * テーマCSSファイルのURLを取得
 */
const getThemeCssUrl = (theme: Theme): string => {
  return chrome.runtime.getURL(getThemeCssPath(theme));
};

/**
 * テーマCSSを読み込む
 *
 * <link>タグを<head>に追加（初回）または更新（テーマ変更時）。
 * bodyにテーマクラスを付与（CSS変数スコープのため）。
 */
export const loadThemeCss = (theme: Theme): void => {
  const cssUrl = getThemeCssUrl(theme);
  const existingLink = document.querySelector(
    "link[data-markdown-theme]",
  ) as HTMLLinkElement;

  if (!existingLink) {
    const linkElement = document.createElement("link");
    linkElement.rel = "stylesheet";
    linkElement.setAttribute("data-markdown-theme", theme);
    linkElement.href = cssUrl;
    document.head.appendChild(linkElement);
    logger.log(`Theme CSS loaded - ${theme}`);
  } else {
    // 新しい<link>を先にロードして暗転を防ぐ
    const newLink = document.createElement("link");
    newLink.rel = "stylesheet";
    newLink.setAttribute("data-markdown-theme", theme);
    newLink.href = cssUrl;

    newLink.onload = () => {
      existingLink.remove();
      logger.log(`Theme CSS updated - ${theme}`);
    };

    newLink.onerror = () => {
      existingLink.remove();
    };

    document.head.appendChild(newLink);
  }

  // bodyにテーマクラスを付与（CSS変数のスコープ拡大）
  document.body.className = document.body.className
    .split(" ")
    .filter((cls) => !cls.startsWith("markdown-viewer-theme-"))
    .join(" ");
  document.body.classList.add(`markdown-viewer-theme-${theme}`);
};
