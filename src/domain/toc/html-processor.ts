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
/**
 * 既存のid属性の有無を判定する正規表現
 *
 * 値なしの `<h1 id>` も検出する（サニタイザは値が空のid属性を
 * `id` 単体として出力しうるため）。`data-id` 等の別属性にはマッチしない。
 */
const HAS_ID_PATTERN = /\sid(?![\w-])/i;
/** 既存のid属性値を取り出す正規表現（"..." / '...' / 引用符なし に対応） */
const EXISTING_ID_PATTERN = /\sid\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/i;

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

      // 既にid属性がある見出しは上書きしない（id属性の重複出力を防ぐ）
      if (HAS_ID_PATTERN.test(attrs)) {
        const captured = EXISTING_ID_PATTERN.exec(attrs);
        const existingId = captured?.[1] ?? captured?.[2] ?? captured?.[3];
        if (existingId) {
          // 自動採番が既存IDと衝突しないよう予約だけ行う
          makeUniqueId(decodeBasicHtmlEntities(existingId), idCounts);
        }
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
