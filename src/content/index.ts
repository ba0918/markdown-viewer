import { sendMessage } from "../messaging/client.ts";
import { render } from "preact";
import { h } from "preact";
import { signal } from "@preact/signals";
import { MarkdownViewer } from "./components/MarkdownViewer.tsx";
import { ErrorBoundary } from "./components/ErrorBoundary.tsx";
import { ToastContainer } from "../ui-components/shared/Toast/index.ts";
import type { AppState } from "../shared/types/state.ts";
import type { Theme } from "../shared/types/theme.ts";
import type { RenderResult } from "../shared/types/render.ts";
import type { TocState } from "../domain/toc/types.ts";
import { isWslFile } from "../shared/utils/wsl-detector.ts";
import {
  isRelativeLink,
  resolveRelativeLink,
} from "../shared/utils/url-resolver.ts";
import { logger } from "../shared/utils/logger.ts";
import { escapeHtml } from "../shared/utils/escape-html.ts";
import { MARKDOWN_EXTENSION_PATTERN } from "../shared/constants/markdown.ts";

// Chrome API型定義（実行時はグローバルに存在する）
declare const chrome: {
  runtime: {
    getURL: (path: string) => string;
  };
  storage: {
    sync: {
      get: (
        keys: string | string[],
      ) => Promise<Record<string, unknown>>;
    };
    onChanged: {
      addListener: (
        callback: (
          changes: Record<string, { newValue?: unknown; oldValue?: unknown }>,
          area: string,
        ) => void,
      ) => void;
    };
  };
};

/**
 * Content Script エントリーポイント
 *
 * Markdownファイルを検出し、messaging経由でレンダリング結果を取得してUIを描画する。
 * テーマCSS読み込み、Hot Reload、相対リンク解決も担当。
 */

/**
 * Content Script の状態を一箇所に集約
 *
 * 散在するグローバル変数を1つのオブジェクトにまとめて管理性を向上。
 * Content Scriptの制約上（モジュールスコープで状態保持）、クラスは不要。
 */
const contentState = {
  /** 現在のMarkdownコンテンツ（再レンダリング用） */
  currentMarkdown: "",
  /** Hot ReloadのインターバルタイマーID */
  hotReloadInterval: null as ReturnType<typeof globalThis.setInterval> | null,
  /** 最後に取得したファイルのSHA-256ハッシュ（Hot Reload変更検知用） */
  lastFileHash: null as string | null,
  /** 相対リンクハンドラの重複登録防止フラグ */
  relativeLinkHandlerSetup: false,
  /** Chrome Storage変更リスナーの重複登録防止フラグ */
  storageListenerSetup: false,
};

// 現在のテーマをSignalで管理（リアクティブ）
const currentTheme = signal<Theme>("light");

/**
 * Markdownファイル判定（ローカル＋リモートURL対応）
 *
 * - ローカルファイル（file://）とlocalhost: URL拡張子で判定
 * - リモートURL: URL拡張子優先、拡張子なしの場合のみContent-Typeで判定
 * - text/plain は誤検知が多いため、拡張子なしの場合のみ許可
 */
const isMarkdownFile = (): boolean => {
  const url = location.href;

  if (url.startsWith("file://") || url.startsWith("http://localhost")) {
    return MARKDOWN_EXTENSION_PATTERN.test(location.pathname);
  }

  const hasMarkdownExtension = MARKDOWN_EXTENSION_PATTERN.test(url);
  if (hasMarkdownExtension) {
    return true;
  }

  const contentType = document.contentType || "";
  return contentType.includes("text/markdown");
};

/**
 * テーマCSSファイルのURLを取得
 */
const getThemeCssUrl = (theme: Theme): string => {
  return chrome.runtime.getURL(`content/styles/themes/${theme}.css`);
};

/**
 * テーマCSSを読み込む
 * <link>タグを<head>に追加（初回）または更新（テーマ変更時）
 * bodyにテーマクラスを付与（CSS変数スコープのため）
 */
const loadThemeCss = (theme: Theme): void => {
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

/**
 * ローカルURL判定
 *
 * Hot Reloadの対象をローカルファイル/localhostに制限するために使用。
 * リモートURLへの不必要なポーリングを防止する。
 *
 * 対象: file://, localhost, 127.0.0.1, [::1], ::1
 *
 * @param url - 判定するURL文字列
 * @returns ローカルURLの場合true
 */
const isLocalUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "file:") return true;
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      const hostname = parsed.hostname;
      return hostname === "localhost" ||
        hostname === "127.0.0.1" ||
        hostname === "[::1]" ||
        hostname === "::1";
    }
    return false;
  } catch {
    return false;
  }
};

/**
 * Hot Reloadを開始
 *
 * ローカルファイル（file://）およびlocalhost環境でのみ動作。
 * リモートURLでは外部サーバーへの不必要な負荷を避けるため無効。
 *
 * @param interval - チェック間隔（ミリ秒、最小1000ms）
 */
