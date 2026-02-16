/**
 * HTMLエスケープ（XSS対策）
 *
 * ユーザー入力やエラーメッセージをHTML内に埋め込む際に、
 * 特殊文字をHTMLエンティティに変換してXSS攻撃を防ぐ。
 *
 * @param str - エスケープする文字列（null/undefinedも安全に処理）
 * @returns エスケープされた文字列
 */
export function escapeHtml(str: string | null | undefined): string {
  if (str == null) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
