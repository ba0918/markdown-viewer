import { signal } from "@preact/signals";
import type { ToastItem, ToastType } from "./types.ts";

// グローバルなトースト一覧(Signal)
export const toasts = signal<ToastItem[]>([]);

// メモリリーク防止: タイマーIDを管理するMap
const toastTimers = new Map<string, ReturnType<typeof globalThis.setTimeout>>();

// トースト表示関数
export const showToast = (params: {
  type: ToastType;
  message: string;
  duration?: number;
}): void => {
  const id = crypto.randomUUID();
  const item: ToastItem = {
    id,
    type: params.type,
    message: params.message,
    duration: params.duration ?? 4000,
  };

  // 追加
  toasts.value = [...toasts.value, item];

  // 自動削除（タイマーIDを保存してメモリリーク防止）
  const timerId = globalThis.setTimeout(() => {
    removeToast(id);
  }, item.duration);

  toastTimers.set(id, timerId);
};

// トースト削除関数
export const removeToast = (id: string): void => {
  // タイマーをクリア（メモリリーク防止）
  const timerId = toastTimers.get(id);
  if (timerId !== undefined) {
    globalThis.clearTimeout(timerId);
    toastTimers.delete(id);
  }

  toasts.value = toasts.value.filter((toast) => toast.id !== id);
};
