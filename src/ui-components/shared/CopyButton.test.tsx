/**
 * CopyButton コンポーネントのテスト
 *
 * テスト対象:
 * - クリップボードへのコピー機能
 * - コピー成功時のUI変化（✓アイコン表示）
 * - タイムアウト後の元の状態への復帰
 */

import { assertEquals } from "@std/assert";
import { render as preactRender } from "preact";
import { parseHTML } from "linkedom";
import { CopyButton } from "./CopyButton.tsx";

// DOM環境のセットアップ
const { document, window } = parseHTML(
  "<!DOCTYPE html><html><body></body></html>",
);

// グローバルにdocumentとwindowを設定
// @ts-ignore: linkedom types not available in Deno
globalThis.document = document;
// @ts-ignore: linkedom types not available in Deno
globalThis.window = window;
// @ts-ignore: linkedom types not available in Deno
globalThis.Element = window.Element;
// @ts-ignore: linkedom types not available in Deno
globalThis.Event = window.Event;

// navigator.clipboard.writeText のモック
let clipboardWriteTextCalls: string[] = [];

function setupClipboardMock() {
  clipboardWriteTextCalls = [];
  // @ts-ignore: navigator.clipboard mock for testing
  globalThis.navigator = {
    // @ts-ignore: minimal clipboard mock
    clipboard: {
      writeText: (text: string) => {
        clipboardWriteTextCalls.push(text);
        return Promise.resolve();
      },
    },
  };
}

function cleanupGlobals() {
  // @ts-ignore: cleanup test mock
  delete globalThis.navigator;
  clipboardWriteTextCalls = [];
}

/**
 * Preactコンポーネントをテスト用にレンダリング
 */
function render(component: preact.VNode) {
  const container = document.createElement("div");
  preactRender(component, container);
  return { container };
}

Deno.test("CopyButton: should render copy button", () => {
  setupClipboardMock();

  const { container } = render(<CopyButton text="Hello, World!" />);
  const button = container.querySelector("button");

  assertEquals(button !== null, true);
  assertEquals(button?.getAttribute("aria-label"), "Copy to clipboard");
  assertEquals(button?.getAttribute("title"), "Copy to clipboard");

  cleanupGlobals();
});

Deno.test({
  name: "CopyButton: should copy text to clipboard on click",
  sanitizeResources: false, // タイマーリークを許容（2秒タイマーが残る）
  sanitizeOps: false, // 非同期オペレーションのリークを許容
  async fn() {
    setupClipboardMock();

    const testText = "Test content to copy";
    const { container } = render(<CopyButton text={testText} />);
    const button = container.querySelector("button");

    // ボタンクリック
    button?.click();

    // 少し待機（非同期処理のため）
    await new Promise((resolve) => setTimeout(resolve, 10));

    // clipboard.writeText が呼ばれたことを確認
    assertEquals(clipboardWriteTextCalls.length, 1);
    assertEquals(clipboardWriteTextCalls[0], testText);

    cleanupGlobals();
  },
});

Deno.test({
  name: "CopyButton: should show check icon after successful copy",
  sanitizeResources: false, // タイマーリークを許容（2秒タイマーが残る）
  sanitizeOps: false, // 非同期オペレーションのリークを許容
  async fn() {
    setupClipboardMock();

    const { container } = render(<CopyButton text="Test" />);
    const button = container.querySelector("button");

    // コピー前はコピーアイコン（2つのpathを持つ）
    let svgPaths = container.querySelectorAll("svg path");
    assertEquals(svgPaths.length, 2);

    // ボタンクリック
    button?.click();

    // 少し待機（state更新のため）
    await new Promise((resolve) => setTimeout(resolve, 50));

    // コピー後はチェックアイコン（1つのpathを持つ）
    svgPaths = container.querySelectorAll("svg path");
    assertEquals(svgPaths.length, 1);

    // aria-labelとtitleが変更されている
    assertEquals(button?.getAttribute("aria-label"), "Copied!");
    assertEquals(button?.getAttribute("title"), "Copied!");

    cleanupGlobals();
  },
});

Deno.test({
  name: "CopyButton: should revert to copy icon after 2 seconds",
  sanitizeResources: false, // タイマーリークを許容
  sanitizeOps: false, // 非同期オペレーションのリークを許容
  async fn() {
    setupClipboardMock();

    const { container } = render(<CopyButton text="Test" />);
    const button = container.querySelector("button");

    // ボタンクリック
    button?.click();
    await new Promise((resolve) => setTimeout(resolve, 50));

    // コピー直後はチェックアイコン
    let svgPaths = container.querySelectorAll("svg path");
    assertEquals(svgPaths.length, 1);

    // 2秒待機
    await new Promise((resolve) => setTimeout(resolve, 2100));

    // 元のコピーアイコンに戻る
    svgPaths = container.querySelectorAll("svg path");
    assertEquals(svgPaths.length, 2);

    // aria-labelとtitleも元に戻る
    assertEquals(button?.getAttribute("aria-label"), "Copy to clipboard");
    assertEquals(button?.getAttribute("title"), "Copy to clipboard");

    cleanupGlobals();
  },
});

Deno.test("CopyButton: should accept custom className", () => {
  setupClipboardMock();

  const { container } = render(
    <CopyButton text="Test" className="custom-copy-btn" />,
  );
  const button = container.querySelector("button");

  assertEquals(button?.className, "custom-copy-btn");

  cleanupGlobals();
});

Deno.test("CopyButton: should accept custom aria-label and title", () => {
  setupClipboardMock();

  const { container } = render(
    <CopyButton
      text="Test"
      ariaLabel="カスタムラベル"
      title="カスタムタイトル"
    />,
  );
  const button = container.querySelector("button");

  assertEquals(button?.getAttribute("aria-label"), "カスタムラベル");
  assertEquals(button?.getAttribute("title"), "カスタムタイトル");

  cleanupGlobals();
});

Deno.test("CopyButton: should handle copy error gracefully", async () => {
  // エラーを投げるモックを作成
  // @ts-ignore: navigator.clipboard mock for testing
  globalThis.navigator = {
    // @ts-ignore: minimal clipboard mock
    clipboard: {
      writeText: () => Promise.reject(new Error("Clipboard access denied")),
    },
  };

  // console.error のモック
  const consoleErrors: unknown[] = [];
  const originalConsoleError = console.error;
  console.error = (...args: unknown[]) => {
    consoleErrors.push(args);
  };

  const { container } = render(<CopyButton text="Test" />);
  const button = container.querySelector("button");

  // ボタンクリック
  button?.click();
  await new Promise((resolve) => setTimeout(resolve, 10));

  // エラーがconsoleに出力されていることを確認
  assertEquals(consoleErrors.length > 0, true);

  // console.errorを元に戻す
  console.error = originalConsoleError;

  cleanupGlobals();
});
