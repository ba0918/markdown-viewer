/**
 * HTML見出しID付与処理
 *
 * レンダリング済みHTMLの見出しタグ(H1-H3)にID属性を付与する。
 * ToC内リンクからのスクロールナビゲーションに必要。重複IDには連番を付与。
 */

import { generateHeadingId } from "./extractor.ts";
import { makeUniqueId } from "../../shared/utils/unique-id.ts";

/**
 * HTMLの見出しタグ(H1-H3)にID属性を付与
 *
 * DOMPurifyでサニタイズ済みのHTMLに対して、
 * 見出しタグ(h1, h2, h3)にid属性を追加する。
 *
 * 重複ID対策: 同じIDが既に存在する場合、GitHubと同様に連番を付与
 * 例: "ステータス", "ステータス-1", "ステータス-2"
 *
 * 処理:
 * 1. 正規表現で<h1>, <h2>, <h3>タグを検出
 * 2. 見出しテキストからIDを生成
 * 3. 重複チェックして必要なら連番付与
 * 4. id属性を追加
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

      const textContent = content.replace(/<[^>]+>/g, "");
      const baseId = generateHeadingId(textContent);

      if (!baseId) {
        return match;
      }

      const id = makeUniqueId(baseId, idCounts);
      return `<${tag}${attrs} id="${id}">${content}</${tag}>`;
    },
  );
};
