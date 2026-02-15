import { signal } from "@preact/signals";
import type { ToastItem, ToastType } from "./types.ts";

// グローバルなトースト一覧(Signal)
export const toasts = signal<ToastItem[]>([]);

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

  // 自動削除
  setTimeout(() => {
    removeToast(id);
  }, item.duration);
};

// トースト削除関数
export const removeToast = (id: string): void => {
  toasts.value = toasts.value.filter((toast) => toast.id !== id);
};
