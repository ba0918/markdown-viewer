import type { ThemeData } from './types.ts';

/**
 * HTMLにテーマを適用
 * 純粋関数として実装
 *
 * @param html - テーマ適用対象のHTML文字列
 * @param theme - テーマデータ
 * @returns テーマ適用済みのHTML文字列
 */
export const applyTheme = (html: string, theme: ThemeData): string => {
  return `
    <style>${theme.css}</style>
    <div class="markdown-body theme-${theme.id}">
      ${html}
    </div>
  `;
};
