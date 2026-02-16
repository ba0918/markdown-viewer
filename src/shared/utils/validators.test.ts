/**
 * バリデーションユーティリティのテスト
 */

import { assertEquals } from "@std/assert";
import {
  HOT_RELOAD_MIN_INTERVAL,
  normalizeHotReloadInterval,
  validateHotReloadInterval,
} from "./validators.ts";

Deno.test("validateHotReloadInterval", async (t) => {
  // 有効な値
  await t.step("2000ms は有効", () => {
    const result = validateHotReloadInterval(2000);
    assertEquals(result.valid, true);
    assertEquals(result.error, undefined);
  });

  await t.step("5000ms は有効", () => {
    assertEquals(validateHotReloadInterval(5000).valid, true);
  });

  await t.step("20000ms は有効", () => {
    assertEquals(validateHotReloadInterval(20000).valid, true);
  });

  // 無効な値 - NaN/ゼロ
  await t.step("NaN は無効", () => {
    const result = validateHotReloadInterval(NaN);
    assertEquals(result.valid, false);
    assertEquals(result.error, "Please enter a value of 1 or greater");
  });

  await t.step("0 は無効", () => {
    const result = validateHotReloadInterval(0);
    assertEquals(result.valid, false);
    assertEquals(result.error, "Please enter a value of 1 or greater");
  });

  // 無効な値 - 最小値未満
  await t.step("1999 は無効（最小値未満）", () => {
    const result = validateHotReloadInterval(1999);
    assertEquals(result.valid, false);
    assertEquals(
      result.error,
      `Minimum interval is ${HOT_RELOAD_MIN_INTERVAL}ms (2 seconds)`,
    );
  });

  await t.step("1 は無効（最小値未満）", () => {
    assertEquals(validateHotReloadInterval(1).valid, false);
  });

  await t.step("-1 は無効（負数）", () => {
    assertEquals(validateHotReloadInterval(-1).valid, false);
  });
});

Deno.test("normalizeHotReloadInterval", async (t) => {
  await t.step("2000ms はそのまま2000ms", () => {
    assertEquals(normalizeHotReloadInterval(2000), 2000);
  });

  await t.step("5000ms はそのまま5000ms", () => {
    assertEquals(normalizeHotReloadInterval(5000), 5000);
  });

  await t.step("1000ms は2000msに正規化", () => {
    assertEquals(normalizeHotReloadInterval(1000), 2000);
  });

  await t.step("0 は2000msに正規化", () => {
    assertEquals(normalizeHotReloadInterval(0), 2000);
  });

  await t.step("-1 は2000msに正規化", () => {
    assertEquals(normalizeHotReloadInterval(-1), 2000);
  });

  await t.step("1999 は2000msに正規化", () => {
    assertEquals(normalizeHotReloadInterval(1999), 2000);
  });
});
