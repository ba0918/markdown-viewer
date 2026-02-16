/**
 * ToC折りたたみ状態管理
 *
 * 折りたたみ項目の追加・削除を行う純粋関数。
 * UIコンポーネント（TableOfContents.tsx）から分離して単体テスト可能にする。
 */

/**
 * 折りたたみ項目のトグル
 *
 * 指定IDが折りたたみリストに含まれていれば削除（展開）、
 * 含まれていなければ追加（折りたたみ）する。
 *
 * @param collapsedItems - 現在の折りたたみ項目IDリスト
 * @param id - トグル対象のID
 * @returns 更新後の折りたたみ項目IDリスト
 */
export const toggleCollapsedItem = (
  collapsedItems: string[],
  id: string,
): string[] => {
  const set = new Set(collapsedItems);
  if (set.has(id)) {
    set.delete(id);
  } else {
    set.add(id);
  }
  return Array.from(set);
};
