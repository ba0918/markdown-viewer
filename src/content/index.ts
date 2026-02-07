import { sendMessage } from '../messaging/client.ts';
import { render } from 'preact';
import { h } from 'preact';
import { MarkdownViewer } from './components/MarkdownViewer.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import type { AppState } from '../shared/types/state.ts';
import type { Theme } from '../shared/types/theme.ts';

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
 * Markdownをレンダリング
 */
const renderMarkdown = async (markdown: string, theme: Theme) => {
  try {
    // 1. テーマCSSを読み込み
    loadThemeCss(theme);

    // 2. ✅ OK: messaging経由でserviceを利用
    const html = await sendMessage<string>({
      type: 'RENDER_MARKDOWN',
      payload: { markdown, themeId: theme }
    });

    // 3. 既存のbody内容をクリア
    document.body.innerHTML = '';

    // 4. Preactでレンダリング
    render(
      h(ErrorBoundary, null,
        h(MarkdownViewer, { html })
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
  } catch (error) {
    console.error('Failed to load settings, using default theme:', error);
    // デフォルトテーマでレンダリング
    await renderMarkdown(currentMarkdown, 'light');
  }

  // Chrome Storage変更イベントをリッスン
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && changes.appState) {
      const newState = changes.appState.newValue as AppState;
      console.log('Settings changed, updating theme CSS:', newState.theme);
      // CSSファイルのみ差し替え（高速・表示が消えない！）
      loadThemeCss(newState.theme);
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
