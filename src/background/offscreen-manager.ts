/// <reference types="@types/chrome" />

/**
 * Offscreen Document Manager
 *
 * 責務:
 * - offscreen documentのライフサイクル管理（作成・破棄）
 * - offscreen documentの存在確認
 *
 * 制約:
 * - Chrome API操作のみ（ビジネスロジック禁止）
 * - domain/services直接呼び出し禁止
 */

const OFFSCREEN_DOCUMENT_PATH = 'offscreen.html';

/**
 * offscreen documentが既に存在するか確認
 */
async function hasOffscreenDocument(): Promise<boolean> {
  // Chrome 116+ では offscreen document の存在確認が可能
  if ('getContexts' in chrome.runtime) {
    const contexts = await (chrome.runtime as any).getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT'],
    });
    return contexts.length > 0;
  }
  return false;
}

/**
 * offscreen documentを作成
 *
 * @param justification - 人間が読める説明文
 */
export async function createOffscreenDocument(
  justification: string = 'Hot Reload file fetching'
): Promise<void> {
  // 既に存在する場合は何もしない
  if (await hasOffscreenDocument()) {
    console.log('[OffscreenManager] Offscreen document already exists');
    return;
  }

  console.log('[OffscreenManager] Creating offscreen document');

  await chrome.offscreen.createDocument({
    url: OFFSCREEN_DOCUMENT_PATH,
    reasons: [chrome.offscreen.Reason.DOM_SCRAPING],
    justification,
  });

  console.log('[OffscreenManager] Offscreen document created');
}

/**
 * offscreen documentを破棄
 */
export async function closeOffscreenDocument(): Promise<void> {
  if (!(await hasOffscreenDocument())) {
    console.log('[OffscreenManager] No offscreen document to close');
    return;
  }

  console.log('[OffscreenManager] Closing offscreen document');
  await chrome.offscreen.closeDocument();
  console.log('[OffscreenManager] Offscreen document closed');
}

/**
 * offscreen documentの存在を確認
 */
export async function isOffscreenDocumentActive(): Promise<boolean> {
  return await hasOffscreenDocument();
}
