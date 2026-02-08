/**
 * TableOfContents コンポーネントのテスト
 *
 * テスト対象:
 * - 見出し抽出とレンダリング
 * - 折りたたみ機能（expand/collapse）
 * - Toggle機能（表示/非表示）
 * - スムーススクロールナビゲーション
 * - chrome.storage永続化
 */

import { assertEquals } from "@std/assert";
import { render as preactRender } from "preact";
import { parseHTML } from "linkedom";
import { TableOfContents } from "./TableOfContents.tsx";
import type { TocItem } from "../../../domain/toc/types.ts";

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

// chrome.storage のモック
let chromeStorage: Record<string, unknown> = {};

function setupMocks() {
  chromeStorage = {};

  // chrome.storage のモック
  // @ts-ignore: chrome.storage mock for testing
  globalThis.chrome = {
    storage: {
      sync: {
        get: (keys: string[]) => {
          const result: Record<string, unknown> = {};
          for (const key of keys) {
            if (key in chromeStorage) {
              result[key] = chromeStorage[key];
            }
          }
          return Promise.resolve(result);
        },
        set: (items: Record<string, unknown>) => {
          Object.assign(chromeStorage, items);
          return Promise.resolve();
        },
      },
    },
  };

  // IntersectionObserver のモック
  // @ts-ignore: IntersectionObserver mock for testing
  globalThis.IntersectionObserver = class IntersectionObserver {
    observe() {}
    disconnect() {}
    unobserve() {}
  };

  // scrollIntoView のモック
  Element.prototype.scrollIntoView = () => {};
}

function cleanupMocks() {
  // @ts-ignore: cleanup test mock
  delete globalThis.chrome;
  // @ts-ignore: cleanup test mock
  delete globalThis.IntersectionObserver;
  chromeStorage = {};
}

/**
 * Preactコンポーネントをテスト用にレンダリング
 */
function render(component: preact.VNode) {
  const container = document.createElement("div");
  preactRender(component, container);
  return { container };
}

Deno.test({
  name: "TableOfContents: should render nothing when items array is empty",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    setupMocks();

    const { container } = render(
      <TableOfContents items={[]} themeId="github" />,
    );

    // chrome.storage.get の非同期処理を待つ
    await new Promise((resolve) => setTimeout(resolve, 50));

    const tocContainer = container.querySelector(".toc-container");
    assertEquals(tocContainer, null);

    cleanupMocks();
  },
});

Deno.test({
  name: "TableOfContents: should render ToC with items",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    setupMocks();

    const items: TocItem[] = [
      {
        id: "heading-1",
        text: "Heading 1",
        level: 1,
        children: [
          { id: "heading-2", text: "Heading 2", level: 2, children: [] },
        ],
      },
    ];

    const { container } = render(
      <TableOfContents items={items} themeId="github" />,
    );

    // chrome.storage.get の非同期処理を待つ
    await new Promise((resolve) => setTimeout(resolve, 50));

    const tocContainer = container.querySelector(".toc-container");
    assertEquals(tocContainer !== null, true);

    // 見出しがレンダリングされている
    const links = container.querySelectorAll(".toc-link");
    assertEquals(links.length, 2);
    assertEquals(links[0].textContent, "Heading 1");
    assertEquals(links[1].textContent, "Heading 2");

    cleanupMocks();
  },
});

Deno.test({
  name: "TableOfContents: should toggle visibility when clicking toggle button",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    setupMocks();

    const items: TocItem[] = [
      { id: "h1", text: "Heading 1", level: 1, children: [] },
    ];

    const { container } = render(
      <TableOfContents items={items} themeId="github" />,
    );

    await new Promise((resolve) => setTimeout(resolve, 50));

    // 最初は visible
    let tocContainer = container.querySelector(".toc-container");
    assertEquals(tocContainer?.classList.contains("visible"), true);

    // Toggle ボタンをクリック
    const toggleBtn = container.querySelector(".toc-toggle-btn");
    assertEquals(toggleBtn !== null, true);

    toggleBtn?.dispatchEvent(new Event("click", { bubbles: true }));

    // 少し待機（state更新のため）
    await new Promise((resolve) => setTimeout(resolve, 50));

    // hidden になる
    tocContainer = container.querySelector(".toc-container");
    assertEquals(tocContainer?.classList.contains("hidden"), true);

    // Show ボタンが表示される
    const showBtn = container.querySelector(".toc-show-btn");
    assertEquals(showBtn !== null, true);

    cleanupMocks();
  },
});

Deno.test("TableOfContents: should show ToC when clicking show button", async () => {
  setupMocks();

  const items: TocItem[] = [
    { id: "h1", text: "Heading 1", level: 1, children: [] },
  ];

  const { container } = render(
    <TableOfContents items={items} themeId="github" />,
  );

  await new Promise((resolve) => setTimeout(resolve, 50));

  // まず非表示にする
  const toggleBtn = container.querySelector(".toc-toggle-btn");
  toggleBtn?.dispatchEvent(new Event("click", { bubbles: true }));
  await new Promise((resolve) => setTimeout(resolve, 50));

  // Show ボタンをクリック
  const showBtn = container.querySelector(".toc-show-btn");
  showBtn?.dispatchEvent(new Event("click", { bubbles: true }));
  await new Promise((resolve) => setTimeout(resolve, 50));

  // visible になる
  const tocContainer = container.querySelector(".toc-container");
  assertEquals(tocContainer?.classList.contains("visible"), true);

  cleanupMocks();
});

