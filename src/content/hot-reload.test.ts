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

/** setIntervalに渡されたコールバック（手動で発火させて中身を検証する） */
let intervalCallback: (() => Promise<void>) | null = null;

(globalThis as any).setInterval = (fn: () => Promise<void>): number => {
  const id = nextTimerId++;
  createdTimers.push(id);
  intervalCallback = fn;
  return id;
};
(globalThis as any).clearInterval = (id: number): void => {
  clearedTimers.push(id);
};

/** location.reload() の呼び出し回数 */
let reloadCount = 0;

(globalThis as any).location = {
  href: "http://localhost:8000/doc.md",
  reload: () => {
    reloadCount++;
  },
};
(globalThis as any).DEBUG = false;

/** sendMessage の応答を制御するための待機キュー */
interface PendingCall {
  resolve: (hash: string) => void;
  reject: (error: Error) => void;
}
let pendingResolvers: PendingCall[] = [];

(globalThis as any).chrome = {
  runtime: {
    sendMessage: () =>
      new Promise((resolve, reject) => {
        pendingResolvers.push({
          resolve: (hash: string) => resolve({ success: true, data: hash }),
          reject,
        });
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
  intervalCallback = null;
  reloadCount = 0;
};

/** startHotReloadを起動し、初回ハッシュを解決して完了まで待つ */
const startWithHash = async (hash: string, interval = 2000): Promise<void> => {
  const started = startHotReload(interval);
  pendingResolvers.shift()?.resolve(hash);
  await started;
};

/** 直近のインターバルコールバックを1回発火し、指定ハッシュで応答する */
const tickWithHash = async (hash: string): Promise<void> => {
  const tick = intervalCallback!();
  pendingResolvers.shift()?.resolve(hash);
  await tick;
};

/** 生きているタイマー（生成済みかつ未解除）のID一覧 */
const liveTimers = (): number[] =>
  createdTimers.filter((id) => !clearedTimers.includes(id));

Deno.test("startHotReload: 単発呼び出しでタイマーが1本だけ動く", async () => {
  reset();

  const started = startHotReload(2000);
  pendingResolvers.shift()?.resolve("hash-1");
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
  pendingResolvers.shift()?.resolve("hash-a");
  pendingResolvers.shift()?.resolve("hash-b");
  pendingResolvers.shift()?.resolve("hash-c");
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
  pendingResolvers.shift()?.resolve("hash-1");
  await started;

  assertEquals(liveTimers().length, 0);

  reset();
});

Deno.test("stopHotReload: 実行中のタイマーを解除する", async () => {
  reset();

  const started = startHotReload(2000);
  pendingResolvers.shift()?.resolve("hash-1");
  await started;
  assertEquals(liveTimers().length, 1);

  stopHotReload();
  assertEquals(liveTimers().length, 0);

  reset();
});

/**
 * インターバルコールバックの挙動
 *
 * タイマーをスタブしているだけでは、変更検知・エラー処理・世代ガードが
 * 一切実行されない。コールバックを手動発火して中身を検証する。
 */

Deno.test("インターバル: ハッシュが同じならリロードしない", async () => {
  reset();
  await startWithHash("hash-1");

  await tickWithHash("hash-1");

  assertEquals(reloadCount, 0);
  assertEquals(liveTimers().length, 1);

  reset();
});

Deno.test("インターバル: ハッシュが変わったらリロードして停止する", async () => {
  reset();
  await startWithHash("hash-1");

  await tickWithHash("hash-2");

  assertEquals(reloadCount, 1);
  // リロード前にタイマーを解除している
  assertEquals(liveTimers().length, 0);

  reset();
});

Deno.test("インターバル: fetch失敗時は停止する（リロードしない）", async () => {
  reset();
  await startWithHash("hash-1");

  const tick = intervalCallback!();
  pendingResolvers.shift()?.reject(new Error("fetch failed"));
  await tick;

  assertEquals(reloadCount, 0);
  assertEquals(liveTimers().length, 0);

  reset();
});

Deno.test("インターバル: 応答待ちの間に停止されたらリロードしない", async () => {
  reset();
  await startWithHash("hash-1");

  // コールバック発火 → 応答が返る前に停止 → 変更ありの応答が届く
  const tick = intervalCallback!();
  stopHotReload();
  pendingResolvers.shift()?.resolve("hash-2");
  await tick;

  // 世代ガードにより、停止済みの実行結果は破棄される
  assertEquals(reloadCount, 0);
  assertEquals(liveTimers().length, 0);

  reset();
});

Deno.test("インターバル: 応答待ちの間に再起動されたら古い実行結果は破棄される", async () => {
  reset();
  await startWithHash("hash-1");

  // 古いコールバックを発火 → 応答前に再起動 → 変更ありの応答が届く
  const staleTick = intervalCallback!();
  const restarted = startHotReload(2000);
  pendingResolvers.shift()?.resolve("hash-2"); // 古いtickへの応答
  pendingResolvers.shift()?.resolve("hash-3"); // 再起動の初回ハッシュ
  await Promise.all([staleTick, restarted]);

  assertEquals(reloadCount, 0);
  assertEquals(liveTimers().length, 1);

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
