/**
 * 配列要素のトグル操作（汎用ユーティリティ）
 *
 * 指定IDが配列に含まれていれば削除、含まれていなければ追加する。
 * 内部でSetを使用し、重複を排除する。
 *
 * @param items - 現在の項目IDリスト
 * @param id - トグル対象のID
 * @returns 更新後の項目IDリスト
 */
export const toggleSetItem = (
  items: string[],
  id: string,
): string[] => {
  const set = new Set(items);
  if (set.has(id)) {
    set.delete(id);
  } else {
    set.add(id);
  }
  return Array.from(set);
};