Deno.test("TableOfContents: should collapse and expand items", async () => {
  setupMocks();

  const items: TocItem[] = [
    {
      id: "h1",
      text: "Heading 1",
      level: 1,
      children: [
        { id: "h2", text: "Heading 2", level: 2, children: [] },
      ],
    },
  ];

  const { container } = render(
    <TableOfContents items={items} themeId="github" />,
  );

  await new Promise((resolve) => setTimeout(resolve, 50));

  // 子要素が表示されている
  const sublist = container.querySelector(".toc-sublist");
  assertEquals(sublist !== null, true);

  // Collapse ボタンをクリック
  const collapseBtn = container.querySelector(".toc-collapse-btn");
  assertEquals(collapseBtn !== null, true);
  assertEquals(collapseBtn?.textContent, "▼"); // 展開状態

  collapseBtn?.dispatchEvent(new Event("click", { bubbles: true }));
  await new Promise((resolve) => setTimeout(resolve, 50));

  // ボタンが折りたたみ状態に変わる
  assertEquals(collapseBtn?.textContent, "▶"); // 折りたたみ状態

  cleanupMocks();
});

Deno.test("TableOfContents: should navigate to heading on link click", async () => {
  setupMocks();

  const items: TocItem[] = [
    { id: "heading-1", text: "Heading 1", level: 1, children: [] },
  ];

  // getElementById のモック
  let scrolledElementId: string | null = null;
  const originalGetElementById = document.getElementById;
  document.getElementById = (id: string) => {
    const element = {
      scrollIntoView: () => {
        scrolledElementId = id;
      },
    };
    return element as HTMLElement;
  };

  const { container } = render(
    <TableOfContents items={items} themeId="github" />,
  );

  await new Promise((resolve) => setTimeout(resolve, 50));

  // リンクをクリック
  const link = container.querySelector(".toc-link");
  link?.dispatchEvent(new Event("click", { bubbles: true }));

  await new Promise((resolve) => setTimeout(resolve, 50));

  // scrollIntoView が呼ばれた
  assertEquals(scrolledElementId, "heading-1");

  // 元に戻す
  document.getElementById = originalGetElementById;

  cleanupMocks();
});

Deno.test("TableOfContents: should call onTocStateChange when state changes", async () => {
  setupMocks();

  const items: TocItem[] = [
    { id: "h1", text: "Heading 1", level: 1, children: [] },
  ];

  let callbackCalled = false;
  const onTocStateChange = () => {
    callbackCalled = true;
  };

  const { container } = render(
    <TableOfContents
      items={items}
      themeId="github"
      onTocStateChange={onTocStateChange}
    />,
  );

  await new Promise((resolve) => setTimeout(resolve, 50));

  // Toggle ボタンをクリック
  const toggleBtn = container.querySelector(".toc-toggle-btn");
  toggleBtn?.dispatchEvent(new Event("click", { bubbles: true }));

  await new Promise((resolve) => setTimeout(resolve, 50));

  // コールバックが呼ばれた
  assertEquals(callbackCalled, true);

  cleanupMocks();
});

Deno.test("TableOfContents: should persist state to chrome.storage", async () => {
  setupMocks();

  const items: TocItem[] = [
    { id: "h1", text: "Heading 1", level: 1, children: [] },
  ];

  const { container } = render(
    <TableOfContents items={items} themeId="github" />,
  );

  await new Promise((resolve) => setTimeout(resolve, 50));

  // Toggle ボタンをクリック
  const toggleBtn = container.querySelector(".toc-toggle-btn");
  toggleBtn?.dispatchEvent(new Event("click", { bubbles: true }));

  await new Promise((resolve) => setTimeout(resolve, 50));

  // chrome.storage.sync.set が呼ばれ、状態が保存された
  assertEquals("tocState" in chromeStorage, true);

  const tocState = chromeStorage.tocState as {
    visible: boolean;
  };
  assertEquals(tocState.visible, false);

  cleanupMocks();
});

Deno.test({
  name: "TableOfContents: should load persisted state from chrome.storage",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    setupMocks();

    // 事前に状態を保存
    chromeStorage.tocState = {
      visible: false,
      width: 280,
      collapsedItems: [],
    };

    const items: TocItem[] = [
      { id: "h1", text: "Heading 1", level: 1, children: [] },
    ];

    const { container } = render(
      <TableOfContents items={items} themeId="github" />,
    );

    await new Promise((resolve) => setTimeout(resolve, 50));

    // 保存された状態（visible: false）でレンダリングされる
    const tocContainer = container.querySelector(".toc-container");
    assertEquals(tocContainer?.classList.contains("hidden"), true);

    // Show ボタンが表示される
    const showBtn = container.querySelector(".toc-show-btn");
    assertEquals(showBtn !== null, true);

    cleanupMocks();
  },
});
