import * as esbuild from "esbuild";

/**
 * 開発用watchスクリプト
 * ファイル変更を監視して自動リビルド
 */

const commonConfig: Partial<esbuild.BuildOptions> = {
  bundle: true,
  format: "esm",
  target: "chrome120",
  minify: false, // 開発モードではminify無効化
  sourcemap: true,
  jsxFactory: "h",
  jsxFragment: "Fragment",
  jsxImportSource: "preact",
};

console.log("👀 Starting watch mode...\n");

try {
  // Background Script
  const ctxBackground = await esbuild.context({
    ...commonConfig,
    entryPoints: ["src/background/service-worker.ts"],
    outfile: "dist/background.js",
    platform: "browser",
  });

  // Content Script
  const ctxContent = await esbuild.context({
    ...commonConfig,
    entryPoints: ["src/content/index.ts"],
    outfile: "dist/content.js",
    platform: "browser",
  });

  // watch開始
  await Promise.all([
    ctxBackground.watch(),
    ctxContent.watch(),
  ]);

  console.log("✅ Watch mode started");
  console.log("📝 Watching for file changes...");
  console.log("   Press Ctrl+C to stop\n");

  // プロセス終了時のクリーンアップ
  const cleanup = async () => {
    console.log("\n🛑 Stopping watch mode...");
    await ctxBackground.dispose();
    await ctxContent.dispose();
    esbuild.stop();
    Deno.exit(0);
  };

  // シグナルハンドラ登録
  Deno.addSignalListener("SIGINT", cleanup);
  Deno.addSignalListener("SIGTERM", cleanup);
} catch (error) {
  console.error("❌ Watch mode failed:", error);
  esbuild.stop();
  Deno.exit(1);
}
