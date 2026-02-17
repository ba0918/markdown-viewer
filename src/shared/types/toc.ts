/**
 * TOC (Table of Contents) 型定義
 *
 * 目次（Table of Contents）で使用するデータ構造の型定義。
 * 複数レイヤー（domain, services, content, ui-components）で
 * 共有されるため、shared層に配置。
 */

/**
 * TOC見出しアイテムの型
 */
export interface TocHeading {
  /** 見出しレベル（1-3） */
  level: 1 | 2 | 3;
  /** 見出しテキスト */
  text: string;
  /** 見出しのID（URLフラグメント用） */
  id: string;
}

/**
 * TOCアイテム（階層構造対応）
 */
export interface TocItem extends TocHeading {
  /** 子見出しリスト */
  children: TocItem[];
}

/**
 * ToC UI状態の型定義
 */
export interface TocState {
  /** ToC全体の表示/非表示 */
  visible: boolean;
  /** ToC横幅（px） */
  width: number;
  /** 折りたたまれた項目のIDリスト */
  collapsedItems: string[];
}

/**
 * TocStateのデフォルト値
 */
export const DEFAULT_TOC_STATE: TocState = {
  visible: true,
  width: 250,
  collapsedItems: [],
};
