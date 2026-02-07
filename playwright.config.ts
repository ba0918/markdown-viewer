/**
 * @file playwright.config.ts
 * @description Playwright E2Eテスト設定
 *
 * Chrome拡張機能のE2Eテストを実行するための設定。
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // テストディレクトリ
  testDir: './tests/e2e',

  // テストタイムアウト
  timeout: 30000,

  // 並列実行無効（Chrome拡張は1つずつテスト）
  fullyParallel: false,
  workers: 1,

  // 失敗時のリトライ
  retries: 0,

  // レポーター
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report' }]
  ],

  // 共通設定
  use: {
    // ベースURL（ローカルファイル用）
    baseURL: 'file://',

    // トレース設定
    trace: 'on-first-retry',

    // スクリーンショット
    screenshot: 'only-on-failure',

    // ビデオ
    video: 'retain-on-failure',
  },

  // プロジェクト設定
  projects: [
    {
      name: 'chromium-extension',
      use: {
        ...devices['Desktop Chrome'],
        // Chrome拡張用の引数
        launchOptions: {
          args: [
            `--disable-extensions-except=${process.cwd()}/dist`,
            `--load-extension=${process.cwd()}/dist`,
            '--no-sandbox',
            '--disable-setuid-sandbox',
          ],
        },
      },
    },
  ],
});
