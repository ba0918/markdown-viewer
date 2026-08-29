/**
 * HTML見出しID付与処理
 *
 * レンダリング済みHTMLの見出しタグ(H1-H3)にID属性を付与する。
 * ToC内リンクからのスクロールナビゲーションに必要。重複IDには連番を付与。
 */

import { generateHeadingId } from "./extractor.ts";
import { makeUniqueId } from "../../shared/utils/unique-id.ts";
import { decodeBasicHtmlEntities } from "../../shared/utils/html-entities.ts";
import { escapeHtml } from "../../shared/utils/escape-html.ts";

/**
 * HTMLの見出しタグ(H1-H3)にID属性を付与
 *
 * サニタイズ済みのHTMLに対して、見出しタグ(h1, h2, h3)にid属性を追加する。
 *
 * ⚠️ IDは extractor.ts の extractHeadings() が生成するToC側のIDと一致させる必要がある。
 * ToC側はMarkdownの生テキストを扱うのに対し、こちらはHTMLエスケープ済みテキストを
 * 扱うため、ID生成前にHTMLエンティティをデコードして入力を揃える。
 * （デコードしないと "Tips & Tricks" のToCリンクが機能しない）
 *
 * 重複ID対策: 同じIDが既に存在する場合、GitHubと同様に連番を付与
 * 例: "ステータス", "ステータス-1", "ステータス-2"
 *
 * 処理:
 * 1. 正規表現で<h1>, <h2>, <h3>タグを検出
 * 2. HTMLタグ除去 + エンティティデコードで見出しの生テキストを復元
 * 3. 見出しテキストからIDを生成
 * 4. 重複チェックして必要なら連番付与
 * 5. id属性を追加（属性値としてエスケープ）
 *
 * @param html レンダリング済みHTML
 * @returns ID属性付きHTML
 */
export const addHeadingIds = (html: string): string => {
  const idCounts = new Map<string, number>();

  return html.replace(
    /<(h[1-3])([^>]*)>(.*?)<\/\1>/gi,
    (match, tag, attrs, content) => {
      if (/\sid=/i.test(attrs)) {
        return match;
      }

      const textContent = decodeBasicHtmlEntities(
        content.replace(/<[^>]+>/g, ""),
      );
      const baseId = generateHeadingId(textContent);

      if (!baseId) {
        return match;
      }

      const id = makeUniqueId(baseId, idCounts);
      return `<${tag}${attrs} id="${escapeHtml(id)}">${content}</${tag}>`;
    },
  );
};
