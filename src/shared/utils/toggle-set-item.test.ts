/**
 * toggleSetItem 汎用ユーティリティのテスト
 */

import { assertEquals } from "@std/assert";
import { toggleSetItem } from "./toggle-set-item.ts";

Deno.test("toggleSetItem", async (t) => {
  // 追加
  await t.step("空リストに項目を追加", () => {
    assertEquals(toggleSetItem([], "h1"), ["h1"]);
  });

  await t.step("既存リストに新しい項目を追加", () => {
    assertEquals(toggleSetItem(["h1"], "h2"), ["h1", "h2"]);
  });

  // 削除
  await t.step("存在する項目を削除", () => {
    assertEquals(toggleSetItem(["h1", "h2"], "h1"), ["h2"]);
  });

  await t.step("最後の項目を削除すると空リスト", () => {
    assertEquals(toggleSetItem(["h1"], "h1"), []);
  });

  // トグル動作
  await t.step("同じIDを2回トグルすると元に戻る", () => {
    const first = toggleSetItem([], "h1");
    assertEquals(first, ["h1"]);
    const second = toggleSetItem(first, "h1");
    assertEquals(second, []);
  });

  // エッジケース
  await t.step("重複を含むリストでも正常動作（Setで重複排除）", () => {
    const result = toggleSetItem(["h1", "h1"], "h1");
    assertEquals(result, []);
  });

  await t.step("空文字列IDでも動作", () => {
    assertEquals(toggleSetItem([], ""), [""]);
    assertEquals(toggleSetItem([""], ""), []);
  });

  await t.step("複数項目の順序が保持される", () => {
    const result = toggleSetItem(["a", "b", "c"], "d");
    assertEquals(result, ["a", "b", "c", "d"]);
  });
});
