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

// DEBUGフラグ: 本番ビルドではfalseにする
const DEBUG = false;

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
 * 責務: messaging I/O のみ、UI描画、CSS読み込み
 *
 * ❌ 絶対禁止: ビジネスロジック、domain/services直接呼び出し
 * ✅ OK: messaging経由でserviceを利用、chrome.runtime.getURL()でCSS読み込み
 */

// グローバル変数でMarkdownコンテンツを保持（再レンダリング用）
let currentMarkdown = "";

// Hot Reload用のグローバル変数
// Note: setInterval()の戻り値はブラウザ環境ではnumber、Deno環境ではTimeout型
// ブラウザ実行時の型としてnumberを指定しつつ、Timeout型も許容
let hotReloadInterval: ReturnType<typeof globalThis.setInterval> | null = null;
let lastFileContent: string | null = null;

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

  // ローカルファイルとlocalhostは既存の拡張子判定で動作
  if (url.startsWith("file://") || url.startsWith("http://localhost")) {
    return location.pathname.match(/\.(md|markdown)$/i) !== null;
  }

  // リモートURL: まず拡張子チェック（優先）
  const hasMarkdownExtension = /\.(md|markdown)$/i.test(url);
  if (hasMarkdownExtension) {
    return true;
  }

  // 拡張子なしの場合のみ Content-Type で判定
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
    // 初回: <link>タグを作成して<head>に追加
    const linkElement = document.createElement("link");
    linkElement.rel = "stylesheet";
    linkElement.setAttribute("data-markdown-theme", theme);
    linkElement.href = cssUrl;
    document.head.appendChild(linkElement);
    if (DEBUG) console.log(`Markdown Viewer: Theme CSS loaded - ${theme}`);
  } else {
    // テーマ変更時: 新しい<link>を先に作成してロード完了後に古いのを削除
    // これにより暗転を防ぐ（スムーズなテーマ切り替え）
    const newLink = document.createElement("link");
    newLink.rel = "stylesheet";
    newLink.setAttribute("data-markdown-theme", theme);
    newLink.href = cssUrl;

    // 新しいCSSがロード完了したら古いのを削除
    newLink.onload = () => {
      existingLink.remove();
      if (DEBUG) console.log(`Markdown Viewer: Theme CSS updated - ${theme}`);
    };

    // エラー時も古いのを削除（フォールバック）
    newLink.onerror = () => {
      existingLink.remove();
    };

    // 新しい<link>を追加（古いのと並行してロード）
    document.head.appendChild(newLink);
  }

  // bodyにテーマクラスを付与（CSS変数のスコープを全ページに拡大）
  // 既存のテーマクラスを削除してから新しいテーマクラスを追加
  document.body.className = document.body.className
    .split(" ")
    .filter((cls) => !cls.startsWith("markdown-viewer-theme-"))
    .join(" ");
  document.body.classList.add(`markdown-viewer-theme-${theme}`);
};

/**
 * Hot Reloadを開始
 *
 * @param interval - チェック間隔（ミリ秒、最小1000ms）
 */
