import { h as _h } from "preact";
import type { ToastItem } from "./types.ts";
import { removeToast } from "./toast-manager.ts";

interface Props {
  item: ToastItem;
}

// アイコンSVGコンポーネント
const ToastIcon = ({ type }: { type: ToastItem["type"] }) => {
  switch (type) {
    case "success":
      return (
        <svg
          class="toast-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M8 12l3 3 5-5" />
        </svg>
      );
    case "error":
      return (
        <svg
          class="toast-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M15 9l-6 6M9 9l6 6" />
        </svg>
      );
    case "warning":
      return (
        <svg
          class="toast-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M12 2L2 20h20L12 2z" />
          <path d="M12 10v4M12 18h.01" />
        </svg>
      );
    case "info":
      return (
        <svg
          class="toast-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4M12 8h.01" />
        </svg>
      );
  }
};

export const Toast = ({ item }: Props) => {
  return (
    <div class={`toast toast-${item.type}`} role="alert">
      <div class="toast-icon-wrapper">
        <ToastIcon type={item.type} />
      </div>
      <div class="toast-content">
        <span class="toast-message">{item.message}</span>
      </div>
      <button
        type="button"
        class="toast-close"
        onClick={() => removeToast(item.id)}
        aria-label="Close"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};
