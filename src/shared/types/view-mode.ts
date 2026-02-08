/**
 * View Mode型定義
 *
 * Markdownビューアの表示モード
 */

/**
 * Viewモード: 'view' | 'raw'
 *
 * - 'view': レンダリング済みのHTML表示（デフォルト）
 * - 'raw': 元のMarkdownテキスト表示
 */
export type ViewMode = "view" | "raw";

/**
 * デフォルトのViewモード
 */
export const DEFAULT_VIEW_MODE: ViewMode = "view";
