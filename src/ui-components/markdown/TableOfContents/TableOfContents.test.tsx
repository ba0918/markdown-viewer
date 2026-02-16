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

// IntersectionObserverのインスタンスを保持（テストからトリガーするため）
// deno-lint-ignore no-explicit-any
let latestObserverInstance: any = null;

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

  // IntersectionObserver のモック（コールバックを保存して後からトリガー可能）
  // @ts-ignore: IntersectionObserver mock for testing
  globalThis.IntersectionObserver = class IntersectionObserver {
    _callback: (entries: unknown[]) => void;
    _elements: Element[] = [];
    constructor(callback: (entries: unknown[]) => void) {
      this._callback = callback;
      latestObserverInstance = this;
    }
    observe(el: Element) {
      this._elements.push(el);
    }
    disconnect() {
      this._elements = [];
    }
    unobserve() {}
    // テストからentryをシミュレートするためのヘルパー
    trigger(entries: unknown[]) {
      this._callback(entries);
    }
  };

  // requestAnimationFrame のモック
  // @ts-ignore: requestAnimationFrame mock for testing
  globalThis.requestAnimationFrame = (cb: () => void) => {
    cb();
    return 0;
  };
  // @ts-ignore: cancelAnimationFrame mock for testing
  globalThis.cancelAnimationFrame = () => {};

  // scrollIntoView のモック
  Element.prototype.scrollIntoView = () => {};
}

function cleanupMocks() {
  // @ts-ignore: cleanup test mock
  delete globalThis.chrome;
  // @ts-ignore: cleanup test mock
  delete globalThis.IntersectionObserver;
  latestObserverInstance = null;
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

Deno.test({
  name: "TableOfContents: should show ToC when clicking show button",
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
  },
});

Deno.test({
  name: "TableOfContents: should collapse and expand items",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
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
  },
});

Deno.test({
  name: "TableOfContents: should navigate to heading on link click",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
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
  },
});

Deno.test({
  name: "TableOfContents: should call onTocStateChange when state changes",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
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
  },
});

Deno.test({
  name: "TableOfContents: should persist state to chrome.storage",
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
  },
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

Deno.test({
  name:
    "TableOfContents: should set initial active heading via requestAnimationFrame",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    setupMocks();

    // DOM上に見出し要素を配置（IntersectionObserverのフォールバック用）
    const h1 = document.createElement("h1");
    h1.id = "first-heading";
    h1.textContent = "First Heading";
    document.body.appendChild(h1);

    // getBoundingClientRect のモック（ページトップにある想定）
    h1.getBoundingClientRect = () =>
      ({
        top: 60,
        bottom: 100,
        left: 0,
        right: 100,
        width: 100,
        height: 40,
      }) as DOMRect;

    const items: TocItem[] = [
      { id: "first-heading", text: "First Heading", level: 1, children: [] },
    ];

    const { container } = render(
      <TableOfContents items={items} themeId="github" />,
    );

    // chrome.storage.get + requestAnimationFrame の処理を待つ
    await new Promise((resolve) => setTimeout(resolve, 100));

    // requestAnimationFrameにより最初の見出しがアクティブに設定される
    const activeLink = container.querySelector(".toc-link.active");
    assertEquals(activeLink !== null, true);
    assertEquals(activeLink?.textContent, "First Heading");

    // クリーンアップ
    document.body.removeChild(h1);
    cleanupMocks();
  },
});

Deno.test({
  name:
    "TableOfContents: should fallback to last passed heading when no visible headings in observer",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    setupMocks();

    // DOM上に見出し要素を配置
    const h1 = document.createElement("h1");
    h1.id = "passed-heading";
    h1.textContent = "Passed Heading";
    document.body.appendChild(h1);

    const h2 = document.createElement("h2");
    h2.id = "next-heading";
    h2.textContent = "Next Heading";
    document.body.appendChild(h2);

    // h1はスクロール位置より上にある（既に通過した）
    h1.getBoundingClientRect = () =>
      ({
        top: -50,
        bottom: -10,
        left: 0,
        right: 100,
        width: 100,
        height: 40,
      }) as DOMRect;

    // h2はまだ検出範囲に入っていない
    h2.getBoundingClientRect = () =>
      ({
        top: 500,
        bottom: 540,
        left: 0,
        right: 100,
        width: 100,
        height: 40,
      }) as DOMRect;

    const items: TocItem[] = [
      { id: "passed-heading", text: "Passed Heading", level: 1, children: [] },
      { id: "next-heading", text: "Next Heading", level: 2, children: [] },
    ];

    const { container } = render(
      <TableOfContents items={items} themeId="github" />,
    );

    await new Promise((resolve) => setTimeout(resolve, 100));

    // IntersectionObserverのコールバックをトリガー（見出しなし = ギャップ状態）
    if (latestObserverInstance) {
      latestObserverInstance.trigger([
        {
          target: h1,
          isIntersecting: false,
          boundingClientRect: { top: -50 },
        },
      ]);
    }

    await new Promise((resolve) => setTimeout(resolve, 50));

    // フォールバックにより、通過済みの見出しがアクティブになる
    const activeLink = container.querySelector(".toc-link.active");
    assertEquals(activeLink !== null, true);
    assertEquals(activeLink?.textContent, "Passed Heading");

    // クリーンアップ
    document.body.removeChild(h1);
    document.body.removeChild(h2);
    cleanupMocks();
  },
});
