// deno-lint-ignore-file no-explicit-any
/**
 * action-registry 単体テスト
 */

import { assertEquals } from "@std/assert";
import { createActionRegistry } from "../action-registry.ts";

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

const EXPECTED_MESSAGE_TYPES = [
  "RENDER_MARKDOWN",
  "LOAD_THEME",
  "UPDATE_THEME",
  "UPDATE_HOT_RELOAD",
  "CHECK_FILE_CHANGE",
  "GET_SETTINGS",
];

Deno.test("action-registry: 全メッセージタイプが登録されている", () => {
  const registry = createActionRegistry();
  for (const type of EXPECTED_MESSAGE_TYPES) {
    assertEquals(
      typeof registry[type],
      "function",
      `${type} should be registered`,
    );
  }
});

Deno.test("action-registry: 登録数が正確", () => {
  const registry = createActionRegistry();
  assertEquals(Object.keys(registry).length, EXPECTED_MESSAGE_TYPES.length);
});

Deno.test("action-registry: 未知のタイプはundefined", () => {
  const registry = createActionRegistry();
  assertEquals(registry["UNKNOWN_TYPE"], undefined);
});
