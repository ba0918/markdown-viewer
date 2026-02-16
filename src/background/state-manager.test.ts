import { assertEquals } from "@std/assert";
import { StateManager } from "./state-manager.ts";

const mockStorage = new Map<string, unknown>();

(globalThis as Record<string, unknown>).chrome = {
  storage: {
    sync: {
      get: (keys: string | string[] | null) => {
        if (keys === null) {
          return Promise.resolve(Object.fromEntries(mockStorage));
        } else if (typeof keys === "string") {
          const value = mockStorage.get(keys);
          return Promise.resolve(value !== undefined ? { [keys]: value } : {});
        } else {
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

  await manager.save({ theme: "light" });
  // intervalは1000以上が必要
  await manager.save({
    hotReload: { enabled: true, interval: 5000, autoReload: true },
  });

  const state = await manager.load();

  assertEquals(state.theme, "light");
  assertEquals(state.hotReload.enabled, true);
  assertEquals(state.hotReload.interval, 5000);
  assertEquals(state.hotReload.autoReload, true);
});

Deno.test("StateManager: 存在する状態の読み込み", async () => {
  mockStorage.clear();
  const manager = new StateManager();

  // intervalは1000以上が必要
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

  mockStorage.set("appState", { theme: "invalid-theme" });

  const state = await manager.load();

  assertEquals(state.theme, "light");
  assertEquals(state.hotReload.enabled, false);
});

Deno.test("StateManager: 空オブジェクトでの保存（既存値を維持）", async () => {
  mockStorage.clear();
  const manager = new StateManager();

  await manager.save({ theme: "dark" });
  await manager.save({});

  const state = await manager.load();

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

  mockStorage.set("appState", {
    theme: "dark",
    hotReload: { enabled: true, interval: 500, autoReload: true },
  });

  const state = await manager.load();

  assertEquals(state.hotReload.interval, 3000);
  assertEquals(state.hotReload.enabled, true);
  assertEquals(state.hotReload.autoReload, true);
});

Deno.test("StateManager: interval が文字列の場合にデフォルト値を使用", async () => {
  mockStorage.clear();
  const manager = new StateManager();

  mockStorage.set("appState", {
    theme: "dark",
    hotReload: { enabled: true, interval: "5000", autoReload: true },
  });

  const state = await manager.load();

  assertEquals(state.hotReload.interval, 3000);
  assertEquals(state.hotReload.enabled, true);
  assertEquals(state.hotReload.autoReload, true);
});

Deno.test("StateManager: enabled が文字列の場合にデフォルト値を使用", async () => {
  mockStorage.clear();
  const manager = new StateManager();

  mockStorage.set("appState", {
    theme: "dark",
    hotReload: { enabled: "true", interval: 5000, autoReload: false },
  });

  const state = await manager.load();

  assertEquals(state.hotReload.enabled, false);
  assertEquals(state.hotReload.interval, 5000);
  assertEquals(state.hotReload.autoReload, false);
});
