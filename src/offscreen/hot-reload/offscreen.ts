/**
 * Offscreen Document: Hot Reload File Fetcher
 *
 * 責務:
 * - background scriptからのメッセージを受信
 * - fetch APIで file:// URL にアクセス
 * - Last-Modified情報を返却
 *
 * 制約:
 * - ビジネスロジック禁止（messaging I/O のみ）
 * - domain/services直接呼び出し禁止
 */

interface FetchFileRequest {
  type: 'FETCH_FILE';
  payload: {
    url: string;
  };
}

interface FetchFileResponse {
  success: boolean;
  data?: {
    lastModified: string | null;
    status: number;
  };
  error?: string;
}

// メッセージハンドラ
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'FETCH_FILE') {
    handleFetchFile(message as FetchFileRequest)
      .then((response) => sendResponse(response))
      .catch((error) =>
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : String(error),
        })
      );
    return true; // 非同期レスポンスを示す
  }
});

/**
 * ファイルをfetchして Last-Modified を取得
 */
async function handleFetchFile(
  message: FetchFileRequest
): Promise<FetchFileResponse> {
  const { url } = message.payload;

  try {
    console.log('[Offscreen] Fetching file:', url);
    console.log('[Offscreen] Request method: HEAD, cache: no-cache');

    const response = await fetch(url, {
      method: 'HEAD', // ヘッダーのみ取得
      cache: 'no-cache',
    });

    const lastModified = response.headers.get('Last-Modified');

    console.log('[Offscreen] Fetch success:', {
      status: response.status,
      statusText: response.statusText,
      lastModified,
      headers: Array.from(response.headers.entries()),
    });

    return {
      success: true,
      data: {
        lastModified,
        status: response.status,
      },
    };
  } catch (error) {
    console.error('[Offscreen] Fetch failed:', error);
    console.error('[Offscreen] Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    // GETメソッドも試してみる
    try {
      console.log('[Offscreen] Retrying with GET method...');
      const retryResponse = await fetch(url, {
        method: 'GET',
        cache: 'no-cache',
      });

      const lastModified = retryResponse.headers.get('Last-Modified');

      console.log('[Offscreen] GET Fetch success:', {
        status: retryResponse.status,
        statusText: retryResponse.statusText,
        lastModified,
      });

      return {
        success: true,
        data: {
          lastModified,
          status: retryResponse.status,
        },
      };
    } catch (retryError) {
      console.error('[Offscreen] GET Fetch also failed:', retryError);
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

console.log('[Offscreen] Hot Reload offscreen document loaded');
