import { sendMessage } from '../messaging/client.ts';
import { render } from 'preact';
import { h } from 'preact';
import { signal } from '@preact/signals';
import { MarkdownViewer } from './components/MarkdownViewer.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import type { AppState } from '../shared/types/state.ts';
import type { Theme } from '../shared/types/theme.ts';
import { isWslFile } from '../shared/utils/wsl-detector.ts';

// Chrome API型定義（実行時はグローバルに存在する）
declare const chrome: {
  runtime: {
    getURL: (path: string) => string;
  };
  storage: {
    onChanged: {
      addListener: (
        callback: (changes: Record<string, { newValue?: unknown; oldValue?: unknown }>, area: string) => void
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
let currentMarkdown = '';

// Hot Reload用のグローバル変数
let hotReloadInterval: number | null = null;
let lastFileContent: string | null = null;

// 現在のテーマをSignalで管理（リアクティブ）
const currentTheme = signal<Theme>('light');

/**
 * Markdownファイル判定
 */
const isMarkdownFile = (): boolean => {
  return (
    document.contentType === 'text/markdown' ||
    location.pathname.match(/\.(md|markdown)$/i) !== null
  );
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
 */
const loadThemeCss = (theme: Theme): void => {
  const cssUrl = getThemeCssUrl(theme);
  let linkElement = document.querySelector('link[data-markdown-theme]') as HTMLLinkElement;

  if (!linkElement) {
    // 初回: <link>タグを作成して<head>に追加
    linkElement = document.createElement('link');
    linkElement.rel = 'stylesheet';
    linkElement.setAttribute('data-markdown-theme', theme);
    linkElement.href = cssUrl;
    document.head.appendChild(linkElement);
    console.log(`Markdown Viewer: Theme CSS loaded - ${theme}`);
  } else {
    // テーマ変更時: hrefを更新（再レンダリング不要！）
    linkElement.setAttribute('data-markdown-theme', theme);
    linkElement.href = cssUrl;
    console.log(`Markdown Viewer: Theme CSS updated - ${theme}`);
  }
};

/**
 * Hot Reloadを開始
 *
 * @param interval - チェック間隔（ミリ秒、最小1000ms）
 */
const startHotReload = async (interval: number): Promise<void> => {
  // WSL2ファイルはHot Reload非対応（Chromeセキュリティ制限）
  if (isWslFile(location.href)) {
    console.log('Markdown Viewer: Hot Reload is not available for WSL2 files (file://wsl.localhost/...). Please use a localhost HTTP server instead.');
    return;
  }

  // 既存のインターバルをクリア
  if (hotReloadInterval !== null) {
    clearInterval(hotReloadInterval);
  }

  // 最小間隔1000ms（1秒）を保証
  const safeInterval = Math.max(interval, 1000);

  // 初回のファイル内容を取得（Background Scriptでfetch）
  // Note: Windows local files (file:///C:/...) work fine
  // Note: WSL2 files (file://wsl.localhost/...) are blocked by Chrome security policy
  try {
    lastFileContent = await sendMessage<string>({
      type: 'CHECK_FILE_CHANGE',
      payload: { url: location.href }
    });
  } catch {
    // Hot Reload not available for this file (silently fail)
    return;
  }

  console.log(`Markdown Viewer: Hot Reload started (interval: ${safeInterval}ms)`);

  // setIntervalでファイル変更を監視
  hotReloadInterval = window.setInterval(async () => {
    try {
      // Background Scriptでfile://をfetch
      const currentContent = await sendMessage<string>({
        type: 'CHECK_FILE_CHANGE',
        payload: { url: location.href }
      });

      // 内容比較
      const changed = currentContent !== lastFileContent;

      if (changed) {
        console.log('Markdown Viewer: File changed detected! Reloading...');
        lastFileContent = currentContent;
        window.location.reload();
      }
    } catch {
      // Fetch failed, stop Hot Reload (silently)
      stopHotReload();
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
    console.log('Markdown Viewer: Hot Reload stopped');
  }
};

/**
 * Markdownをレンダリング
 */
const renderMarkdown = async (markdown: string, theme: Theme) => {
  try {
    // 1. テーマをSignalに設定
    currentTheme.value = theme;

    // 2. テーマCSSを読み込み
    loadThemeCss(theme);

    // 3. ✅ OK: messaging経由でserviceを利用
    const html = await sendMessage<string>({
      type: 'RENDER_MARKDOWN',
      payload: { markdown, themeId: theme }
    });

    // 4. 既存のbody内容をクリア
    document.body.innerHTML = '';

    // 5. Preactでレンダリング（themeIdはSignalで渡す）
    render(
      h(ErrorBoundary, null,
        h(MarkdownViewer, { html, themeId: currentTheme })
      ),
      document.body
    );

    console.log(`Markdown Viewer: Rendering completed with theme '${theme}'`);
  } catch (error) {
    console.error('Failed to render markdown:', error);
    document.body.innerHTML = `
      <div style="padding: 2rem; background: #fff5f5; color: #c53030;">
        <h1>⚠️ Markdown Viewer Error</h1>
        <p>${error instanceof Error ? error.message : 'Unknown error'}</p>
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
  currentMarkdown = document.body.textContent || '';

  // 設定を取得してレンダリング
  try {
    const settings = await sendMessage<AppState>({
      type: 'GET_SETTINGS',
      payload: {}
    });

    await renderMarkdown(currentMarkdown, settings.theme);

    // Hot Reload設定を反映
    if (settings.hotReload.enabled) {
      await startHotReload(settings.hotReload.interval);
    }
  } catch (error) {
    console.error('Failed to load settings, using default theme:', error);
    // デフォルトテーマでレンダリング
    await renderMarkdown(currentMarkdown, 'light');
  }

  // Chrome Storage変更イベントをリッスン
  chrome.storage.onChanged.addListener(async (changes, area) => {
    if (area === 'sync' && changes.appState) {
      const newState = changes.appState.newValue as AppState;
      console.log('Settings changed, updating theme:', newState.theme);

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
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
