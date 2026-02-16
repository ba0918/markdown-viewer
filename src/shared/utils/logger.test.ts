import { assertEquals } from "@std/assert";
import { logger } from "./logger.ts";

// ヘルパー: console.logをモックして呼び出し記録を返す
const mockConsoleLog = (): { calls: unknown[][]; restore: () => void } => {
  const calls: unknown[][] = [];
  const original = console.log;
  console.log = (...args: unknown[]) => {
    calls.push(args);
  };
  return { calls, restore: () => (console.log = original) };
};

// ヘルパー: console.warnをモックして呼び出し記録を返す
const mockConsoleWarn = (): { calls: unknown[][]; restore: () => void } => {
  const calls: unknown[][] = [];
  const original = console.warn;
  console.warn = (...args: unknown[]) => {
    calls.push(args);
  };
  return { calls, restore: () => (console.warn = original) };
};

// ヘルパー: グローバルDEBUGフラグを設定
const setDebug = (value: boolean): void => {
  (globalThis as Record<string, unknown>).DEBUG = value;
};

// === DEBUG=true のテスト ===

Deno.test("logger.log: DEBUG=trueの時にconsole.logを呼び出す", () => {
  setDebug(true);
  const mock = mockConsoleLog();
  try {
    logger.log("test message");
    assertEquals(mock.calls.length, 1);
  } finally {
    mock.restore();
    setDebug(false);
  }
});

Deno.test("logger.warn: DEBUG=trueの時にconsole.warnを呼び出す", () => {
  setDebug(true);
  const mock = mockConsoleWarn();
  try {
    logger.warn("test warning");
    assertEquals(mock.calls.length, 1);
  } finally {
    mock.restore();
    setDebug(false);
  }
});

// === DEBUG=false のテスト ===

Deno.test("logger.log: DEBUG=falseの時にconsole.logを呼び出さない", () => {
  setDebug(false);
  const mock = mockConsoleLog();
  try {
    logger.log("should not appear");
    assertEquals(mock.calls.length, 0);
  } finally {
    mock.restore();
  }
});

Deno.test("logger.warn: DEBUG=falseの時にconsole.warnを呼び出さない", () => {
  setDebug(false);
  const mock = mockConsoleWarn();
  try {
    logger.warn("should not appear");
    assertEquals(mock.calls.length, 0);
  } finally {
    mock.restore();
  }
});

// === プレフィックス ===

Deno.test("logger.log: プレフィックス [Markdown Viewer] が付与される", () => {
  setDebug(true);
  const mock = mockConsoleLog();
  try {
    logger.log("hello");
    assertEquals(mock.calls[0][0], "[Markdown Viewer]");
    assertEquals(mock.calls[0][1], "hello");
  } finally {
    mock.restore();
    setDebug(false);
  }
});

Deno.test("logger.warn: プレフィックス [Markdown Viewer] が付与される", () => {
  setDebug(true);
  const mock = mockConsoleWarn();
  try {
    logger.warn("caution");
    assertEquals(mock.calls[0][0], "[Markdown Viewer]");
    assertEquals(mock.calls[0][1], "caution");
  } finally {
    mock.restore();
    setDebug(false);
  }
});

// === 複数引数 ===

Deno.test("logger.log: 複数引数が正しく渡される", () => {
  setDebug(true);
  const mock = mockConsoleLog();
  try {
    logger.log("Theme loaded:", "dark", { extra: true });
    assertEquals(mock.calls[0], [
      "[Markdown Viewer]",
      "Theme loaded:",
      "dark",
      { extra: true },
    ]);
  } finally {
    mock.restore();
    setDebug(false);
  }
});

Deno.test("logger.warn: 複数引数が正しく渡される", () => {
  setDebug(true);
  const mock = mockConsoleWarn();
  try {
    logger.warn("Fetch failed:", "timeout", 3000);
    assertEquals(mock.calls[0], [
      "[Markdown Viewer]",
      "Fetch failed:",
      "timeout",
      3000,
    ]);
  } finally {
    mock.restore();
    setDebug(false);
  }
});
