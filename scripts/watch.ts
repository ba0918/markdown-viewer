/**
 * 開発用watchスクリプト
 *
 * ファイル変更を監視して自動リビルドする。
 * build.ts と同じesbuild設定・アセットパイプラインを共有するため、
 * watchでだけビルドが壊れることがない。
 *
 * 静的アセット（manifest/HTML/CSS/フォント/アイコン）は起動時に1度だけ出力する。
 * CSSやmanifestを変更した場合は `deno task build:dev` を実行し直すこと。
 */

import * as esbuild from "esbuild";
import { exists } from "@std/fs";
import {
  createEsbuildConfig,
  ENTRY_POINTS,
  outDirFor,
} from "./lib/esbuild-config.ts";
import { buildAssets } from "./lib/assets.ts";

const outDir = outDirFor(true);

console.log("👀 Starting watch mode...\n");

let contexts: esbuild.BuildContext[] = [];

/** esbuildコンテキストを破棄してプロセスを終了する */
const shutdown = async (exitCode: number): Promise<void> => {
  await Promise.all(contexts.map((ctx) => ctx.dispose()));
  esbuild.stop();
  Deno.exit(exitCode);
};

try {
  if (!await exists(outDir)) {
    await Deno.mkdir(outDir, { recursive: true });
  }

  console.log("📄 Building static assets...");
  await buildAssets(outDir, true);
  console.log("✅ Static assets built");

  const config = createEsbuildConfig(true);

  contexts = await Promise.all(
    ENTRY_POINTS.map(({ outfile, entry }) =>
      esbuild.context({
        ...config,
        entryPoints: [entry],
        outfile: `${outDir}/${outfile}`,
      })
    ),
  );

  await Promise.all(contexts.map((ctx) => ctx.watch()));

  console.log("✅ Watch mode started");
  console.log(`📝 Watching for file changes... (→ ${outDir})`);
  console.log("   Press Ctrl+C to stop\n");

  Deno.addSignalListener("SIGINT", () => {
    console.log("\n🛑 Stopping watch mode...");
    shutdown(0);
  });
  Deno.addSignalListener("SIGTERM", () => shutdown(0));
} catch (error) {
  console.error("❌ Watch mode failed:", error);
  await shutdown(1);
}
