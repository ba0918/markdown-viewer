import { h } from 'preact';

/**
 * MarkdownViewerコンポーネント
 *
 * 責務: 表示のみ
 * ❌ 禁止: ビジネスロジック
 */

interface Props {
  html: string;
}

export const MarkdownViewer = ({ html }: Props) => {
  return (
    <div class="markdown-viewer">
      <div
        class="markdown-body"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
};
