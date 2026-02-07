/**
 * @file fixtures.ts
 * @description Playwright test fixtures for Chrome extension testing
 *
 * Playwright公式パターンに基づいたChrome拡張機能テスト用のfixture定義。
 * Service Workerから拡張機能IDを動的に取得し、拡張機能ページへのアクセスを可能にする。
 *
 * ローカルサーバーを起動してhttp://localhost経由でMarkdownファイルをテスト。
 * file:// の権限問題を回避し、安定したE2Eテストを実現。
 *
 * Reference: https://playwright.dev/docs/chrome-extensions
 */

import { test as base, chromium, type BrowserContext } from '@playwright/test';
import path from 'node:path';
import process from 'node:process';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import type { Socket } from 'node:net';

/**
 * Chrome拡張機能テスト用の型定義
 */
type ExtensionFixtures = {
  context: BrowserContext;
  extensionId: string;
  testServerUrl: string; // テスト用ローカルサーバーのURL
};

/**
 * Chrome拡張機能テスト用のfixture
 *
 * - context: 拡張機能がロードされたBrowserContext
 * - extensionId: 拡張機能ID（Service Workerから動的取得）
 */
export const test = base.extend<ExtensionFixtures>({
  context: async ({}, use) => {
    // 拡張機能のdistディレクトリパス
    const pathToExtension = path.join(process.cwd(), 'dist');
    console.log('[Fixture] Extension path:', pathToExtension);

    // 一時的なユーザーデータディレクトリを作成
    // NOTE: 空文字列だと予期しない動作になる可能性があるため、明示的に一時ディレクトリを作成
    const { tmpdir } = await import('node:os');
    const { mkdtemp } = await import('node:fs/promises');
    const userDataDir = await mkdtemp(path.join(tmpdir(), 'playwright-'));
    console.log('[Fixture] User data dir:', userDataDir);

    console.log('[Fixture] Launching browser...');
    // Chrome拡張機能をロードしてBrowserContextを作成
    // NOTE: launchPersistentContextを使用すると拡張機能が確実にロードされる
    const context = await chromium.launchPersistentContext(userDataDir, {
      // 【重要】WSL2環境ではxvfb-run経由で仮想ディスプレイを使用
      // headless: falseだと実ブラウザ表示でWSL2が固まる
      // headless: trueだと旧ヘッドレスモードで拡張機能が動かない
      // 解決策: xvfb-run + headless: false で仮想ディスプレイ上にブラウザ表示
      headless: false,
      args: [
        // xvfb-run使用時は --headless=new 不要（実ブラウザとして起動）
        //'--headless=new',
        `--disable-extensions-except=${pathToExtension}`,
        `--load-extension=${pathToExtension}`,
        // --- WSL2 / CI 環境向けの安定化フラグ ---
        '--disable-gpu', // WSL2上のChromeはGPU周りで死にやすい
        '--disable-dev-shm-usage', // メモリ共有周りのクラッシュ回避
        '--no-sandbox',
        '--disable-setuid-sandbox',
      ],
    });
    console.log('[Fixture] Browser launched');

    await use(context);

    console.log('[Fixture] Closing browser...');
    await context.close();
    console.log('[Fixture] Browser closed');
  },

  extensionId: async ({ context }, use) => {
    console.log('[Fixture] Getting extension ID...');
    // Manifest V3: Service Workerから拡張機能IDを取得
    let [serviceWorker] = context.serviceWorkers();
    console.log('[Fixture] Existing service workers:', context.serviceWorkers().length);

    // Service Workerがまだ起動していない場合は待機
    if (!serviceWorker) {
      console.log('[Fixture] Waiting for service worker...');
      serviceWorker = await context.waitForEvent('serviceworker', { timeout: 30000 });
      console.log('[Fixture] Service worker detected');
    }

    // Service Worker URLから拡張機能IDを抽出
    // URL形式: chrome-extension://{extensionId}/service-worker.js
    const extensionId = serviceWorker.url().split('/')[2];
    console.log('[Fixture] Extension ID:', extensionId);

    await use(extensionId);
  },

  testServerUrl: async ({}, use) => {
    // ローカルサーバーを起動
    const PORT = 8765; // テスト用ポート

    console.log('[Fixture] Starting test server...');

    // 接続を追跡して強制終了できるようにする
    const connections = new Set<Socket>();

    // Node.js の http サーバーでシンプルなファイルサーバーを起動
    const server = createServer(async (req, res) => {
      const url = new URL(req.url || '/', `http://localhost:${PORT}`);
      const filePath = path.join(process.cwd(), url.pathname.slice(1)); // 先頭の / を除去

      console.log(`[Server] Request: ${req.url} -> ${filePath}`);

      try {
        const file = await readFile(filePath);
        const ext = path.extname(filePath);
        const contentType = ext === '.md' || ext === '.markdown' ? 'text/markdown' : 'text/plain';

        res.writeHead(200, { 'Content-Type': contentType });
        res.end(file);
      } catch (err) {
        console.error(`[Server] File not found: ${filePath}`, err);
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
      }
    });

    // 接続を追跡
    server.on('connection', (conn) => {
      connections.add(conn);
      conn.on('close', () => connections.delete(conn));
    });

    // サーバー起動を Promise でラップ
    await new Promise<void>((resolve) => {
      server.listen(PORT, () => {
        console.log(`[Fixture] Test server started on port ${PORT}`);
        resolve();
      });
    });

    const testServerUrl = `http://localhost:${PORT}`;

    console.log('[Fixture] Server ready, providing URL to tests');

    await use(testServerUrl);

    console.log('[Fixture] Stopping test server...');

    // 全接続を強制終了
    for (const conn of connections) {
      conn.destroy();
    }
    connections.clear();

    // テスト終了後にサーバーを停止
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        console.log('[Fixture] Server close timeout, forcing shutdown');
        resolve();
      }, 5000); // 5秒タイムアウト

      server.close((err) => {
        clearTimeout(timeout);
        if (err) {
          console.error('[Fixture] Server close error:', err);
          reject(err);
        } else {
          console.log('[Fixture] Test server stopped');
          resolve();
        }
      });
    });
  },
});

export const expect = test.expect;
