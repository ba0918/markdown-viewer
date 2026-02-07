import { sendMessage } from '../messaging/client.ts';
import { render } from 'preact';
import { h } from 'preact';
import { MarkdownViewer } from './components/MarkdownViewer.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';

/**
 * Content Script エントリーポイント
 *
 * 責務: messaging I/O のみ、UI描画
 *
 * ❌ 絶対禁止: ビジネスロジック、domain/services直接呼び出し
 * ✅ OK: messaging経由でserviceを利用
 */

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
 * 初期化処理
 */
const init = async () => {
  // Markdownファイル以外は処理しない
  if (!isMarkdownFile()) return;

  const markdown = document.body.textContent || '';

  try {
    // ✅ OK: messaging経由でserviceを利用
    const html = await sendMessage<string>({
      type: 'RENDER_MARKDOWN',
      payload: { markdown, themeId: 'light' }
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

    console.log('Markdown Viewer: Rendering completed');
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
 * DOMContentLoaded時またはDOM準備完了時に初期化
 */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
