/**
 * HTML見出しID付与処理
 *
 * レンダリング済みHTMLの見出しタグ(H1-H3)にID属性を付与し、
 * 同時にToC構築用の見出しリストを返す。
 *
 * ⚠️ ToCのIDとHTMLのid属性は「同じ走査結果」から生成する。
 * かつてはMarkdownトークンから独立にToCを組み立てていたが、
 * 引用・リスト内の見出しや生HTMLの見出しをHTML側だけが拾うため
 * 重複IDの連番がズレ、ToCリンクが別の見出しへ飛ぶ不具合があった。
 */

import { generateHeadingId } from "./heading-id.ts";
import { makeUniqueId } from "../../shared/utils/unique-id.ts";
import { decodeBasicHtmlEntities } from "../../shared/utils/html-entities.ts";
import { escapeHtml } from "../../shared/utils/escape-html.ts";
import type { TocHeading } from "./types.ts";

/** addHeadingIds() の戻り値 */
export interface HeadingIdResult {
  /** id属性を付与したHTML */
  html: string;
  /** 付与順（＝ドキュメント順）の見出しリスト */
  headings: TocHeading[];
}

/** 見出しタグとその中身を抽出する正規表現 */
const HEADING_PATTERN = /<(h[1-3])([^>]*)>(.*?)<\/\1>/gi;
/** 既存のid属性値を取り出す正規表現 */
const EXISTING_ID_PATTERN = /\sid\s*=\s*"([^"]*)"/i;

/**
 * 見出しHTMLから表示用のプレーンテキストを取り出す
 *
 * HTMLタグを除去し、markedがエスケープしたエンティティを元に戻す。
 */
const toPlainText = (content: string): string =>
  decodeBasicHtmlEntities(content.replace(/<[^>]+>/g, "")).trim();

/**
 * HTMLの見出しタグ(H1-H3)にID属性を付与し、見出しリストを返す
 *
 * 重複ID対策: 同じIDが既に存在する場合、GitHubと同様に連番を付与
 * 例: "ステータス", "ステータス-1", "ステータス-2"
 *
 * 処理:
 * 1. 正規表現で<h1>, <h2>, <h3>タグを検出
 * 2. HTMLタグ除去 + エンティティデコードで見出しの生テキストを復元
 * 3. 見出しテキストからIDを生成
 * 4. 重複チェックして必要なら連番付与
 * 5. id属性を追加（属性値としてエスケープ）し、見出しリストへ記録
 *
 * 既にid属性を持つ見出し（Markdown中の生HTML等）はIDを上書きしないが、
 * 後続の自動採番と衝突しないようIDを予約する。
 *
 * @param html サニタイズ済みHTML
 * @returns ID付きHTMLと見出しリスト
 */
export const addHeadingIds = (html: string): HeadingIdResult => {
  const idCounts = new Map<string, number>();
  const headings: TocHeading[] = [];

  const processed = html.replace(
    HEADING_PATTERN,
    (match, tag: string, attrs: string, content: string) => {
      const level = Number(tag[1]) as 1 | 2 | 3;
      const text = toPlainText(content);

      const existingId = EXISTING_ID_PATTERN.exec(attrs)?.[1];
      if (existingId !== undefined) {
        // 自動採番が既存IDと衝突しないよう予約だけ行う
        makeUniqueId(decodeBasicHtmlEntities(existingId), idCounts);
        return match;
      }

      const baseId = generateHeadingId(text);
      if (!baseId) {
        return match;
      }

      const id = makeUniqueId(baseId, idCounts);
      headings.push({ level, text, id });
      return `<${tag}${attrs} id="${escapeHtml(id)}">${content}</${tag}>`;
    },
  );

  return { html: processed, headings };
};
