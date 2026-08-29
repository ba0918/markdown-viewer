/**
 * esbuild 共通設定
 *
 * build.ts（ワンショットビルド）と watch.ts（開発用watch）で共有する。
 * 設定が分岐すると watch でだけ壊れる（JSXファクトリ不一致・npm指定子の
 * 未解決など）ため、単一の定義から生成する。
 */

import * as esbuild from "esbuild";
import { denoPlugins } from "esbuild-deno-loader";
import { fromFileUrl } from "@std/path";

/** deno.json の場所（esbuild-deno-loaderのモジュール解決に必要） */
const DENO_CONFIG_URL = new URL("../../deno.json", import.meta.url);

/** ビルド対象のエントリーポイント（出力ファイル名 → ソース） */
export const ENTRY_POINTS = [
  { outfile: "background.js", entry: "src/background/service-worker.ts" },
  { outfile: "content.js", entry: "src/content/index.ts" },
  { outfile: "popup.js", entry: "src/settings/popup/index.tsx" },
  { outfile: "options.js", entry: "src/settings/options/index.tsx" },
] as const;

/**
 * 出力ディレクトリを取得
 *
 * @param isDev 開発ビルドか
 */
export const outDirFor = (isDev: boolean): string =>
  isDev ? "./dist/development" : "./dist/release";

/**
 * esbuild の共通オプションを生成
 *
 * JSXは各ファイルで `h as _h` / `Fragment as _Fragment` としてimportする前提のため、
 * jsxFactory/jsxFragment もそれに合わせる必要がある。
 *
 * @param isDev 開発ビルドか（sourcemapとDEBUGフラグに影響）
 */
export const createEsbuildConfig = (
  isDev: boolean,
): Partial<esbuild.BuildOptions> => ({
  bundle: true,
  format: "esm",
  target: "chrome120",
  platform: "browser",
  minify: true,
  sourcemap: isDev,
  define: {
    "global": "globalThis",
    "process.env.NODE_ENV": '"production"',
    "DEBUG": isDev ? "true" : "false",
  },
  jsxFactory: "_h",
  jsxFragment: "_Fragment",
  mainFields: ["browser", "module", "main"],
  conditions: ["browser", "import", "module", "default"],
  // Node.js の組み込みモジュールを空のモジュールに置き換え
  alias: {
    "path": "https://deno.land/std@0.208.0/path/mod.ts",
  },
  plugins: [...denoPlugins({
    configPath: fromFileUrl(DENO_CONFIG_URL),
    importMapURL: DENO_CONFIG_URL.href,
  })],
  supported: {
    "dynamic-import": true,
  },
});
