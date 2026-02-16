/**
 * Toast コンポーネント Unit Test
 */

import { assertEquals } from "@std/assert";
import { parseHTML } from "linkedom";
import { render as preactRender } from "preact";
import { h } from "preact";
import { Toast } from "./Toast.tsx";
import { ToastContainer } from "./ToastContainer.tsx";
import { removeToast, showToast, toasts } from "./toast-manager.ts";

// DOM環境のセットアップ
const { document } = parseHTML("<!DOCTYPE html><html><body></body></html>");
globalThis.document = document as unknown as Document;

Deno.test("Toast: should render toast message", () => {
  const item = {
    id: "test-id",
    type: "error" as const,
    message: "Test error message",
    duration: 4000,
  };

  const container = globalThis.document.createElement("div");
  preactRender(h(Toast, { item }), container);

  const message = container.querySelector(".toast-message");
  assertEquals(message?.textContent, "Test error message");

  toasts.value = [];
});

Deno.test("Toast: should apply type-specific class", () => {
  const item = {
    id: "test-id",
    type: "success" as const,
    message: "Success!",
    duration: 4000,
  };

  const container = globalThis.document.createElement("div");
  preactRender(h(Toast, { item }), container);

  const toast = container.querySelector(".toast");
  assertEquals(toast?.classList.contains("toast-success"), true);

  toasts.value = [];
});

Deno.test("Toast: should render close button", () => {
  const item = {
    id: "test-id",
    type: "info" as const,
    message: "Info message",
    duration: 4000,
  };

  const container = globalThis.document.createElement("div");
  preactRender(h(Toast, { item }), container);

  const closeButton = container.querySelector(".toast-close");
  assertEquals(closeButton !== null, true);
  assertEquals(closeButton?.getAttribute("aria-label"), "Close");

  toasts.value = [];
});

Deno.test("ToastContainer: should render nothing when toasts.value is empty", () => {
  toasts.value = [];

  const container = globalThis.document.createElement("div");
  preactRender(h(ToastContainer, null), container);

  const toastElements = container.querySelectorAll(".toast");
  assertEquals(toastElements.length, 0);

  toasts.value = [];
});

Deno.test("ToastContainer: should render multiple toasts", () => {
  toasts.value = [
    { id: "1", type: "error", message: "Error 1", duration: 4000 },
    { id: "2", type: "success", message: "Success 2", duration: 4000 },
  ];

  const container = globalThis.document.createElement("div");
  preactRender(h(ToastContainer, null), container);

  const toastElements = container.querySelectorAll(".toast");
  assertEquals(toastElements.length, 2);

  toasts.value = [];
});

Deno.test({
  name: "toast-manager: should add toast when showToast() is called",
  fn: () => {
    toasts.value = [];
    showToast({ type: "info", message: "Test info" });

    assertEquals(toasts.value.length, 1);
    assertEquals(toasts.value[0].type, "info");
    assertEquals(toasts.value[0].message, "Test info");
    assertEquals(toasts.value[0].duration, 4000);

    toasts.value = [];
  },
  sanitizeResources: false, // タイマーリークを無視（showToast内部のsetTimeout）
  sanitizeOps: false, // 非同期操作リークを無視
});

Deno.test({
  name: "toast-manager: should use custom duration",
  fn: () => {
    toasts.value = [];
    showToast({ type: "warning", message: "Test warning", duration: 2000 });

    assertEquals(toasts.value.length, 1);
    assertEquals(toasts.value[0].duration, 2000);

    toasts.value = [];
  },
  sanitizeResources: false, // タイマーリークを無視（showToast内部のsetTimeout）
  sanitizeOps: false, // 非同期操作リークを無視
});

Deno.test({
  name: "toast-manager: should remove toast by id",
  fn: () => {
    toasts.value = [];
    showToast({ type: "error", message: "Error 1" });
    showToast({ type: "success", message: "Success 2" });

    assertEquals(toasts.value.length, 2);

    const firstId = toasts.value[0].id;
    removeToast(firstId);

    assertEquals(toasts.value.length, 1);
    assertEquals(toasts.value[0].message, "Success 2");

    toasts.value = [];
  },
  sanitizeResources: false, // タイマーリークを無視（showToast内部のsetTimeout）
  sanitizeOps: false, // 非同期操作リークを無視
});

Deno.test("toast-manager: should auto-remove toast after duration", async () => {
  toasts.value = [];

  showToast({ type: "info", message: "Auto remove", duration: 100 });
  assertEquals(toasts.value.length, 1);

  await new Promise((resolve) => setTimeout(resolve, 150));
  assertEquals(toasts.value.length, 0);

  toasts.value = [];
});