const startHotReload = async (interval: number): Promise<void> => {
  // ローカルファイル/localhost以外はHot Reload非対応
  if (!isLocalUrl(location.href)) {
    logger.log(
      "Hot Reload is only available for local files (file://) and localhost. " +
        "Remote URLs are not supported to avoid unnecessary server load.",
    );
    return;
  }

  // WSL2ファイルはChrome制限でHot Reload非対応
  if (isWslFile(location.href)) {
    logger.log(
      "Hot Reload is not available for WSL2 files (file://wsl.localhost/...). Please use a localhost HTTP server instead.",
    );
    return;
  }

  if (contentState.hotReloadInterval !== null) {
    clearInterval(contentState.hotReloadInterval);
  }

  const safeInterval = Math.max(interval, 2000);

  // 初回ハッシュを取得（background側でSHA-256計算済み）
  try {
    contentState.lastFileHash = await sendMessage<string>({
      type: "CHECK_FILE_CHANGE",
      payload: { url: location.href },
    });
  } catch {
    return;
  }

  logger.log(`Hot Reload started (interval: ${safeInterval}ms)`);

  let isChecking = false;

  contentState.hotReloadInterval = globalThis.setInterval(async () => {
    if (isChecking) return;

    isChecking = true;
    try {
      const currentHash = await sendMessage<string>({
        type: "CHECK_FILE_CHANGE",
        payload: { url: location.href },
      });

      const changed = currentHash !== contentState.lastFileHash;

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
const stopHotReload = (): void => {
  if (contentState.hotReloadInterval !== null) {
    clearInterval(contentState.hotReloadInterval);
    contentState.hotReloadInterval = null;
    contentState.lastFileHash = null;
    logger.log("Hot Reload stopped");
  }
};

/**
 * 相対リンクを絶対パスに解決するイベントハンドラを設定
 *
 * Markdown内の相対リンク（例: docs/ARCHITECTURE.md）をクリック時に
 * 絶対URL（例: file://[base-url]/docs/ARCHITECTURE.md）に変換してナビゲートする。
 */
const setupRelativeLinkHandler = (): void => {
  if (contentState.relativeLinkHandlerSetup) return;
  contentState.relativeLinkHandlerSetup = true;

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

/**
 * Markdownをレンダリング
 *
 * @param markdown - Markdownコンテンツ
 * @param theme - テーマID
 * @param clearBody - bodyをクリアするか（デフォルト: true）
 * @param initialTocState - ToCの初期状態（オプション、CLS削減用）
 */
const renderMarkdown = async (
  markdown: string,
  theme: Theme,
  clearBody = true,
  initialTocState?: TocState,
) => {
  try {
    currentTheme.value = theme;
    loadThemeCss(theme);

    const result = await sendMessage<RenderResult>({
      type: "RENDER_MARKDOWN",
      payload: { markdown, themeId: theme },
    });

    if (clearBody) {
      document.body.innerHTML = "";
    }
    const viewerContainer = document.createElement("div");
    viewerContainer.id = "markdown-viewer-container";
    document.body.appendChild(viewerContainer);

    render(
      h(
        ErrorBoundary,
        null,
        [
          h(MarkdownViewer, {
            result,
            themeId: currentTheme,
            initialTocState,
            fileUrl: location.href,
          }),
          h(ToastContainer, null),
        ],
      ),
      viewerContainer,
    );

    setupRelativeLinkHandler();

    logger.log(`Rendering completed with theme '${theme}'`);
  } catch (error) {
    console.error("Failed to render markdown:", error);
    document.body.innerHTML = `
      <div style="padding: 2rem; background: #fff5f5; color: #c53030;">
        <h1>⚠️ Markdown Viewer Error</h1>
        <p>${
      escapeHtml(error instanceof Error ? error.message : "Unknown error")
    }</p>
      </div>
    `;
  }
};

/**
 * 初期化処理
 */
const init = async () => {
  if (!isMarkdownFile()) return;

  if (!contentState.currentMarkdown) {
    contentState.currentMarkdown = document.body.textContent || "";
  }

  document.body.innerHTML = "";

  // ToC初期状態をChrome Storageから読み込み（CLS削減）
  let initialTocState: TocState | undefined;
  try {
    const result = await chrome.storage.sync.get(["tocState"]);
    if (result.tocState) {
      initialTocState = result.tocState as TocState;
    }
  } catch {
    // デフォルト値使用
  }

  try {
    const settings = await sendMessage<AppState>({
      type: "GET_SETTINGS",
      payload: {},
    });

    await renderMarkdown(
      contentState.currentMarkdown,
      settings.theme,
      false,
      initialTocState,
    );

    if (settings.hotReload.enabled) {
      await startHotReload(settings.hotReload.interval);
    }
  } catch (error) {
    console.error("Failed to load settings, using default theme:", error);
    await renderMarkdown(
      contentState.currentMarkdown,
      "light",
      false,
      initialTocState,
    );
  }

  if (contentState.storageListenerSetup) return;
  contentState.storageListenerSetup = true;

  chrome.storage.onChanged.addListener(async (changes, area) => {
    if (area === "sync" && changes.appState) {
      const newState = changes.appState.newValue as AppState;
      logger.log("Settings changed, updating theme:", newState.theme);

      loadThemeCss(newState.theme);
      currentTheme.value = newState.theme;

      if (newState.hotReload.enabled) {
        await startHotReload(newState.hotReload.interval);
      } else {
        stopHotReload();
      }
    }
  });
};

/**
 * DOMContentLoaded時またはDOM準備完了時に初期化
 */
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
