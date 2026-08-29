/**
 * ビルドスクリプト
 *
 * esbuildでTypeScriptをバンドルし、静的アセットを出力する。
 *
 * --dev フラグ付きで実行すると、開発/テスト用ビルド（dist/development/）を生成。
 * manifest.jsonにlocalhost設定を注入し、E2Eテストで使用可能にする。
 *
 * esbuild設定は scripts/lib/esbuild-config.ts、
 * 静的アセットは scripts/lib/assets.ts に分離（watch.tsと共有）。
 */

import * as esbuild from "esbuild";
import { exists } from "@std/fs";
import {
  createEsbuildConfig,
  ENTRY_POINTS,
  outDirFor,
} from "./lib/esbuild-config.ts";
import { buildAssets } from "./lib/assets.ts";
import { printBundleSizeReport } from "./lib/size-report.ts";

const isDev = Deno.args.includes("--dev");
const outDir = outDirFor(isDev);

console.log(
  `🔨 Building Markdown Viewer... (${
    isDev ? "dev" : "production"
  } → ${outDir})\n`,
);

if (!await exists(outDir)) {
  await Deno.mkdir(outDir, { recursive: true });
  console.log(`📁 Created ${outDir}/ directory`);
}

try {
  const config = createEsbuildConfig(isDev);
  const metafiles: { name: string; metafile: esbuild.Metafile }[] = [];

  for (const { outfile, entry } of ENTRY_POINTS) {
    console.log(`📦 Building ${outfile}...`);
    const result = await esbuild.build({
      ...config,
      entryPoints: [entry],
      outfile: `${outDir}/${outfile}`,
      metafile: true,
    });
    metafiles.push({ name: outfile, metafile: result.metafile! });
    console.log(`✅ ${outfile} built`);
  }

  console.log("📄 Building static assets...");
  await buildAssets(outDir, isDev);
  console.log("✅ Static assets built");

  printBundleSizeReport(metafiles);

  console.log(
    `\n🎉 Build completed successfully! (${
      isDev ? "dev" : "production"
    } → ${outDir})`,
  );
  console.log("\n📋 Next steps:");
  console.log("1. Load extension in Chrome: chrome://extensions/");
  console.log('2. Enable "Developer mode"');
  console.log(`3. Click "Load unpacked" and select the "${outDir}" directory`);
} catch (error) {
  console.error("❌ Build failed:", error);
  esbuild.stop();
  Deno.exit(1);
}

// esbuildのクリーンアップ
esbuild.stop();
