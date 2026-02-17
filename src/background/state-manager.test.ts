// deno-lint-ignore-file no-explicit-any
import { assertEquals } from "@std/assert";
import { assertRejects } from "@std/assert";
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

// === 並行save()の競合状態テスト ===

Deno.test("StateManager: 並行save()で両方の変更が反映される", async () => {
  mockStorage.clear();
  const manager = new StateManager();

  // 初期状態を設定
  await manager.save({ theme: "light" });

  // 並行してsave()を実行（awaitしない）
  const p1 = manager.save({ theme: "dark" });
  const p2 = manager.save({ hotReload: { enabled: true } });

  await Promise.all([p1, p2]);

  const state = await manager.load();
  // mutex直列化により: p1が先→{dark, enabled:false}、p2がその結果をベースに→{dark, enabled:true}
  assertEquals(state.theme, "dark");
  assertEquals(state.hotReload.enabled, true);
});

Deno.test("StateManager: 遅延ありのストレージでも並行save()が安全", async () => {
  mockStorage.clear();
  const manager = new StateManager();

  // 遅延付きモックに差し替え
  const originalGet = chrome.storage.sync.get;
  (chrome.storage.sync as any).get = async (
    keys: string | string[] | null,
  ) => {
    await new Promise((r) => setTimeout(r, 50)); // 50ms遅延
    return originalGet(keys);
  };

  try {
    await manager.save({ theme: "light" });

    // 並行してsave()を実行
    const p1 = manager.save({ theme: "dark" });
    const p2 = manager.save({ hotReload: { enabled: true } });

    await Promise.all([p1, p2]);

    const state = await manager.load();
    assertEquals(state.theme, "dark");
    assertEquals(state.hotReload.enabled, true);
  } finally {
    (chrome.storage.sync as any).get = originalGet;
  }
});

Deno.test("StateManager: saveAndLoad()が保存後の状態を返す", async () => {
  mockStorage.clear();
  const manager = new StateManager();

  await manager.save({ theme: "light" });

  const result = await manager.saveAndLoad({ theme: "dark" });

  assertEquals(result.theme, "dark");
  assertEquals(result.hotReload.enabled, false); // デフォルト値が維持
});

Deno.test("StateManager: 並行saveAndLoad()で各戻り値が整合する", async () => {
  mockStorage.clear();
  const manager = new StateManager();

  const p1 = manager.saveAndLoad({ theme: "dark" });
  const p2 = manager.saveAndLoad({ hotReload: { enabled: true } });

  const [result1, result2] = await Promise.all([p1, p2]);

  // result1はtheme:"dark"の結果（この時点でhotReloadはデフォルト）
  assertEquals(result1.theme, "dark");
  assertEquals(result1.hotReload.enabled, false);

  // result2はp1の結果をベースにhotReload.enabled=trueが適用される
  assertEquals(result2.theme, "dark");
  assertEquals(result2.hotReload.enabled, true);
});

Deno.test("StateManager: save()エラー後も後続のsave()が正常に動作する", async () => {
  mockStorage.clear();
  const manager = new StateManager();

  // set()を一時的にエラーにする
  const originalSet = chrome.storage.sync.set;
  let shouldFail = true;
  (chrome.storage.sync as any).set = async (
    items: Record<string, unknown>,
  ) => {
    if (shouldFail) {
      shouldFail = false;
      throw new Error("Storage error");
    }
    await originalSet(items);
  };

  try {
    // 1回目はエラー
    await assertRejects(
      () => manager.save({ theme: "dark" }),
      Error,
      "Storage error",
    );

    // 2回目は正常に動作すべき（チェーンが壊れていない）
    await manager.save({ theme: "github" });
    const state = await manager.load();
    assertEquals(state.theme, "github");
  } finally {
    (chrome.storage.sync as any).set = originalSet;
  }
});
