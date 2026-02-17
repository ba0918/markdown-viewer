/**
 * スクリーンショット撮影用Playwright設定
 *
 * メインのplaywright.config.tsとは独立した設定。
 * scripts/capture-store-screenshots.spec.ts 専用。
 *
 * 使用: xvfb-run --auto-servernum --server-args="-screen 0 1920x1080x24" \
 *       npx playwright test --config scripts/playwright-screenshots.config.ts
 */

import { defineConfig } from "@playwright/test";
import process from "node:process";

if (process.platform === "linux") {
  process.env.DBUS_SESSION_BUS_ADDRESS = "/dev/null";
}

export default defineConfig({
  testDir: ".",
  testMatch: "**/scripts/capture-store-screenshots.spec.ts",
  timeout: 120000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    trace: "off",
    screenshot: "off",
    video: "off",
  },
});
