/**
 * 重複ID生成ユーティリティ
 *
 * IDの重複を検出し、GitHubと同様に連番を付与して一意なIDを生成する。
 * 例: "ステータス" → "ステータス-1" → "ステータス-2"
 */

/**
 * 一意なIDを生成（重複時は連番を付与）
 *
 * GitHubと同様のロジック:
 * - 初出: "ステータス"
 * - 2回目: "ステータス-1"
 * - 3回目: "ステータス-2"
 *
 * @param baseId ベースとなるID
 * @param idCounts ID出現回数を管理するMap（副作用：カウントが更新される）
 * @returns 一意なID
 */
export const makeUniqueId = (
  baseId: string,
  idCounts: Map<string, number>,
): string => {
  if (idCounts.has(baseId)) {
    const count = idCounts.get(baseId)!;
    idCounts.set(baseId, count + 1);
    return `${baseId}-${count}`;
  }
  idCounts.set(baseId, 1);
  return baseId;
};
