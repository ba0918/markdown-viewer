/**
 * HTMLエンティティのデコードユーティリティ
 *
 * markedがHTML出力時にエスケープする基本エンティティ（& < > " '）を
 * 元の文字へ戻す。HTML文字列から「元のテキスト」を復元する用途で使用する。
 *
 * ⚠️ セキュリティ用途（URLスキーム判定など）には使用しないこと。
 * 攻撃者が使う名前付きエンティティ（&Tab; 等）や多重エンコードを扱わないため、
 * その用途には shared/utils/url-scheme.ts の normalizeUrlAttributeValue() を使う。
 */

/** markedがエスケープする基本エンティティの対応表 */
const BASIC_ENTITIES: Record<string, string> = {
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&#x27;": "'",
  "&apos;": "'",
  // &amp; は最後に置換する必要があるが、単一パスのreplaceなら順序は無関係
  "&amp;": "&",
};

const BASIC_ENTITY_PATTERN = /&(?:lt|gt|amp|quot|apos|#39|#x27);/gi;

/**
 * 基本HTMLエンティティを1回だけデコードする
 *
 * 単一パスで置換するため、`&amp;lt;` は `&lt;` になり `<` にはならない。
 * これはHTMLエスケープを1回適用した文字列を元に戻す正しい挙動。
 *
 * @param html - デコード対象の文字列
 * @returns デコード済み文字列
 *
 * @example
 * ```ts
 * decodeBasicHtmlEntities("A &amp; B"); // "A & B"
 * decodeBasicHtmlEntities("&lt;div&gt;"); // "<div>"
 * ```
 */
export const decodeBasicHtmlEntities = (html: string): string => {
  return html.replace(
    BASIC_ENTITY_PATTERN,
    (match) => BASIC_ENTITIES[match.toLowerCase()] ?? match,
  );
};
