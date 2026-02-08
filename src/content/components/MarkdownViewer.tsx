import { h } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import type { Signal } from '@preact/signals';
import { renderMath } from '../../domain/math/renderer.ts';
import { hasMathExpression } from '../../domain/math/detector.ts';
import { detectMermaidBlocks } from '../../domain/markdown/mermaid-detector.ts';
import { renderMermaid, getMermaidTheme } from '../../domain/markdown/mermaid-renderer.ts';

/**
 * MarkdownViewerコンポーネント
 *
 * 責務: Markdownの表示、MathJax数式レンダリング、Mermaid図レンダリング
 * ❌ 禁止: ビジネスロジック
 */

interface Props {
  html: string;
  themeId: Signal<string>;
}

export const MarkdownViewer = ({ html, themeId }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // MathJax数式レンダリング
    if (hasMathExpression(html)) {
      try {
        renderMath(containerRef.current);
      } catch (error) {
        console.error('MathJax rendering failed:', error);
      }
    }

    // Mermaidダイアグラムレンダリング
    const mermaidBlocks = detectMermaidBlocks(html);
    const existingDiagrams = containerRef.current?.querySelectorAll('.mermaid-diagram');

    // アプリテーマからMermaidテーマを取得
    const theme = getMermaidTheme(themeId.value);

    // 既存のダイアグラムがある場合は再レンダリング（テーマ変更時）
    if (existingDiagrams && existingDiagrams.length > 0) {
      (async () => {
        for (const diagram of existingDiagrams) {
          try {
            const code = diagram.getAttribute('data-mermaid-code');
            if (code) {
              const svg = await renderMermaid(code, theme);
              diagram.innerHTML = svg;
            }
          } catch (error) {
            console.error('Mermaid re-rendering failed:', error);
          }
        }
      })();
    }
    // 新規レンダリング（初回表示時）
    else if (mermaidBlocks.length > 0) {
      (async () => {
        for (const block of mermaidBlocks) {
          try {
            // SVGをレンダリング
            const svg = await renderMermaid(block.code, theme);

            // 元のコードブロックを見つける（毎回再取得）
            const codeBlocks = containerRef.current?.querySelectorAll('code.language-mermaid');
            if (codeBlocks && codeBlocks[0]) {
              // 常に最初の要素を処理（前の要素は置き換えられているため）
              const codeBlock = codeBlocks[0];
              const preElement = codeBlock.parentElement;

              if (preElement) {
                // SVGコンテナを作成
                const container = document.createElement('div');
                container.className = 'mermaid-diagram';
                container.setAttribute('data-mermaid-code', block.code); // 元のコードを保存
                container.innerHTML = svg;

                // 元の<pre>要素を置き換え
                preElement.replaceWith(container);
              }
            }
          } catch (error) {
            console.error('Mermaid rendering failed:', error);
          }
        }
      })();
    }
  }, [html, themeId.value]);

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
