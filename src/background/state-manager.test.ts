import { assertEquals } from "@std/assert";
import { StateManager } from "./state-manager.ts";

// Chrome Storage APIのモック
const mockStorage = new Map<string, unknown>();

// グローバルにchrome APIをモック
(globalThis as Record<string, unknown>).chrome = {
  storage: {
    sync: {
      get: (keys: string | string[] | null) => {
        if (keys === null) {
          // 全データを返す
          return Promise.resolve(Object.fromEntries(mockStorage));
        } else if (typeof keys === "string") {
          // 単一キー
          const value = mockStorage.get(keys);
          return Promise.resolve(value !== undefined ? { [keys]: value } : {});
        } else {
          // 配列キー
          return Promise.resolve(
            Object.fromEntries(
              keys.map((key) => [key, mockStorage.get(key)]).filter(([_, v]) =>
                v !== undefined
              ),
            ),
          );
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
  },
};

Deno.test("StateManager: デフォルト状態の読み込み", async () => {
  mockStorage.clear();
  const manager = new StateManager();

  const state = await manager.load();

  assertEquals(state.theme, "light");
  assertEquals(state.hotReload.enabled, false);
  assertEquals(state.hotReload.interval, 3000);
  assertEquals(state.hotReload.autoReload, false);
});

Deno.test("StateManager: 状態の保存と読み込み", async () => {
  mockStorage.clear();
  const manager = new StateManager();

  await manager.save({ theme: "dark" });
  const state = await manager.load();

  assertEquals(state.theme, "dark");
});

Deno.test("StateManager: 部分的な状態の更新", async () => {
  mockStorage.clear();
  const manager = new StateManager();

  // デフォルト状態を保存
  await manager.save({ theme: "light" });

  // hotReloadのみ更新（intervalは1000以上が必要）
  await manager.save({
    hotReload: { enabled: true, interval: 5000, autoReload: true },
  });

  const state = await manager.load();

  assertEquals(state.theme, "light"); // 前の値を維持
  assertEquals(state.hotReload.enabled, true);
  assertEquals(state.hotReload.interval, 5000);
  assertEquals(state.hotReload.autoReload, true);
});

Deno.test("StateManager: 存在する状態の読み込み", async () => {
  mockStorage.clear();
  const manager = new StateManager();

  // 事前にストレージにデータを設定（intervalは1000以上が必要）
  mockStorage.set("appState", {
    theme: "dark",
    hotReload: { enabled: true, interval: 10000, autoReload: false },
  });

  const state = await manager.load();

  assertEquals(state.theme, "dark");
  assertEquals(state.hotReload.enabled, true);
  assertEquals(state.hotReload.interval, 10000);
  assertEquals(state.hotReload.autoReload, false);
});

Deno.test("StateManager: 不正なデータの処理（デフォルトにフォールバック）", async () => {
  mockStorage.clear();
  const manager = new StateManager();

  // 不正なデータを設定
  mockStorage.set("appState", { theme: "invalid-theme" });

  const state = await manager.load();

  // デフォルト値にフォールバック
  assertEquals(state.theme, "light");
  assertEquals(state.hotReload.enabled, false);
});

Deno.test("StateManager: 空オブジェクトでの保存（既存値を維持）", async () => {
  mockStorage.clear();
  const manager = new StateManager();

  // 初期状態を保存
  await manager.save({ theme: "dark" });

  // 空オブジェクトで保存
  await manager.save({});

  const state = await manager.load();

  // 前の値が維持される
  assertEquals(state.theme, "dark");
});

Deno.test("StateManager: テーマのみの更新", async () => {
  mockStorage.clear();
  const manager = new StateManager();

  await manager.updateTheme("dark");
  const state = await manager.load();

  assertEquals(state.theme, "dark");
});

Deno.test("StateManager: hotReload設定のみの更新", async () => {
  mockStorage.clear();
  const manager = new StateManager();

  await manager.updateHotReload({
    enabled: true,
    interval: 3000,
    autoReload: true,
  });
  const state = await manager.load();

  assertEquals(state.hotReload.enabled, true);
  assertEquals(state.hotReload.interval, 3000);
  assertEquals(state.hotReload.autoReload, true);
});

// 全6テーマの永続化テスト
Deno.test("StateManager: lightテーマの保存と読み込み", async () => {
  mockStorage.clear();
  const manager = new StateManager();

  await manager.updateTheme("light");
  const state = await manager.load();

  assertEquals(state.theme, "light");
});

Deno.test("StateManager: darkテーマの保存と読み込み", async () => {
  mockStorage.clear();
  const manager = new StateManager();

  await manager.updateTheme("dark");
  const state = await manager.load();

  assertEquals(state.theme, "dark");
});

Deno.test("StateManager: githubテーマの保存と読み込み", async () => {
  mockStorage.clear();
  const manager = new StateManager();

  await manager.updateTheme("github");
  const state = await manager.load();

  assertEquals(state.theme, "github");
});

Deno.test("StateManager: minimalテーマの保存と読み込み", async () => {
  mockStorage.clear();
  const manager = new StateManager();

  await manager.updateTheme("minimal");
  const state = await manager.load();

  assertEquals(state.theme, "minimal");
});

Deno.test("StateManager: solarized-lightテーマの保存と読み込み", async () => {
  mockStorage.clear();
  const manager = new StateManager();

  await manager.updateTheme("solarized-light");
  const state = await manager.load();

  assertEquals(state.theme, "solarized-light");
});

Deno.test("StateManager: solarized-darkテーマの保存と読み込み", async () => {
  mockStorage.clear();
  const manager = new StateManager();

  await manager.updateTheme("solarized-dark");
  const state = await manager.load();

  assertEquals(state.theme, "solarized-dark");
});

// 型バリデーションテスト
Deno.test("StateManager: interval < 1000 の場合にデフォルト値を使用", async () => {
  mockStorage.clear();
  const manager = new StateManager();

  // 不正なinterval値を設定
  mockStorage.set("appState", {
    theme: "dark",
    hotReload: { enabled: true, interval: 500, autoReload: true },
  });

  const state = await manager.load();

  assertEquals(state.hotReload.interval, 3000); // デフォルト値
  assertEquals(state.hotReload.enabled, true); // 有効な値は維持
  assertEquals(state.hotReload.autoReload, true); // 有効な値は維持
});

Deno.test("StateManager: interval が文字列の場合にデフォルト値を使用", async () => {
  mockStorage.clear();
  const manager = new StateManager();

  // 不正な型のinterval値を設定
  mockStorage.set("appState", {
    theme: "dark",
    hotReload: { enabled: true, interval: "5000", autoReload: true },
  });

  const state = await manager.load();

  assertEquals(state.hotReload.interval, 3000); // デフォルト値
  assertEquals(state.hotReload.enabled, true); // 有効な値は維持
  assertEquals(state.hotReload.autoReload, true); // 有効な値は維持
});

Deno.test("StateManager: enabled が文字列の場合にデフォルト値を使用", async () => {
  mockStorage.clear();
  const manager = new StateManager();

  // 不正な型のenabled値を設定
  mockStorage.set("appState", {
    theme: "dark",
    hotReload: { enabled: "true", interval: 5000, autoReload: false },
  });

  const state = await manager.load();

  assertEquals(state.hotReload.enabled, false); // デフォルト値
  assertEquals(state.hotReload.interval, 5000); // 有効な値は維持
  assertEquals(state.hotReload.autoReload, false); // 有効な値は維持
});
