/**
 * TOC (Table of Contents) 型定義 - 後方互換re-export
 *
 * 型定義の実体は shared/types/toc.ts に移動済み。
 * domain/toc 配下（html-processor, normalizer, tree-builder）の
 * importパスを変更不要にするためのre-export。
 */
export type { TocHeading, TocItem, TocState } from "../../shared/types/toc.ts";
export { DEFAULT_TOC_STATE } from "../../shared/types/toc.ts";
