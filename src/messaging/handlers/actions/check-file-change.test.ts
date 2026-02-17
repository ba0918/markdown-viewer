// deno-lint-ignore-file no-explicit-any
/**
 * check-file-change アクション単体テスト
 */

import { assertEquals } from "@std/assert";
import { createCheckFileChangeAction } from "./check-file-change.ts";

(globalThis as any).DEBUG = false;

const action = createCheckFileChangeAction();

Deno.test("check-file-change: URLが空文字の場合エラー", async () => {
  const result = await action({ url: "" });
  assertEquals(result.success, false);
  if (!result.success) {
    assertEquals(result.error.includes("non-empty string"), true);
  }
});

Deno.test("check-file-change: URLが数値の場合エラー", async () => {
  const result = await action({ url: 12345 });
  assertEquals(result.success, false);
});

Deno.test("check-file-change: リモートURLはSSRF防止でエラー", async () => {
  const result = await action({ url: "https://evil.example.com/secret" });
  assertEquals(result.success, false);
  if (!result.success) {
    assertEquals(result.error.includes("only local URLs"), true);
  }
});

Deno.test("check-file-change: WSL2ファイルパスはエラー", async () => {
  const result = await action({
    url: "file://wsl.localhost/Ubuntu/home/user/file.md",
  });
  assertEquals(result.success, false);
  if (!result.success) {
    assertEquals(result.error.includes("WSL2"), true);
  }
});

Deno.test("check-file-change: payloadがundefinedの場合エラー", async () => {
  const result = await action(undefined);
  assertEquals(result.success, false);
});

Deno.test("check-file-change: URLがスペースのみの場合エラー", async () => {
  const result = await action({ url: "   " });
  assertEquals(result.success, false);
});

/**
 * file:// URLでのURL API正常動作テスト
 * fetchとcomputeSHA256のモックを使用して成功パターンを検証
 */

Deno.test("check-file-change: file:// URLでpreventCacheパラメータが付与される", async () => {
  let fetchedUrl = "";
  const originalFetch = globalThis.fetch;

  // fetchモック: 呼ばれたURLを記録して成功レスポンスを返す
  globalThis.fetch = (input: string | URL | Request) => {
    fetchedUrl = typeof input === "string" ? input : input.toString();
    return Promise.resolve(new Response("test content", { status: 200 }));
  };

  const testAction = createCheckFileChangeAction();
  const result = await testAction({ url: "file:///home/user/file.md" });

  // 成功すること
  assertEquals(result.success, true);

  // fetchに渡されたURLにpreventCacheパラメータが含まれること
  assertEquals(fetchedUrl.includes("preventCache="), true);

  // 元のURLベースが維持されていること
  assertEquals(fetchedUrl.startsWith("file:///home/user/file.md"), true);

  // クリーンアップ
  globalThis.fetch = originalFetch;
});

Deno.test("check-file-change: file:// URL (Windows形式)でも正常動作", async () => {
  let fetchedUrl = "";
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (input: string | URL | Request) => {
    fetchedUrl = typeof input === "string" ? input : input.toString();
    return Promise.resolve(new Response("windows content", { status: 200 }));
  };

  const testAction = createCheckFileChangeAction();
  const result = await testAction({ url: "file:///C:/Users/user/file.md" });

  assertEquals(result.success, true);
  assertEquals(fetchedUrl.includes("preventCache="), true);
  assertEquals(fetchedUrl.startsWith("file:///C:/Users/user/file.md"), true);

  globalThis.fetch = originalFetch;
});

Deno.test("check-file-change: localhost URLでも正常にハッシュを返す", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = () => {
    return Promise.resolve(new Response("localhost content", { status: 200 }));
  };

  const testAction = createCheckFileChangeAction();
  const result = await testAction({ url: "http://localhost:8080/file.md" });

  assertEquals(result.success, true);
  // dataフィールドがハッシュ文字列(64文字hex)であること
  if (result.success) {
    assertEquals(typeof result.data, "string");
    assertEquals((result.data as string).length, 64);
    assertEquals(/^[0-9a-f]{64}$/.test(result.data as string), true);
  }

  globalThis.fetch = originalFetch;
});

Deno.test("check-file-change: 既存クエリパラメータがあるURLでもpreventCacheが追加される", async () => {
  let fetchedUrl = "";
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (input: string | URL | Request) => {
    fetchedUrl = typeof input === "string" ? input : input.toString();
    return Promise.resolve(new Response("content", { status: 200 }));
  };

  const testAction = createCheckFileChangeAction();
  const result = await testAction({
    url: "http://localhost:8080/file.md?version=1",
  });

  assertEquals(result.success, true);
  // 既存のクエリパラメータが維持されていること
  assertEquals(fetchedUrl.includes("version=1"), true);
  // preventCacheも追加されていること
  assertEquals(fetchedUrl.includes("preventCache="), true);

  globalThis.fetch = originalFetch;
});

Deno.test("check-file-change: fetchがHTTPエラーを返す場合", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = () => {
    return Promise.resolve(
      new Response("Not Found", { status: 404, statusText: "Not Found" }),
    );
  };

  const testAction = createCheckFileChangeAction();
  const result = await testAction({ url: "file:///nonexistent/file.md" });

  assertEquals(result.success, false);
  if (!result.success) {
    assertEquals(result.error.includes("HTTP 404"), true);
  }

  globalThis.fetch = originalFetch;
});
