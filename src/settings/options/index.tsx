import { h as _h, render } from "preact";
import { App } from "./App.tsx";

/**
 * Options エントリーポイント
 *
 * options.htmlにPreact Appコンポーネントをマウントする。
 */
const root = document.getElementById("app");
if (root) {
  render(<App />, root);
} else {
  console.error("Failed to find #app element");
}
