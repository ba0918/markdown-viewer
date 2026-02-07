import { h } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import { renderMath } from '../../domain/math/renderer.ts';
import { hasMathExpression } from '../../domain/math/detector.ts';

/**
 * MarkdownViewerコンポーネント
 *
 * 責務: Markdownの表示とMathJax数式レンダリング
 * ❌ 禁止: ビジネスロジック
 */

interface Props {
  html: string;
}

export const MarkdownViewer = ({ html }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // HTMLが更新されたら、数式があればMathJaxでレンダリング
    if (containerRef.current && hasMathExpression(html)) {
      try {
        renderMath(containerRef.current);
      } catch (error) {
        console.error('MathJax rendering failed:', error);
      }
    }
  }, [html]);

  return (
    <div class="markdown-viewer">
      <div
        ref={containerRef}
        class="markdown-body"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
};
