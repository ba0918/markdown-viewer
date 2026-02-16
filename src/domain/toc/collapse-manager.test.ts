/**
 * ToC折りたたみ状態管理のテスト
 */

import { assertEquals } from "@std/assert";
import { toggleCollapsedItem } from "./collapse-manager.ts";

Deno.test("toggleCollapsedItem", async (t) => {
  // 追加
  await t.step("空リストに項目を追加", () => {
    assertEquals(toggleCollapsedItem([], "h1"), ["h1"]);
  });

  await t.step("既存リストに新しい項目を追加", () => {
    assertEquals(toggleCollapsedItem(["h1"], "h2"), ["h1", "h2"]);
  });

  // 削除
  await t.step("存在する項目を削除", () => {
    assertEquals(toggleCollapsedItem(["h1", "h2"], "h1"), ["h2"]);
  });

  await t.step("最後の項目を削除すると空リスト", () => {
    assertEquals(toggleCollapsedItem(["h1"], "h1"), []);
  });

  // トグル動作
  await t.step("同じIDを2回トグルすると元に戻る", () => {
    const first = toggleCollapsedItem([], "h1");
    assertEquals(first, ["h1"]);
    const second = toggleCollapsedItem(first, "h1");
    assertEquals(second, []);
  });

  // エッジケース
  await t.step("重複を含むリストでも正常動作（Setで重複排除）", () => {
    const result = toggleCollapsedItem(["h1", "h1"], "h1");
    assertEquals(result, []);
  });

  await t.step("空文字列IDでも動作", () => {
    assertEquals(toggleCollapsedItem([], ""), [""]);
    assertEquals(toggleCollapsedItem([""], ""), []);
  });

  await t.step("複数項目の順序が保持される", () => {
    const result = toggleCollapsedItem(["a", "b", "c"], "d");
    assertEquals(result, ["a", "b", "c", "d"]);
  });
});
