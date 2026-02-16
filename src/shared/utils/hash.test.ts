import { assert, assertEquals } from "@std/assert";
import { computeSHA256 } from "./hash.ts";

Deno.test("computeSHA256", async (t) => {
  await t.step("空文字列のSHA-256ハッシュを計算", async () => {
    const hash = await computeSHA256("");
    // SHA-256 of empty string is well-known
    assertEquals(
      hash,
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
  });

  await t.step("ASCII文字列のハッシュを計算", async () => {
    const hash = await computeSHA256("Hello, World!");
    // Known SHA-256 of "Hello, World!"
    assertEquals(
      hash,
      "dffd6021bb2bd5b0af676290809ec3a53191dd81c7f70a4b28688a362182986f",
    );
  });

  await t.step("同じ入力で同じハッシュを返す（決定性）", async () => {
    const hash1 = await computeSHA256("test content");
    const hash2 = await computeSHA256("test content");
    assertEquals(hash1, hash2);
  });

  await t.step("異なる入力で異なるハッシュを返す", async () => {
    const hash1 = await computeSHA256("content A");
    const hash2 = await computeSHA256("content B");
    assert(hash1 !== hash2);
  });

  await t.step("ハッシュ値は64文字の16進数文字列", async () => {
    const hash = await computeSHA256("any content");
    assertEquals(hash.length, 64);
    assert(/^[0-9a-f]{64}$/.test(hash));
  });

  await t.step("マルチバイト文字（日本語）のハッシュを計算", async () => {
    const hash = await computeSHA256("日本語テスト");
    assertEquals(hash.length, 64);
    assert(/^[0-9a-f]{64}$/.test(hash));
  });

  await t.step("大きな文字列でもハッシュを計算（100KB）", async () => {
    const largeContent = "x".repeat(100_000);
    const hash = await computeSHA256(largeContent);
    assertEquals(hash.length, 64);
  });
});
