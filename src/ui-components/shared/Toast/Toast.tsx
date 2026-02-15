import { h as _h } from "preact";
import type { ToastItem } from "./types.ts";
import { removeToast } from "./toast-manager.ts";

interface Props {
  item: ToastItem;
}

export const Toast = ({ item }: Props) => {
  return (
    <div class={`toast toast-${item.type}`} role="alert">
      <span class="toast-message">{item.message}</span>
      <button
        type="button"
        class="toast-close"
        onClick={() => removeToast(item.id)}
        aria-label="Close"
      >
        ×
      </button>
    </div>
  );
};
