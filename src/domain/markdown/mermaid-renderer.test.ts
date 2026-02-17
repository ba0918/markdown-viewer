/**
 * Mermaid Renderer Tests
 *
 * sanitizeSvg()のユニットテスト + renderMermaid()のE2Eテストガイド
 *
 * sanitizeSvg()はlinkedomでDOMParser環境をセットアップしてテスト。
 * XMLSerializerはlinkedomに含まれないため、最小限のモックで対応。
 * renderMermaid()はブラウザ環境（mermaid library）が必要なためE2Eテストでカバー。
 */

import { assertEquals } from "@std/assert";
import { parseHTML } from "linkedom";
import { sanitizeSvg } from "./mermaid-renderer.ts";

// linkedomでDOMParser環境をセットアップ
// @ts-ignore: linkedom types not available in Deno
const { DOMParser: LinkedomDOMParser } = parseHTML(
  "<!DOCTYPE html><html></html>",
);
// @ts-ignore: linkedom types not available in Deno
globalThis.DOMParser = LinkedomDOMParser;

// XMLSerializerはlinkedomに含まれないため最小限のモックを作成
// @ts-ignore: mock for test environment
globalThis.XMLSerializer = class {
  serializeToString(node: { toString: () => string }): string {
    return node.toString();
  }
};

// --- sanitizeSvg() テスト ---

Deno.test("sanitizeSvg: 正常なSVGはそのまま返す", () => {
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100"/></svg>';
  const result = sanitizeSvg(svg);
  assertEquals(result.includes("rect"), true);
  assertEquals(result.includes("svg"), true);
});

Deno.test("sanitizeSvg: script要素を除去する", () => {
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg"><script>alert("xss")</script><rect/></svg>';
  const result = sanitizeSvg(svg);
  assertEquals(result.includes("<script"), false);
  assertEquals(result.includes("alert"), false);
});

Deno.test("sanitizeSvg: onXXXイベント属性を除去する", () => {
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg"><rect onclick="alert(1)" onload="alert(2)"/></svg>';
  const result = sanitizeSvg(svg);
  assertEquals(result.includes("onclick"), false);
  assertEquals(result.includes("onload"), false);
});

Deno.test("sanitizeSvg: javascript: URLのhrefを除去する", () => {
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg"><a href="javascript:alert(1)"><text>click</text></a></svg>';
  const result = sanitizeSvg(svg);
  assertEquals(result.includes("javascript:"), false);
});

Deno.test("sanitizeSvg: パースエラー時は空文字列を返す（バイパス防止）", () => {
  // linkedomのDOMParserはパースエラーでparsererrorを返す場合がある
  // 実際のブラウザでの挙動はE2Eテストでカバー
  // ここではDOMParserをモックしてパースエラーをシミュレート
  const originalDOMParser = globalThis.DOMParser;

  // @ts-ignore: mock DOMParser for parse error simulation
  globalThis.DOMParser = class {
    parseFromString() {
      return {
        querySelector: (selector: string) => {
          if (selector === "parsererror") {
            return { textContent: "parse error" }; // parsererrorを返す
          }
          return null;
        },
      };
    }
  };

  const result = sanitizeSvg("<invalid>svg</data>");
  assertEquals(result, "");

  // 元に戻す
  globalThis.DOMParser = originalDOMParser;
});

Deno.test("sanitizeSvg: 空文字列入力は空文字列を返す", () => {
  // 空文字列はパースエラーになるのでパースエラー時と同じく空文字列
  const originalDOMParser = globalThis.DOMParser;

  // @ts-ignore: mock DOMParser for empty input
  globalThis.DOMParser = class {
    parseFromString() {
      return {
        querySelector: (selector: string) => {
          if (selector === "parsererror") {
            return { textContent: "parse error" };
          }
          return null;
        },
      };
    }
  };

  const result = sanitizeSvg("");
  assertEquals(result, "");

  globalThis.DOMParser = originalDOMParser;
});

// --- renderMermaid() テストガイド ---

/**
 * Test coverage by E2E tests (tests/e2e/mermaid-rendering.spec.ts):
 * - Flowchart rendering to SVG
 * - Sequence diagram rendering to SVG
 * - Class diagram rendering to SVG
 * - Multiple diagram types handling
 * - Theme integration (light/dark themes)
 * - Error handling for invalid Mermaid syntax
 * - Dynamic Import verification (library not loaded when no diagrams)
 */
