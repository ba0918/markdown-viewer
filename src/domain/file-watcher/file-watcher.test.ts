/**
 * @file file-watcher.test.ts
 * @description File Watcher Domain層のテスト
 *
 * ドキュメントの最終更新時刻を監視し、変更を検知する純粋関数のテスト。
 * Chrome API非依存、document.lastModified のみ使用。
 */

import { assertEquals } from "@std/assert";
import { getLastModified, hasFileChanged } from "./file-watcher.ts";

// document オブジェクトのモック設定（Deno環境用）
// Content Script環境では実際のdocumentオブジェクトが使われる
const mockDocument = {
  lastModified: "Thu Feb 08 2026 04:00:00 GMT+0900 (JST)",
};

// グローバルにdocumentを設定（型エラー回避のため any 使用）
// deno-lint-ignore no-explicit-any
(globalThis as any).document = mockDocument;

Deno.test("file-watcher: getLastModified - 現在のドキュメント最終更新時刻を取得", () => {
  // document.lastModified は "MM/DD/YYYY HH:MM:SS" 形式の文字列を返す
  const lastModified = getLastModified();

  // モックで設定した値が取得できることを確認
  assertEquals(lastModified, "Thu Feb 08 2026 04:00:00 GMT+0900 (JST)");
});

Deno.test("file-watcher: getLastModified - 複数回呼び出しても同じ値を返す（純粋関数）", () => {
  const first = getLastModified();
  const second = getLastModified();

  // 同一タイミングで呼び出せば同じ値を返す
  assertEquals(first, second);
});

Deno.test("file-watcher: hasFileChanged - 変更なし（同じ時刻）", () => {
  const timestamp = "Thu Feb 08 2026 04:00:00 GMT+0900 (JST)";
  const result = hasFileChanged(timestamp, timestamp);

  assertEquals(
    result,
    false,
    "Should return false when timestamps are identical",
  );
});

Deno.test("file-watcher: hasFileChanged - 変更あり（異なる時刻）", () => {
  const oldTimestamp = "Thu Feb 08 2026 04:00:00 GMT+0900 (JST)";
  const newTimestamp = "Thu Feb 08 2026 04:01:00 GMT+0900 (JST)";
  const result = hasFileChanged(oldTimestamp, newTimestamp);

  assertEquals(result, true, "Should return true when timestamps differ");
});

Deno.test("file-watcher: hasFileChanged - 旧タイムスタンプが未定義（初回チェック）", () => {
  const newTimestamp = "Thu Feb 08 2026 04:00:00 GMT+0900 (JST)";
  const result = hasFileChanged(undefined, newTimestamp);

  // 初回チェック時は「変更なし」として扱う（リロード不要）
  assertEquals(
    result,
    false,
    "Should return false on first check (no previous timestamp)",
  );
});

Deno.test("file-watcher: hasFileChanged - 新タイムスタンプが空文字列", () => {
  const oldTimestamp = "Thu Feb 08 2026 04:00:00 GMT+0900 (JST)";
  const result = hasFileChanged(oldTimestamp, "");

  // 新タイムスタンプが空の場合は「変更なし」として扱う（エラー回避）
  assertEquals(
    result,
    false,
    "Should return false when new timestamp is empty",
  );
});

Deno.test("file-watcher: hasFileChanged - 両方とも空文字列", () => {
  const result = hasFileChanged("", "");

  assertEquals(
    result,
    false,
    "Should return false when both timestamps are empty",
  );
});

Deno.test("file-watcher: hasFileChanged - 新しいタイムスタンプが古い（時間が巻き戻った）", () => {
  const oldTimestamp = "Thu Feb 08 2026 04:01:00 GMT+0900 (JST)";
  const newTimestamp = "Thu Feb 08 2026 04:00:00 GMT+0900 (JST)";
  const result = hasFileChanged(oldTimestamp, newTimestamp);

  // 時間が巻き戻った場合も「変更あり」として扱う（システム時計調整対応）
  assertEquals(
    result,
    true,
    "Should return true even when new timestamp is older",
  );
});
