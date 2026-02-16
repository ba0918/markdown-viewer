import { h as _h, render } from "preact";
import { App } from "./App.tsx";

/**
 * Popup エントリーポイント
 *
 * popup.htmlにPreact Appコンポーネントをマウントする。
 */
const root = document.getElementById("app");
if (root) {
  render(<App />, root);
} else {
  console.error("Failed to find #app element");
}
