/**
 * HTML見出しID付与処理
 *
 * 責務: レンダリング済みHTMLの見出しタグにID属性を付与
 * ✅ OK: 純粋関数、DOM操作なし（文字列処理）
 * ❌ NG: 副作用
 */

import { generateHeadingId } from './extractor.ts';

/**
 * HTMLの見出しタグ（H1-H3）にID属性を付与
 *
 * DOMPurifyでサニタイズ済みのHTMLに対して、
 * 見出しタグ（h1, h2, h3）にid属性を追加する。
 *
 * 処理:
 * 1. 正規表現で<h1>, <h2>, <h3>タグを検出
 * 2. 見出しテキストからIDを生成
 * 3. id属性を追加
 *
 * @param html レンダリング済みHTML
 * @returns ID属性付きHTML
 */
export const addHeadingIds = (html: string): string => {
  // H1-H3タグを検出してID付与
  return html.replace(
    /<(h[1-3])([^>]*)>(.*?)<\/\1>/gi,
    (match, tag, attrs, content) => {
      // 既にid属性がある場合はスキップ
      if (/\sid=/i.test(attrs)) {
        return match;
      }

      // テキストコンテンツからHTMLタグを除去
      const textContent = content.replace(/<[^>]+>/g, '');

      // IDを生成
      const id = generateHeadingId(textContent);

      // IDが空の場合はそのまま返す
      if (!id) {
        return match;
      }

      // id属性を追加
      return `<${tag}${attrs} id="${id}">${content}</${tag}>`;
    }
  );
};
