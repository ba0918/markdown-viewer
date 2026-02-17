/**
 * Content Script エントリーポイント
 *
 * Markdownファイルを検出し、messaging経由でレンダリング結果を取得してUIを描画する。
 * 各機能は専用モジュールに分離:
 * - hot-reload.ts: ファイル変更検知と自動リロード
 * - relative-links.ts: 相対リンクの絶対パス変換
 * - theme-loader.ts: テーマCSS読み込みとbodyクラス管理
 */

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
import { logger } from "../shared/utils/logger.ts";
import { escapeHtml } from "../shared/utils/escape-html.ts";
import { isMarkdownByContext } from "../shared/utils/markdown-detector.ts";
import { startHotReload, stopHotReload } from "./hot-reload.ts";
import { setupRelativeLinkHandler } from "./relative-links.ts";
import { loadThemeCss } from "./theme-loader.ts";

// Chrome API型定義（実行時はグローバルに存在する）
declare const chrome: {
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
 * Content Script の状態を一箇所に集約
 *
 * 散在するグローバル変数を1つのオブジェクトにまとめて管理性を向上。
 * Content Scriptの制約上（モジュールスコープで状態保持）、クラスは不要。
 */
const contentState = {
  /** 現在のMarkdownコンテンツ（再レンダリング用） */
  currentMarkdown: "",
  /** Chrome Storage変更リスナーの重複登録防止フラグ */
  storageListenerSetup: false,
};

// 現在のテーマをSignalで管理（リアクティブ）
const currentTheme = signal<Theme>("light");

/**
 * Markdownファイル判定（shared/utils/markdown-detector.tsに委譲）
 */
const isMarkdownFile = (): boolean => {
  return isMarkdownByContext({
    url: location.href,
    pathname: location.pathname,
    contentType: document.contentType || "",
  });
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

  // Note: chrome.storage.onChanged.addListenerのremoveは不要。
  // Content Scriptのライフサイクルはページと同期し、ページ遷移時に自動解除。
  // 重複登録はフラグで防止。
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
