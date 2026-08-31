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
  let count = idCounts.get(baseId) ?? 0;
  let candidate = count === 0 ? baseId : `${baseId}-${count}`;

  // `intro-1` が先に使われた後で `intro` が重複するケースでも、
  // 既存IDと衝突しない次の番号まで進める。
  while (idCounts.has(candidate)) {
    count += 1;
    candidate = `${baseId}-${count}`;
  }

  idCounts.set(baseId, count + 1);
  if (candidate !== baseId) {
    idCounts.set(candidate, 1);
  }
  return candidate;
};
