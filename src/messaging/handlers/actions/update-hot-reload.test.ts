// deno-lint-ignore-file no-explicit-any
/**
 * update-hot-reload アクション単体テスト
 */

import { assertEquals } from "@std/assert";
import { StateManager } from "../../../background/state-manager.ts";
import { createUpdateHotReloadAction } from "./update-hot-reload.ts";

// Chrome API モック
const mockStorage = new Map<string, unknown>();
(globalThis as any).chrome = {
  storage: {
    sync: {
      get: (keys: string | string[] | null) => {
        if (keys === null) {
          return Promise.resolve(Object.fromEntries(mockStorage));
        }
        if (typeof keys === "string") {
          const value = mockStorage.get(keys);
          return Promise.resolve(value !== undefined ? { [keys]: value } : {});
        }
        const result: Record<string, unknown> = {};
        for (const key of keys) {
          const value = mockStorage.get(key);
          if (value !== undefined) result[key] = value;
        }
        return Promise.resolve(result);
      },
      set: (items: Record<string, unknown>) => {
        Object.entries(items).forEach(([key, value]) =>
          mockStorage.set(key, value)
        );
        return Promise.resolve();
      },
      clear: () => {
        mockStorage.clear();
        return Promise.resolve();
      },
    },
    onChanged: { addListener: () => {} },
  },
  runtime: { getURL: (path: string) => `chrome-extension://test-id/${path}` },
};
(globalThis as any).DEBUG = false;

const stateManager = new StateManager();
const action = createUpdateHotReloadAction(stateManager);

Deno.test("update-hot-reload: 有効なpayloadでsuccessを返す", async () => {
  const result = await action({
    enabled: true,
    interval: 2000,
    autoReload: false,
  });
  assertEquals(result.success, true);
});

Deno.test("update-hot-reload: enabledが文字列の場合エラー", async () => {
  const result = await action({
    enabled: "true",
    interval: 2000,
    autoReload: false,
  });
  assertEquals(result.success, false);
  if (!result.success) {
    assertEquals(result.error.includes("enabled (boolean)"), true);
  }
});

Deno.test("update-hot-reload: intervalが文字列の場合エラー", async () => {
  const result = await action({
    enabled: true,
    interval: "2000",
    autoReload: false,
  });
  assertEquals(result.success, false);
});

Deno.test("update-hot-reload: autoReloadが欠損の場合エラー", async () => {
  const result = await action({ enabled: true, interval: 2000 });
  assertEquals(result.success, false);
});

Deno.test("update-hot-reload: payloadがundefinedの場合エラー", async () => {
  const result = await action(undefined);
  assertEquals(result.success, false);
});
