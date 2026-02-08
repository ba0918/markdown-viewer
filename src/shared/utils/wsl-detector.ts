/**
 * WSL2ファイル判定
 *
 * WSL2ファイルはChromeのセキュリティ制限により
 * Background ScriptからのfetchができないためHot Reload非対応
 *
 * 検知パターン:
 * - file://wsl.localhost/... (Windows 11の新方式)
 * - file://wsl$/... (古い方式)
 * - その他 wsl で始まるホスト名 (将来的な新パターン対応)
 *
 * @param url - 判定対象のURL
 * @returns WSL2ファイルの場合true、それ以外はfalse
 */
export const isWslFile = (url: string): boolean => {
  try {
    const urlObj = new URL(url);
    // ホスト名が wsl で始まる場合（wsl.localhost、wsl$など）
    return urlObj.hostname.startsWith("wsl");
  } catch {
    // URL解析失敗時はfalse（通常のfile://などはhostnameが空文字になる）
    return false;
  }
};
