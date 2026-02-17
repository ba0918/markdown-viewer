// deno-lint-ignore-file no-explicit-any
/**
 * get-settings アクション単体テスト
 */

import { assertEquals } from "@std/assert";
import { StateManager } from "../../../background/state-manager.ts";
import { createGetSettingsAction } from "./get-settings.ts";

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
const action = createGetSettingsAction(stateManager);

Deno.test("get-settings: 設定を返す", async () => {
  const result = await action({});
  assertEquals(result.success, true);
  if (result.success) {
    assertEquals(typeof result.data, "object");
  }
});

Deno.test("get-settings: payloadがnullでもsuccessを返す", async () => {
  const result = await action(null);
  assertEquals(result.success, true);
});
