/**
 * useSettings フックのテスト
 *
 * テスト対象:
 * - 初期化時にGET_SETTINGSで設定を取得
 * - テーマ変更のUPDATE_THEMEメッセージ送信
 * - エラーハンドリング（loadSettings / handleThemeChange）
 * - settings未取得時のhandleThemeChangeのnullガード
 * - handleThemeChangeのonSuccessコールバック
 */

import { h as _h } from "preact";
import { assertEquals } from "@std/assert";
import { render as preactRender } from "preact";
import { parseHTML } from "linkedom";
import { useSettings } from "./useSettings.ts";
import type { UseSettingsReturn } from "./useSettings.ts";
import type { AppState } from "../../../shared/types/state.ts";

// DOM環境のセットアップ
const { document, window } = parseHTML(
  "<!DOCTYPE html><html><body></body></html>",
);

// @ts-ignore: linkedom types not available in Deno
globalThis.document = document;
// @ts-ignore: linkedom types not available in Deno
globalThis.window = window;
// @ts-ignore: linkedom types not available in Deno
globalThis.Element = window.Element;
// @ts-ignore: linkedom types not available in Deno
globalThis.Event = window.Event;

// Chrome API モック
const setupChromeMock = (
  // deno-lint-ignore no-explicit-any
  sendMessageFn: (message: any) => Promise<any>,
) => {
  // deno-lint-ignore no-explicit-any
  (globalThis as any).chrome = {
    runtime: {
      sendMessage: sendMessageFn,
    },
  };
};

/** テスト用のAppStateデフォルト値 */
const createMockSettings = (overrides?: Partial<AppState>): AppState => ({
  theme: "light",
  hotReload: {
    enabled: false,
    interval: 1000,
    autoReload: false,
  },
  ...overrides,
});

/** 非同期state更新を待機するヘルパー */
const waitForUpdate = (ms = 50) =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * useSettingsフックをテストするためのラッパーコンポーネント
 * フック呼び出し結果をrefCallbackに格納して外部からアクセス可能にする
 */
let hookResult: UseSettingsReturn | null = null;

const TestComponent = () => {
  hookResult = useSettings();
  return null;
};

/** Preactコンポーネントをレンダリング */
function render() {
  const container = document.createElement("div");
  preactRender(<TestComponent />, container);
  return { container };
}

Deno.test({
  name: "useSettings: 初期化時にGET_SETTINGSで設定を取得する",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const mockSettings = createMockSettings();
    setupChromeMock(() =>
      Promise.resolve({ success: true, data: mockSettings })
    );

    const { container } = render();
    await waitForUpdate();

    assertEquals(hookResult!.settings, mockSettings);
    assertEquals(hookResult!.loading, false);
    assertEquals(hookResult!.error, null);

    preactRender(null, container);
  },
});

Deno.test({
  name: "useSettings: GET_SETTINGSエラー時にerrorを設定する",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    setupChromeMock(() =>
      Promise.resolve({ success: false, error: "Connection failed" })
    );

    const { container } = render();
    await waitForUpdate();

    assertEquals(hookResult!.settings, null);
    assertEquals(hookResult!.loading, false);
    assertEquals(hookResult!.error, "Connection failed");

    preactRender(null, container);
  },
});

Deno.test({
  name: "useSettings: handleThemeChangeでテーマを更新する",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const mockSettings = createMockSettings({ theme: "light" });
    // deno-lint-ignore no-explicit-any
    const sentMessages: any[] = [];
    setupChromeMock((message) => {
      sentMessages.push(message);
      if (message.type === "GET_SETTINGS") {
        return Promise.resolve({ success: true, data: mockSettings });
      }
      return Promise.resolve({ success: true, data: null });
    });

    const { container } = render();
    await waitForUpdate();

    // テーマ変更を実行
    await hookResult!.handleThemeChange("dark");
    await waitForUpdate();

    assertEquals(hookResult!.settings?.theme, "dark");
    assertEquals(hookResult!.error, null);

    // UPDATE_THEMEメッセージが送信されたことを確認
    const updateMessage = sentMessages.find((m) => m.type === "UPDATE_THEME");
    assertEquals(updateMessage?.payload.themeId, "dark");

    preactRender(null, container);
  },
});

Deno.test({
  name: "useSettings: handleThemeChangeのonSuccessコールバックが呼ばれる",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const mockSettings = createMockSettings();
    setupChromeMock((message) => {
      if (message.type === "GET_SETTINGS") {
        return Promise.resolve({ success: true, data: mockSettings });
      }
      return Promise.resolve({ success: true, data: null });
    });

    const { container } = render();
    await waitForUpdate();

    let onSuccessCalled = false;
    await hookResult!.handleThemeChange("github", () => {
      onSuccessCalled = true;
    });

    assertEquals(onSuccessCalled, true);

    preactRender(null, container);
  },
});

Deno.test({
  name: "useSettings: settings未取得時のhandleThemeChangeはスキップされる",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    // GET_SETTINGSがエラーを返す → settingsがnull
    setupChromeMock(() => Promise.resolve({ success: false, error: "Failed" }));

    const { container } = render();
    await waitForUpdate();

    // settingsがnullの状態でhandleThemeChangeを呼ぶ
    let onSuccessCalled = false;
    await hookResult!.handleThemeChange("dark", () => {
      onSuccessCalled = true;
    });

    // onSuccessは呼ばれない（nullガードで早期リターン）
    assertEquals(onSuccessCalled, false);
    assertEquals(hookResult!.settings, null);

    preactRender(null, container);
  },
});

Deno.test({
  name: "useSettings: handleThemeChangeエラー時にerrorを設定する",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const mockSettings = createMockSettings();
    setupChromeMock((message) => {
      if (message.type === "GET_SETTINGS") {
        return Promise.resolve({ success: true, data: mockSettings });
      }
      if (message.type === "UPDATE_THEME") {
        return Promise.resolve({
          success: false,
          error: "Theme update failed",
        });
      }
      return Promise.resolve({ success: true, data: null });
    });

    const { container } = render();
    await waitForUpdate();

    // テーマ変更でエラーが発生
    await hookResult!.handleThemeChange("dark");
    await waitForUpdate();

    assertEquals(hookResult!.error, "Theme update failed");
    // settingsは更新されない（元のまま）
    assertEquals(hookResult!.settings?.theme, "light");

    preactRender(null, container);
  },
});
