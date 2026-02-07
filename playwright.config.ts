/**
 * @file playwright.config.ts
 * @description Playwright E2Eテスト設定
 *
 * Chrome拡張機能のE2Eテストを実行するための設定。
 * NOTE: 拡張機能のロードはfixtures.tsで行うため、ここでは基本設定のみ。
 */

import { defineConfig } from '@playwright/test';

// WSL2環境: DBusの問題を回避するために環境変数を設定
// Reference: https://github.com/microsoft/playwright/issues/11072
if (process.platform === 'linux') {
  process.env.DBUS_SESSION_BUS_ADDRESS = '/dev/null';
}

export default defineConfig({
  // テストディレクトリ
  testDir: './tests/e2e',

  // テストタイムアウト
  timeout: 60000, // Hot Reloadテストは時間がかかるため60秒に延長

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
    // トレース設定
    trace: 'on-first-retry',

    // スクリーンショット
    screenshot: 'only-on-failure',

    // ビデオ
    video: 'retain-on-failure',
  },
});
