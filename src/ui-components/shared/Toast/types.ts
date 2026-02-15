export type ToastType = "error" | "success" | "info" | "warning";

export interface ToastItem {
  id: string; // 一意ID(削除用)
  type: ToastType;
  message: string;
  duration?: number; // 表示時間(ms、デフォルト4000)
}
