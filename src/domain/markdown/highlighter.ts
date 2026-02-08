/**
 * シンタックスハイライト
 * highlight.js wrapper（純粋関数）
 *
 * 注意:
 * - 全言語サポート版を使用（バンドルサイズは約500KB gzip後）
 * - tree-shaking により実際に使われる言語のみがバンドルされる
 * - Markdownファイルは通常1つずつ読み込まれるため、パフォーマンス影響は小さい
 */

// highlight.js 全言語サポート版
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
    // 言語が登録されているか確認
    const language = hljs.getLanguage(lang) ? lang : "plaintext";

    // ハイライト実行（返り値はオブジェクト）
    const result = hljs.highlight(code, { language });

    // .value プロパティでHTML文字列を取得
    return result.value;
  } catch (err) {
    // エラー時は元のコードを返す（エスケープなし）
    console.error(`Failed to highlight code (lang: ${lang}):`, err);
    return code;
  }
};
