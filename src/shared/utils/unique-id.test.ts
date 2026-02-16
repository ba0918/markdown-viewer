/**
 * 重複ID生成ユーティリティのテスト
 */

import { assertEquals } from "@std/assert";
import { makeUniqueId } from "./unique-id.ts";

Deno.test("makeUniqueId", async (t) => {
  await t.step("初出のIDはそのまま返す", () => {
    const idCounts = new Map<string, number>();
    const result = makeUniqueId("hello", idCounts);
    assertEquals(result, "hello");
  });

  await t.step("2回目のIDには '-1' を付与", () => {
    const idCounts = new Map<string, number>();
    makeUniqueId("hello", idCounts);
    const result = makeUniqueId("hello", idCounts);
    assertEquals(result, "hello-1");
  });

  await t.step("3回目のIDには '-2' を付与", () => {
    const idCounts = new Map<string, number>();
    makeUniqueId("hello", idCounts);
    makeUniqueId("hello", idCounts);
    const result = makeUniqueId("hello", idCounts);
    assertEquals(result, "hello-2");
  });

  await t.step("GitHub風の連番ルール（ステータスの例）", () => {
    const idCounts = new Map<string, number>();

    assertEquals(makeUniqueId("ステータス", idCounts), "ステータス");
    assertEquals(makeUniqueId("ステータス", idCounts), "ステータス-1");
    assertEquals(makeUniqueId("ステータス", idCounts), "ステータス-2");
    assertEquals(makeUniqueId("ステータス", idCounts), "ステータス-3");
  });

  await t.step("異なるIDは独立してカウント", () => {
    const idCounts = new Map<string, number>();

    assertEquals(makeUniqueId("alpha", idCounts), "alpha");
    assertEquals(makeUniqueId("beta", idCounts), "beta");
    assertEquals(makeUniqueId("alpha", idCounts), "alpha-1");
    assertEquals(makeUniqueId("beta", idCounts), "beta-1");
    assertEquals(makeUniqueId("alpha", idCounts), "alpha-2");
  });

  await t.step("idCountsのMapが正しく更新される（副作用）", () => {
    const idCounts = new Map<string, number>();

    makeUniqueId("test", idCounts);
    assertEquals(idCounts.get("test"), 1);

    makeUniqueId("test", idCounts);
    assertEquals(idCounts.get("test"), 2);

    makeUniqueId("test", idCounts);
    assertEquals(idCounts.get("test"), 3);
  });

  await t.step("空文字列のIDも処理できる", () => {
    const idCounts = new Map<string, number>();

    assertEquals(makeUniqueId("", idCounts), "");
    assertEquals(makeUniqueId("", idCounts), "-1");
  });

  await t.step("ハイフンを含むIDも正しく処理", () => {
    const idCounts = new Map<string, number>();

    assertEquals(makeUniqueId("my-id", idCounts), "my-id");
    assertEquals(makeUniqueId("my-id", idCounts), "my-id-1");
  });

  await t.step("数字を含むIDも正しく処理", () => {
    const idCounts = new Map<string, number>();

    assertEquals(makeUniqueId("section-1", idCounts), "section-1");
    assertEquals(makeUniqueId("section-1", idCounts), "section-1-1");
  });
});