const startHotReload = async (interval: number): Promise<void> => {
  // WSL2ファイルはHot Reload非対応（Chromeセキュリティ制限）
  if (isWslFile(location.href)) {
    if (DEBUG) {
      console.log(
        "Markdown Viewer: Hot Reload is not available for WSL2 files (file://wsl.localhost/...). Please use a localhost HTTP server instead.",
      );
    }
    return;
  }

  // 既存のインターバルをクリア
  if (hotReloadInterval !== null) {
    clearInterval(hotReloadInterval);
  }

  // 最小間隔2000ms（2秒）を保証
  const safeInterval = Math.max(interval, 2000);

  // 初回のファイル内容を取得（Background Scriptでfetch）
  // Note: Windows local files (file:///C:/...) work fine
  // Note: WSL2 files (file://wsl.localhost/...) are blocked by Chrome security policy
  try {
    lastFileContent = await sendMessage<string>({
      type: "CHECK_FILE_CHANGE",
      payload: { url: location.href },
    });
  } catch {
    // Hot Reload not available for this file (silently fail)
    return;
  }

  if (DEBUG) {
    console.log(
      `Markdown Viewer: Hot Reload started (interval: ${safeInterval}ms)`,
    );
  }

  // Race Condition対策用フラグ
  let isChecking = false;

  // setIntervalでファイル変更を監視
  hotReloadInterval = globalThis.setInterval(async () => {
    if (isChecking) return; // 前回のチェックが完了していなければスキップ

    isChecking = true;
    try {
      // Background Scriptでfile://をfetch
      const currentContent = await sendMessage<string>({
        type: "CHECK_FILE_CHANGE",
        payload: { url: location.href },
      });

      // 内容比較
      const changed = currentContent !== lastFileContent;

      if (changed) {
        if (DEBUG) {
          console.log("Markdown Viewer: File changed detected! Reloading...");
        }
        // リロード前にintervalとフラグを確実にクリア
        stopHotReload();
        isChecking = false;
        globalThis.location.reload();
        return; // reload後の処理は不要
      }
    } catch (error) {
      if (DEBUG) {
        console.warn(
          "Markdown Viewer: Hot Reload fetch failed, stopping:",
          error instanceof Error ? error.message : error,
        );
      }
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
  if (hotReloadInterval !== null) {
    clearInterval(hotReloadInterval);
    hotReloadInterval = null;
    lastFileContent = null;
    if (DEBUG) console.log("Markdown Viewer: Hot Reload stopped");
  }
};

/**
 * 相対リンクを絶対パスに解決するイベントハンドラを設定
 * 例: docs/ARCHITECTURE.md → file://[base-url]/docs/ARCHITECTURE.md
 *
 * 責務: messaging I/O のみ、イベントハンドリング
 * ✅ OK: shared/utils/url-resolver.tsの純粋関数を使用
 */
const setupRelativeLinkHandler = (): void => {
  document.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;

    // <a>タグのクリックのみ処理
    const anchor = target.closest("a");
    if (!anchor) return;

    const href = anchor.getAttribute("href");
    if (!href) return;

    // 絶対URL（http://, https://, file://）や同一ページ内リンク（#）はスキップ
    if (!isRelativeLink(href)) return;

    // 相対リンクを絶対パスに変換
    event.preventDefault();

    const absoluteUrl = resolveRelativeLink(location.href, href);

    if (DEBUG) console.log(`Markdown Viewer: Navigating to ${absoluteUrl}`);

    // 同じタブで遷移
    location.href = absoluteUrl;
  }, true); // キャプチャフェーズで処理

  if (DEBUG) console.log("Markdown Viewer: Relative link handler set up");
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
    // 1. テーマをSignalに設定
    currentTheme.value = theme;

    // 2. テーマCSSを読み込み
    loadThemeCss(theme);

    // 3. ✅ OK: messaging経由でserviceを利用
    const result = await sendMessage<RenderResult>({
      type: "RENDER_MARKDOWN",
      payload: { markdown, themeId: theme },
    });

    // 4. bodyをクリア（オプション）してMarkdownビューア用のコンテナを作成
    if (clearBody) {
      document.body.innerHTML = "";
    }
    const viewerContainer = document.createElement("div");
    viewerContainer.id = "markdown-viewer-container";
    document.body.appendChild(viewerContainer);

    // 5. Preactでレンダリング（themeIdはSignalで渡す）
    render(
      h(
        ErrorBoundary,
        null,
        [
          h(MarkdownViewer, {
            result, // RenderResult全体を渡す（html, rawMarkdown, content, frontmatter）
            themeId: currentTheme,
            initialTocState, // ToC初期状態（CLS削減用）
            fileUrl: location.href, // ファイルURL（エクスポート用）
          }),
          h(ToastContainer, null), // トースト通知コンテナ追加
        ],
      ),
      viewerContainer,
    );

    // 6. 相対リンクハンドラを設定（レンダリング後に実行）
    setupRelativeLinkHandler();

    if (DEBUG) {
      console.log(`Markdown Viewer: Rendering completed with theme '${theme}'`);
    }
  } catch (error) {
    console.error("Failed to render markdown:", error);
    document.body.innerHTML = `
      <div style="padding: 2rem; background: #fff5f5; color: #c53030;">
        <h1>⚠️ Markdown Viewer Error</h1>
        <p>${error instanceof Error ? error.message : "Unknown error"}</p>
      </div>
    `;
  }
};

/**
 * 初期化処理
 */
const init = async () => {
  // Markdownファイル以外は処理しない
  if (!isMarkdownFile()) return;

  // Markdownコンテンツを保存
  if (!currentMarkdown) {
    currentMarkdown = document.body.textContent || "";
  }

  // bodyをクリア（CLS削減: ここで1回だけクリア）
  document.body.innerHTML = "";

  // ToCの初期状態をChrome Storageから読み込み（CLS削減）
  let initialTocState: TocState | undefined;
  try {
    const result = await chrome.storage.sync.get(["tocState"]);
    if (result.tocState) {
      initialTocState = result.tocState as TocState;
    }
  } catch {
    // Storage読み込み失敗時はundefined（デフォルト値使用）
  }

  // 設定を取得してレンダリング
  try {
    const settings = await sendMessage<AppState>({
      type: "GET_SETTINGS",
      payload: {},
    });

    // 初回レンダリング（bodyクリア済み、ToC初期状態を渡す）
    await renderMarkdown(
      currentMarkdown,
      settings.theme,
      false,
      initialTocState,
    );

    // Hot Reload設定を反映
    if (settings.hotReload.enabled) {
      await startHotReload(settings.hotReload.interval);
    }
  } catch (error) {
    console.error("Failed to load settings, using default theme:", error);
    // デフォルトテーマでレンダリング（bodyクリア済み、ToC初期状態を渡す）
    await renderMarkdown(currentMarkdown, "light", false, initialTocState);
  }

  // Chrome Storage変更イベントをリッスン
  chrome.storage.onChanged.addListener(async (changes, area) => {
    if (area === "sync" && changes.appState) {
      const newState = changes.appState.newValue as AppState;
      if (DEBUG) {
        console.log("Settings changed, updating theme:", newState.theme);
      }

      // CSSファイルのみ差し替え（高速・表示が消えない！）
      loadThemeCss(newState.theme);

      // Signalを更新（MarkdownViewerが自動的に再レンダリングされる）
      currentTheme.value = newState.theme;

      // Hot Reload設定の変更を反映
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
