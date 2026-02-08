/// <reference types="@types/chrome" />

/**
 * Offscreen Fetcher (Services Layer向けヘルパー)
 *
 * 責務:
 * - offscreen documentへのメッセージング定義
 *
 * 制約:
 * - Chrome API使用OK（backgroundレイヤーで使用される想定）
 * - offscreen document管理はbackground/offscreen-managerで行う
 *
 * NOTE: これは実際はbackground層で使うべきかも。
 * 実験後にレイヤー構成を見直す予定。
 */

export interface FetchFileResult {
  lastModified: string | null;
  status: number;
}

/**
 * offscreen documentにファイルfetchをリクエスト
 *
 * NOTE: この関数を呼ぶ前にoffscreen documentが作成されている必要がある
 *
 * @param url - ファイルURL（file://... or http://localhost/...）
 * @returns Last-Modified情報とステータスコード
 */
export async function sendFetchFileRequest(
  url: string
): Promise<FetchFileResult> {
  // offscreen documentにメッセージ送信
  const response = await chrome.runtime.sendMessage({
    type: 'FETCH_FILE',
    payload: { url },
  });

  if (!response.success) {
    throw new Error(`Failed to fetch file: ${response.error}`);
  }

  return {
    lastModified: response.data.lastModified,
    status: response.data.status,
  };
}
