/**
 * バンドルサイズレポート
 *
 * esbuildのmetafileから出力サイズと主要依存パッケージの内訳を表示する。
 * バンドルサイズの監視（特にmathjax-full / mermaid）に使用する。
 */

import type * as esbuild from "esbuild";

/** 内訳に表示する依存パッケージ数 */
const TOP_DEPENDENCIES = 5;

/**
 * バンドル内のパスからnpmパッケージ名を抽出する
 *
 * pnpm/deno形式: node_modules/.deno/pkg@ver/node_modules/pkg/...
 * 最後の node_modules/ 以降のパッケージ名を取得（@scope付き対応）
 *
 * @returns パッケージ名。node_modules配下でない場合はnull
 */
const packageNameOf = (inputPath: string): string | null => {
  if (!inputPath.includes("node_modules")) return null;
  const segments = inputPath.split("node_modules/");
  const match = segments[segments.length - 1].match(/^(@[^/]+\/[^/]+|[^/]+)/);
  return match ? match[1] : null;
};

/**
 * 出力ファイルごとの依存パッケージサイズを集計する（降順）
 */
const aggregateDependencies = (
  output: esbuild.Metafile["outputs"][string],
): { pkg: string; bytes: number }[] => {
  const sizes = new Map<string, number>();

  for (const [inputPath, input] of Object.entries(output.inputs)) {
    const pkg = packageNameOf(inputPath);
    if (!pkg) continue;
    sizes.set(pkg, (sizes.get(pkg) ?? 0) + input.bytesInOutput);
  }

  return [...sizes.entries()]
    .map(([pkg, bytes]) => ({ pkg, bytes }))
    .sort((a, b) => b.bytes - a.bytes);
};

/**
 * バンドルサイズレポートを標準出力へ表示する
 *
 * @param metafiles ビルド結果（出力名とmetafileの組）
 */
export const printBundleSizeReport = (
  metafiles: { name: string; metafile: esbuild.Metafile }[],
): void => {
  console.log("\n📊 Bundle Size Report:");
  console.log("─".repeat(60));

  for (const { name, metafile } of metafiles) {
    for (const [outputPath, output] of Object.entries(metafile.outputs)) {
      if (!outputPath.endsWith(".js")) continue;

      console.log(`\n  ${name}: ${(output.bytes / 1024).toFixed(1)} KB`);

      for (
        const dep of aggregateDependencies(output).slice(0, TOP_DEPENDENCIES)
      ) {
        const depKB = (dep.bytes / 1024).toFixed(1);
        const pct = ((dep.bytes / output.bytes) * 100).toFixed(1);
        console.log(`    └─ ${dep.pkg}: ${depKB} KB (${pct}%)`);
      }
    }
  }

  console.log("\n" + "─".repeat(60));
};
