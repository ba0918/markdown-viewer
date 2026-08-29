/**
 * 見出しID生成
 *
 * 見出しテキストからURLフラグメントとして使えるIDを生成する純粋関数。
 * ToCリンク（#id）とHTML側のid属性の両方がこの関数の出力を使う。
 */

/**
 * 見出しテキストからURLフレンドリーなIDを生成
 *
 * ルール:
 * - 空白とアンダースコアをハイフンに変換
 * - バックティック(`)を除去（HTML側の<code>タグ変換と一致させるため）
 * - 危険な記号のみ削除(/, :, ~, *, ?, ", <, >, |, \, 括弧類)
 * - 連続ハイフンを1つに
 * - 先頭/末尾のハイフンを削除
 * - 日本語・英数字・一般的な記号は保持
 *
 * 例:
 * - "Hello World!" → "Hello-World!"
 * - "ADR-001: domain/層の導入" → "ADR-001-domain層の導入"
 * - "~~議題: ui/層の命名~~" → "議題-ui層の命名"
 * - "API Reference (v2.0)" → "API-Reference-v2.0"
 *
 * @param text 見出しテキスト（HTMLタグ・エンティティを除去済みの生テキスト）
 * @returns URLフレンドリーなID
 */
export const generateHeadingId = (text: string): string => {
  return text
    .trim()
    // HTML側の<code>タグ変換と一致させるため
    .replace(/`/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/[/:~*?"<>|\\()[\]{}]+/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
};
