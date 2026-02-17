/**
 * シンタックスハイライト
 * highlight.js wrapper（純粋関数）
 *
 * 全言語サポート版（192言語）を使用する設計判断:
 * - Markdownビューアは「何が来るかわからない」汎用ツール
 * - Dockerfile, TOML, PowerShell, Scala等は開発者READMEで頻出
 * - Common版（37言語）では非対応言語がplaintextフォールバックになりUX低下
 * - highlight.jsはCJS形式のためesbuildのtree-shakingが効かない点に注意
 * - バンドルサイズはscripts/build.tsのmetafileレポートで監視中
 */

import hljs from "highlight.js";

/**
 * コードをシンタックスハイライト
 *
 * @param code - ハイライト対象のコード
 * @param lang - 言語名（例: 'javascript', 'python'）
 * @returns ハイライト済みHTML文字列
 *
 * 動作:
 * - 指定言語が登録されていればハイライト適用
 * - 未対応言語の場合は 'plaintext' として処理
 * - エラー時は元のコードをそのまま返す
 *
 * 注意:
 * - 同期関数（marked-highlight の仕様）
 * - 返り値は hljs.highlight().value（HTML文字列）
 */
export const highlightCode = (code: string, lang: string): string => {
  try {
    const language = hljs.getLanguage(lang) ? lang : "plaintext";
    const result = hljs.highlight(code, { language });
    return result.value;
  } catch (err) {
    console.error(`Failed to highlight code (lang: ${lang}):`, err);
    return code;
  }
};
