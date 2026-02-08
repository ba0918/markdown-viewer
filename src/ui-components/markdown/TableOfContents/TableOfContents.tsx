/**
 * Table of Contents (TOC) コンポーネント
 *
 * 責務: TOCの表示、スクロール追従、アクティブ状態管理
 * ✅ OK: 純粋なUIコンポーネント、Preact
 * ❌ NG: ビジネスロジック、messaging直接呼び出し
 */

import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import type { TocItem } from '../../../domain/toc/types.ts';

interface Props {
  /** TOCアイテムリスト */
  items: TocItem[];
  /** 現在のテーマID */
  themeId: string;
}

/**
 * Table of Contentsコンポーネント
 *
 * 機能:
 * - H1-H3見出しを左サイドに表示
 * - スクロールに追従（position: sticky）
 * - 現在表示中の見出しをハイライト（IntersectionObserver）
 * - クリックでスムーススクロール
 */
export const TableOfContents = ({ items, themeId }: Props) => {
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    // 見出しがない場合は何もしない
    if (items.length === 0) return;

    // IntersectionObserverで現在表示中の見出しを検出
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      {
        // 画面上部10%〜下部80%の範囲で検出
        rootMargin: '-10% 0px -80% 0px',
      }
    );

    // 全見出し要素を監視
    const headings = document.querySelectorAll('h1, h2, h3');
    headings.forEach((h) => observer.observe(h));

    return () => observer.disconnect();
  }, [items]);

  /**
   * TOCアイテムクリック時のハンドラ
   * 対象の見出しまでスムーススクロール
   */
  const handleClick = (id: string) => {
    const element = document.getElementById(id);
    element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // 見出しがない場合は何も表示しない
  if (items.length === 0) return null;

  return (
    <nav class={`toc toc-theme-${themeId}`} aria-label="Table of Contents">
      <h2 class="toc-title">Table of Contents</h2>
      <ul class="toc-list">
        {items.map((item) => (
          <li key={item.id} class={`toc-item toc-level-${item.level}`}>
            <a
              href={`#${item.id}`}
              class={activeId === item.id ? 'toc-link active' : 'toc-link'}
              onClick={(e) => {
                e.preventDefault();
                handleClick(item.id);
              }}
            >
              {item.text}
            </a>
            {/* TODO: 将来的に階層構造対応する場合はchildrenを再帰的に表示 */}
            {item.children.length > 0 && (
              <ul class="toc-sublist">
                {/* 再帰的なレンダリングは将来の拡張 */}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
};
