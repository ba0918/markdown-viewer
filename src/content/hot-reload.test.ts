// deno-lint-ignore-file no-explicit-any
/**
 * hot-reload.ts ユニットテスト
 *
 * startHotReload() は初回ハッシュ取得でawaitを挟むため、並行呼び出しや
 * 待機中のstopHotReload()でタイマーが取り残される競合が起きうる。
 * ここではタイマーの生成/解除を差し替えて、常に高々1本だけが
 * 生き残ることを検証する。
 */

import { assertEquals } from "@std/assert";

// --- グローバルのモック（モジュールimportより先に設定する必要がある） ---

const originalSetInterval = globalThis.setInterval;
const originalClearInterval = globalThis.clearInterval;

/** 生成されたタイマーIDと解除されたタイマーIDを追跡する */
const createdTimers: number[] = [];
const clearedTimers: number[] = [];
let nextTimerId = 1;

(globalThis as any).setInterval = (): number => {
  const id = nextTimerId++;
  createdTimers.push(id);
  return id;
};
(globalThis as any).clearInterval = (id: number): void => {
  clearedTimers.push(id);
};

(globalThis as any).location = {
  href: "http://localhost:8000/doc.md",
  reload: () => {},
};
(globalThis as any).DEBUG = false;

/** sendMessage の応答を制御するための解決待ちキュー */
let pendingResolvers: ((hash: string) => void)[] = [];

(globalThis as any).chrome = {
  runtime: {
    sendMessage: () =>
      new Promise((resolve) => {
        pendingResolvers.push((hash: string) =>
          resolve({ success: true, data: hash })
        );
      }),
  },
};

const { startHotReload, stopHotReload } = await import("./hot-reload.ts");

/** テスト間で状態をリセットする */
const reset = () => {
  stopHotReload();
  createdTimers.length = 0;
  clearedTimers.length = 0;
  pendingResolvers = [];
};

/** 生きているタイマー（生成済みかつ未解除）のID一覧 */
const liveTimers = (): number[] =>
  createdTimers.filter((id) => !clearedTimers.includes(id));

Deno.test("startHotReload: 単発呼び出しでタイマーが1本だけ動く", async () => {
  reset();

  const started = startHotReload(2000);
  pendingResolvers.shift()?.("hash-1");
  await started;

  assertEquals(liveTimers().length, 1);

  reset();
});

Deno.test("startHotReload: 並行呼び出しでもタイマーは1本しか残らない", async () => {
  reset();

  // 3回連続で呼び出す（設定スライダー操作でstorage.onChangedが連続発火する状況）
  const a = startHotReload(2000);
  const b = startHotReload(3000);
  const c = startHotReload(4000);

  // 3件のsendMessageが待機中。順に解決する
  assertEquals(pendingResolvers.length, 3);
  pendingResolvers.shift()?.("hash-a");
  pendingResolvers.shift()?.("hash-b");
  pendingResolvers.shift()?.("hash-c");
  await Promise.all([a, b, c]);

  // 最後の呼び出しの1本だけが生きている
  assertEquals(liveTimers().length, 1);

  reset();
});

Deno.test("startHotReload: 待機中にstopHotReloadされたらタイマーを作らない", async () => {
  reset();

  const started = startHotReload(2000);
  // 初回ハッシュ取得の待機中に停止
  stopHotReload();
  pendingResolvers.shift()?.("hash-1");
  await started;

  assertEquals(liveTimers().length, 0);

  reset();
});

Deno.test("stopHotReload: 実行中のタイマーを解除する", async () => {
  reset();

  const started = startHotReload(2000);
  pendingResolvers.shift()?.("hash-1");
  await started;
  assertEquals(liveTimers().length, 1);

  stopHotReload();
  assertEquals(liveTimers().length, 0);

  reset();
});

Deno.test("startHotReload: リモートURLでは起動しない", async () => {
  reset();
  (globalThis as any).location.href = "https://example.com/doc.md";

  await startHotReload(2000);

  assertEquals(createdTimers.length, 0);
  assertEquals(pendingResolvers.length, 0);

  (globalThis as any).location.href = "http://localhost:8000/doc.md";
  reset();
});

Deno.test("startHotReload: WSL2ファイルでは起動しない", async () => {
  reset();
  (globalThis as any).location.href =
    "file://wsl.localhost/Ubuntu/home/user/doc.md";

  await startHotReload(2000);

  assertEquals(createdTimers.length, 0);
  assertEquals(pendingResolvers.length, 0);

  (globalThis as any).location.href = "http://localhost:8000/doc.md";
  reset();

  // グローバルを元に戻す
  globalThis.setInterval = originalSetInterval;
  globalThis.clearInterval = originalClearInterval;
});
