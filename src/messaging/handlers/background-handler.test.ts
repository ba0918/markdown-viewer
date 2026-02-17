// deno-lint-ignore-file no-explicit-any
/**
 * background-handler.ts ユニットテスト
 *
 * メッセージルーティングとランタイムバリデーションをテスト。
 * サービス層はモジュールレベルでインスタンス化されるため、
 * テスト可能な範囲（バリデーション、ルーティング正常系/異常系）に限定。
 *
 * NOTE: handleBackgroundMessage()はモジュールスコープでStateManager等を
 * 直接インスタンス化しているため、完全なモックはDI導入が必要。
 * ここではランタイムバリデーション（不正入力の拒否）を重点的にテスト。
 *
 * no-explicit-any: 不正入力をテストするためにany型キャストが必要
 */

import { assertEquals } from "@std/assert";
import { handleBackgroundMessage } from "./background-handler.ts";
import type { Message } from "../types.ts";

// Chrome API モック（StateManagerが内部で使用）
const mockStorage = new Map<string, unknown>();

(globalThis as any).chrome = {
  storage: {
    sync: {
      get: (keys: string | string[] | null) => {
        if (keys === null) {
          return Promise.resolve(Object.fromEntries(mockStorage));
        } else if (typeof keys === "string") {
          const value = mockStorage.get(keys);
          return Promise.resolve(value !== undefined ? { [keys]: value } : {});
        } else {
          const result: Record<string, unknown> = {};
          for (const key of keys) {
            const value = mockStorage.get(key);
            if (value !== undefined) {
              result[key] = value;
            }
          }
          return Promise.resolve(result);
        }
      },
      set: (items: Record<string, unknown>) => {
        Object.entries(items).forEach(([key, value]) => {
          mockStorage.set(key, value);
        });
        return Promise.resolve();
      },
      clear: () => {
        mockStorage.clear();
        return Promise.resolve();
      },
    },
    onChanged: {
      addListener: () => {},
    },
  },
  runtime: {
    getURL: (path: string) => `chrome-extension://test-id/${path}`,
  },
  downloads: {
    download: () => Promise.resolve(1),
    onDeterminingFilename: {
      addListener: () => {},
      removeListener: () => {},
    },
  },
};

// グローバルDEBUGフラグ設定（logger依存）
(globalThis as any).DEBUG = false;

// --- RENDER_MARKDOWN バリデーション ---

Deno.test("RENDER_MARKDOWN: 正常なmarkdownでsuccessを返す", async () => {
  const message: Message = {
    type: "RENDER_MARKDOWN",
    payload: { markdown: "# Hello" },
  };
  const result = await handleBackgroundMessage(message);
  assertEquals(result.success, true);
  if (result.success) {
    // RenderResult型の基本構造を検証
    assertEquals(typeof result.data, "object");
  }
});

Deno.test("RENDER_MARKDOWN: markdownが文字列でない場合エラー", async () => {
  const message = {
    type: "RENDER_MARKDOWN",
    payload: { markdown: 123 },
  } as any as Message;
  const result = await handleBackgroundMessage(message);
  assertEquals(result.success, false);
  if (!result.success) {
    assertEquals(result.error.includes("markdown must be a string"), true);
  }
});

Deno.test("RENDER_MARKDOWN: payloadがundefinedの場合エラー", async () => {
  const message = {
    type: "RENDER_MARKDOWN",
    payload: {},
  } as any as Message;
  const result = await handleBackgroundMessage(message);
  assertEquals(result.success, false);
});

// --- LOAD_THEME バリデーション ---

Deno.test("LOAD_THEME: 有効なthemeIdでsuccessを返す", async () => {
  const message: Message = {
    type: "LOAD_THEME",
    payload: { themeId: "light" },
  };
  const result = await handleBackgroundMessage(message);
  assertEquals(result.success, true);
});

Deno.test("LOAD_THEME: 無効なthemeIdでエラー", async () => {
  const message = {
    type: "LOAD_THEME",
    payload: { themeId: "invalid-theme" },
  } as any as Message;
  const result = await handleBackgroundMessage(message);
  assertEquals(result.success, false);
  if (!result.success) {
    assertEquals(result.error.includes("invalid themeId"), true);
  }
});

Deno.test("LOAD_THEME: themeIdが数値の場合エラー", async () => {
  const message = {
    type: "LOAD_THEME",
    payload: { themeId: 42 },
  } as any as Message;
  const result = await handleBackgroundMessage(message);
  assertEquals(result.success, false);
});

// --- UPDATE_THEME バリデーション ---

Deno.test("UPDATE_THEME: 有効なthemeIdでsuccessを返す", async () => {
  const message: Message = {
    type: "UPDATE_THEME",
    payload: { themeId: "dark" },
  };
  const result = await handleBackgroundMessage(message);
  assertEquals(result.success, true);
});

Deno.test("UPDATE_THEME: 無効なthemeIdでエラー", async () => {
  const message = {
    type: "UPDATE_THEME",
    payload: { themeId: "<script>alert(1)</script>" },
  } as any as Message;
  const result = await handleBackgroundMessage(message);
  assertEquals(result.success, false);
  if (!result.success) {
    assertEquals(result.error.includes("invalid themeId"), true);
  }
});

// --- UPDATE_HOT_RELOAD バリデーション ---

Deno.test("UPDATE_HOT_RELOAD: 有効なpayloadでsuccessを返す", async () => {
  const message: Message = {
    type: "UPDATE_HOT_RELOAD",
    payload: { enabled: true, interval: 2000, autoReload: false },
  };
  const result = await handleBackgroundMessage(message);
  assertEquals(result.success, true);
});

