/**
 * TOC (Table of Contents) 型定義
 *
 * 責務: 目次データ構造の型定義
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
