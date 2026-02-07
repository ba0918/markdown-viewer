import { sendMessage } from '../messaging/client.ts';
import { render } from 'preact';
import { h } from 'preact';
import { MarkdownViewer } from './components/MarkdownViewer.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import type { AppState } from '../shared/types/state.ts';
import type { Theme } from '../shared/types/theme.ts';

// Chrome API型定義（実行時はグローバルに存在する）
declare const chrome: {
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
 * 責務: messaging I/O のみ、UI描画
 *
 * ❌ 絶対禁止: ビジネスロジック、domain/services直接呼び出し
 * ✅ OK: messaging経由でserviceを利用
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
 * Markdownをレンダリング
 */
const renderMarkdown = async (markdown: string, theme: Theme) => {
  try {
    // ✅ OK: messaging経由でserviceを利用
    const html = await sendMessage<string>({
      type: 'RENDER_MARKDOWN',
      payload: { markdown, themeId: theme }
    });

    // 既存のbody内容をクリア
    document.body.innerHTML = '';

    // Preactでレンダリング
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
      console.log('Settings changed, re-rendering with new theme:', newState.theme);
      renderMarkdown(currentMarkdown, newState.theme);
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