Deno.test("UPDATE_HOT_RELOAD: enabledが文字列の場合エラー", async () => {
  const message = {
    type: "UPDATE_HOT_RELOAD",
    payload: { enabled: "true", interval: 2000, autoReload: false },
  } as any as Message;
  const result = await handleBackgroundMessage(message);
  assertEquals(result.success, false);
  if (!result.success) {
    assertEquals(result.error.includes("enabled (boolean)"), true);
  }
});

Deno.test("UPDATE_HOT_RELOAD: intervalが文字列の場合エラー", async () => {
  const message = {
    type: "UPDATE_HOT_RELOAD",
    payload: { enabled: true, interval: "2000", autoReload: false },
  } as any as Message;
  const result = await handleBackgroundMessage(message);
  assertEquals(result.success, false);
});

Deno.test("UPDATE_HOT_RELOAD: autoReloadが欠損の場合エラー", async () => {
  const message = {
    type: "UPDATE_HOT_RELOAD",
    payload: { enabled: true, interval: 2000 },
  } as any as Message;
  const result = await handleBackgroundMessage(message);
  assertEquals(result.success, false);
});

// --- CHECK_FILE_CHANGE バリデーション ---

Deno.test("CHECK_FILE_CHANGE: URLが空文字の場合エラー", async () => {
  const message = {
    type: "CHECK_FILE_CHANGE",
    payload: { url: "" },
  } as any as Message;
  const result = await handleBackgroundMessage(message);
  assertEquals(result.success, false);
  if (!result.success) {
    assertEquals(result.error.includes("non-empty string"), true);
  }
});

Deno.test("CHECK_FILE_CHANGE: URLが数値の場合エラー", async () => {
  const message = {
    type: "CHECK_FILE_CHANGE",
    payload: { url: 12345 },
  } as any as Message;
  const result = await handleBackgroundMessage(message);
  assertEquals(result.success, false);
});

Deno.test("CHECK_FILE_CHANGE: リモートURLはSSRF防止でエラー", async () => {
  const message: Message = {
    type: "CHECK_FILE_CHANGE",
    payload: { url: "https://evil.example.com/secret" },
  };
  const result = await handleBackgroundMessage(message);
  assertEquals(result.success, false);
  if (!result.success) {
    assertEquals(result.error.includes("only local URLs"), true);
  }
});

Deno.test("CHECK_FILE_CHANGE: WSL2ファイルパスはエラー", async () => {
  const message: Message = {
    type: "CHECK_FILE_CHANGE",
    payload: { url: "file://wsl.localhost/Ubuntu/home/user/file.md" },
  };
  const result = await handleBackgroundMessage(message);
  assertEquals(result.success, false);
  if (!result.success) {
    assertEquals(result.error.includes("WSL2"), true);
  }
});

// --- GET_SETTINGS ---

Deno.test("GET_SETTINGS: 設定を返す", async () => {
  const message: Message = {
    type: "GET_SETTINGS",
    payload: {},
  };
  const result = await handleBackgroundMessage(message);
  assertEquals(result.success, true);
  if (result.success) {
    assertEquals(typeof result.data, "object");
  }
});

// --- UPDATE_SETTINGS バリデーション ---

Deno.test("UPDATE_SETTINGS: 有効なオブジェクトでsuccessを返す", async () => {
  const message = {
    type: "UPDATE_SETTINGS",
    payload: { theme: "dark" },
  } as any as Message;
  const result = await handleBackgroundMessage(message);
  assertEquals(result.success, true);
});

Deno.test("UPDATE_SETTINGS: payloadがnullの場合エラー", async () => {
  const message = {
    type: "UPDATE_SETTINGS",
    payload: null,
  } as any as Message;
  const result = await handleBackgroundMessage(message);
  assertEquals(result.success, false);
  if (!result.success) {
    assertEquals(result.error.includes("object required"), true);
  }
});

// --- GENERATE_EXPORT_HTML バリデーション ---

Deno.test("GENERATE_EXPORT_HTML: htmlが欠損の場合エラー", async () => {
  const message = {
    type: "GENERATE_EXPORT_HTML",
    payload: { html: 123, themeId: "light", filename: "test.md" },
  } as any as Message;
  const result = await handleBackgroundMessage(message);
  assertEquals(result.success, false);
  if (!result.success) {
    assertEquals(
      result.error.includes("html and filename must be strings"),
      true,
    );
  }
});

Deno.test("GENERATE_EXPORT_HTML: filenameが欠損の場合エラー", async () => {
  const message = {
    type: "GENERATE_EXPORT_HTML",
    payload: { html: "<p>test</p>", themeId: "light", filename: 42 },
  } as any as Message;
  const result = await handleBackgroundMessage(message);
  assertEquals(result.success, false);
});

// --- EXPORT_AND_DOWNLOAD バリデーション ---

Deno.test("EXPORT_AND_DOWNLOAD: htmlが欠損の場合エラー", async () => {
  const message = {
    type: "EXPORT_AND_DOWNLOAD",
    payload: { html: null, themeId: "light", filename: "test.md" },
  } as any as Message;
  const result = await handleBackgroundMessage(message);
  assertEquals(result.success, false);
});

// --- 未知のメッセージタイプ ---

Deno.test("Unknown message type: エラーを返す", async () => {
  const message = {
    type: "UNKNOWN_TYPE",
    payload: {},
  } as any as Message;
  const result = await handleBackgroundMessage(message);
  assertEquals(result.success, false);
  if (!result.success) {
    assertEquals(result.error.includes("Unknown message type"), true);
  }
});
