import { assertEquals, assertRejects } from "@std/assert";
import { sendMessage } from "./client.ts";

// Chrome API モック（deno-lint-ignore で型エラー回避）
const setupChromeMock = (
  sendMessageFn: (message: unknown) => Promise<unknown>,
) => {
  // deno-lint-ignore no-explicit-any
  (globalThis as any).chrome = {
    runtime: {
      sendMessage: sendMessageFn,
    },
  };
};

Deno.test("sendMessage: 正常レスポンスを返す", async () => {
  setupChromeMock(() =>
    Promise.resolve({ success: true, data: { theme: "light" } })
  );

  const result = await sendMessage<{ theme: string }>({
    type: "GET_SETTINGS",
    payload: {},
  });

  assertEquals(result, { theme: "light" });
});

Deno.test("sendMessage: Background Script未起動時にエラーをスロー", async () => {
  setupChromeMock(() => Promise.resolve(undefined));

  await assertRejects(
    () =>
      sendMessage({
        type: "GET_SETTINGS",
        payload: {},
      }),
    Error,
    "No response from background script",
  );
});

Deno.test("sendMessage: レスポンスがエラーの場合にエラーをスロー", async () => {
  setupChromeMock(() =>
    Promise.resolve({ success: false, error: "Something went wrong" })
  );

  await assertRejects(
    () =>
      sendMessage({
        type: "GET_SETTINGS",
        payload: {},
      }),
    Error,
    "Something went wrong",
  );
});
