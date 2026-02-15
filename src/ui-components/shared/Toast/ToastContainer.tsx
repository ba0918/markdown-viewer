import { h as _h } from "preact";
import { toasts } from "./toast-manager.ts";
import { Toast } from "./Toast.tsx";

export const ToastContainer = () => {
  // toasts SignalをJSX内で直接参照(Preactが自動的にリアクティブに更新)
  // Note: toasts.valueが変更されると自動的に再レンダリングされる
  return (
    <div class="toast-container">
      {toasts.value.map((item) => <Toast key={item.id} item={item} />)}
    </div>
  );
};
