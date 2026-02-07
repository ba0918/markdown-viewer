import type { ThemeData } from './types.ts';

/**
 * HTMLにテーマクラスを適用
 * 純粋関数として実装
 *
 * CSSファイルの読み込みはcontent層で行う（chrome.runtime.getURL()はcontent層の責務）
 *
 * @param html - テーマ適用対象のHTML文字列
 * @param theme - テーマデータ
 * @returns テーマクラス適用済みのHTML文字列
 */
export const applyTheme = (html: string, theme: ThemeData): string => {
  return `
    <div class="markdown-body theme-${theme.id}">
      ${html}
    </div>
  `;
};
