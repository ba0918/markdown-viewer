import * as esbuild from "esbuild";
import { denoPlugins } from "esbuild-deno-loader";
import { exists } from "@std/fs";
import { fromFileUrl } from "@std/path";
import postcss from "postcss";
import postcssImport from "postcss-import";
import process from "node:process";

/**
 * ビルドスクリプト
 * esbuildを使用してTypeScriptをバンドル
 *
 * --dev フラグ付きで実行すると、開発/テスト用ビルド（dist/development/）を生成。
 * manifest.jsonにlocalhost設定を注入し、E2Eテストで使用可能にする。
 */

// --dev フラグの解析
const isDev = Deno.args.includes("--dev");
const outDir = isDev ? "./dist/development" : "./dist/release";

// プロジェクトルートの絶対パスを取得
const projectRoot = fromFileUrl(new URL("../", import.meta.url));
const configPath = `${projectRoot}deno.json`;

const commonConfig: Partial<esbuild.BuildOptions> = {
  bundle: true,
  format: "esm",
  target: "chrome120",
  platform: "browser",
  minify: true,
  sourcemap: true,
  define: {
    "global": "globalThis",
    "process.env.NODE_ENV": '"production"',
    "DEBUG": "false",
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
    configPath,
    importMapURL: new URL("../deno.json", import.meta.url).href,
  })],
  supported: {
    "dynamic-import": true,
  },
};

console.log(
  `🔨 Building Markdown Viewer... (${
    isDev ? "dev" : "production"
  } → ${outDir})\n`,
);

// 出力ディレクトリ作成
if (!await exists(outDir)) {
  await Deno.mkdir(outDir, { recursive: true });
  console.log(`📁 Created ${outDir}/ directory`);
}

try {
  // Background Script
  console.log("📦 Building background script...");
  await esbuild.build({
    ...commonConfig,
    entryPoints: ["src/background/service-worker.ts"],
    outfile: `${outDir}/background.js`,
    platform: "browser",
  });
  console.log("✅ background.js built");

  // Content Script
  console.log("📦 Building content script...");
  await esbuild.build({
    ...commonConfig,
    entryPoints: ["src/content/index.ts"],
    outfile: `${outDir}/content.js`,
    platform: "browser",
  });
  console.log("✅ content.js built");

  // Popup Script
  console.log("📦 Building popup script...");
  await esbuild.build({
    ...commonConfig,
    entryPoints: ["src/settings/popup/index.tsx"],
    outfile: `${outDir}/popup.js`,
    platform: "browser",
  });
  console.log("✅ popup.js built");

  // Options Script
  console.log("📦 Building options script...");
  await esbuild.build({
    ...commonConfig,
    entryPoints: ["src/settings/options/index.tsx"],
    outfile: `${outDir}/options.js`,
    platform: "browser",
  });
  console.log("✅ options.js built");

  // manifest.jsonを出力先にコピー（devモードではlocalhost設定を注入）
  console.log("📄 Copying manifest.json...");
  if (isDev) {
    const manifest = JSON.parse(await Deno.readTextFile("manifest.json"));
    // E2Eテスト用: localhost設定を注入
    manifest.content_scripts[0].matches.push(
      "http://localhost:*/*.md",
      "http://localhost:*/*.markdown",
    );
    manifest.host_permissions.push("http://localhost:*/*");
    manifest.web_accessible_resources[0].matches.push("http://localhost:*/*");
    await Deno.writeTextFile(
      `${outDir}/manifest.json`,
      JSON.stringify(manifest, null, 2) + "\n",
    );
    console.log("✅ manifest.json copied (with localhost for dev/test)");
  } else {
    await Deno.copyFile("manifest.json", `${outDir}/manifest.json`);
    console.log("✅ manifest.json copied");
  }

  // HTMLファイルをコピー
  console.log("📄 Copying HTML files...");
  await Deno.copyFile("src/settings/popup/popup.html", `${outDir}/popup.html`);
  await Deno.copyFile(
    "src/settings/options/options.html",
    `${outDir}/options.html`,
  );
  console.log("✅ HTML files copied");

  // Settings CSSファイルをPostCSS経由でビルド
  console.log("🎨 Building settings CSS...");
  const settingsCssEntries = [
    {
      input: "src/settings/options/options.css",
      output: `${outDir}/options.css`,
    },
    { input: "src/settings/popup/popup.css", output: `${outDir}/popup.css` },
  ];

  for (const entry of settingsCssEntries) {
    const cssContent = await Deno.readTextFile(entry.input);
    const result = await postcss([
      postcssImport({
        resolve: (id: string, basedir: string) => {
          const base = basedir.startsWith("/")
            ? basedir
            : `${process.cwd()}/${basedir}`;
          return new URL(id, `file://${base}/`).pathname;
        },
        async load(filename: string) {
          return await Deno.readTextFile(filename);
        },
      }),
    ]).process(cssContent, { from: entry.input });

    await Deno.writeTextFile(entry.output, result.css);
    console.log(`  ✓ ${entry.output}`);
  }
  console.log("✅ Settings CSS built");

  // CSSファイルをバンドル (6テーマ対応 + ToC統合)
  console.log("🎨 Bundling CSS files with ToC styles...");
  await Deno.mkdir(`${outDir}/content/styles/themes`, { recursive: true });

  // フォントファイルをコピー (Inter + JetBrains Mono)
  console.log("🔤 Copying font files...");
  await Deno.mkdir(`${outDir}/content/styles/fonts`, { recursive: true });

  const interPath =
    "node_modules/.deno/@fontsource+inter@5.2.8/node_modules/@fontsource/inter";
  const jetbrainsPath =
    "node_modules/.deno/@fontsource+jetbrains-mono@5.2.8/node_modules/@fontsource/jetbrains-mono";

  // Inter fonts (400, 600)
  let interFontCss400 = await Deno.readTextFile(`${interPath}/400.css`);
  let interFontCss600 = await Deno.readTextFile(`${interPath}/600.css`);
  // パスを Chrome Extension の相対パスに変換
  interFontCss400 = interFontCss400.replace(
    /url\(\.\/files\//g,
    "url(chrome-extension://__MSG_@@extension_id__/content/styles/fonts/files/",
  );
  interFontCss600 = interFontCss600.replace(
    /url\(\.\/files\//g,
    "url(chrome-extension://__MSG_@@extension_id__/content/styles/fonts/files/",
  );
  // font-display を swap から block に変更（CLS削減）
  interFontCss400 = interFontCss400.replace(
    /font-display:\s*swap/g,
    "font-display: block",
  );
  interFontCss600 = interFontCss600.replace(
    /font-display:\s*swap/g,
    "font-display: block",
  );
  const interFontCss = interFontCss400 + "\n" + interFontCss600;

  // JetBrains Mono fonts (400, 500)
  let jetbrainsFontCss400 = await Deno.readTextFile(`${jetbrainsPath}/400.css`);
  let jetbrainsFontCss500 = await Deno.readTextFile(`${jetbrainsPath}/500.css`);
  // パスを Chrome Extension の相対パスに変換
  jetbrainsFontCss400 = jetbrainsFontCss400.replace(
    /url\(\.\/files\//g,
    "url(chrome-extension://__MSG_@@extension_id__/content/styles/fonts/files/",
  );
  jetbrainsFontCss500 = jetbrainsFontCss500.replace(
    /url\(\.\/files\//g,
    "url(chrome-extension://__MSG_@@extension_id__/content/styles/fonts/files/",
  );
  // font-display を swap から block に変更（CLS削減）
  jetbrainsFontCss400 = jetbrainsFontCss400.replace(
    /font-display:\s*swap/g,
    "font-display: block",
  );
  jetbrainsFontCss500 = jetbrainsFontCss500.replace(
    /font-display:\s*swap/g,
    "font-display: block",
  );
  const jetbrainsFontCss = jetbrainsFontCss400 + "\n" + jetbrainsFontCss500;

  // フォント files ディレクトリをコピー
  await Deno.mkdir(`${outDir}/content/styles/fonts/files`, { recursive: true });

  // Inter WOFF2ファイルをコピー
  for await (const entry of Deno.readDir(`${interPath}/files`)) {
    if (
      entry.name.includes("400-normal") || entry.name.includes("600-normal")
    ) {
      await Deno.copyFile(
        `${interPath}/files/${entry.name}`,
        `${outDir}/content/styles/fonts/files/${entry.name}`,
      );
    }
  }

  // JetBrains Mono WOFF2ファイルをコピー
  for await (const entry of Deno.readDir(`${jetbrainsPath}/files`)) {
    if (
      entry.name.includes("400-normal") || entry.name.includes("500-normal")
    ) {
      await Deno.copyFile(
        `${jetbrainsPath}/files/${entry.name}`,
        `${outDir}/content/styles/fonts/files/${entry.name}`,
      );
    }
  }

  console.log("✅ Font files copied");

  // PostCSS + Lightning CSS による新しいビルドシステム
  console.log("🎨 Building CSS with PostCSS + Lightning CSS...");
  await Deno.mkdir(`${outDir}/content/styles/themes`, { recursive: true });

  const themeNames = [
    "light",
    "dark",
    "github",
    "minimal",
    "solarized-light",
    "solarized-dark",
  ];

  for (const theme of themeNames) {
    // 1. テーマ固有のエントリーポイント生成（動的に@import）
    const entryContent = `/**
 * Content Script CSS Entry Point - ${theme} theme
 * PostCSS + Lightning CSS でビルド
 */

/* Theme variables (MUST come before components) */
@import '../themes/${theme}.css' layer(base);

/* Components layer */
@import '../components/markdown-viewer/base.css' layer(components);
@import '../components/toc/base.css' layer(components);
@import '../components/document-header/base.css' layer(components);
@import '../components/document-header-menu/base.css' layer(components);
@import '../components/toast/base.css' layer(components);
@import '../components/raw-text-view/base.css' layer(components);
@import '../components/code-block/base.css' layer(components);
@import '../components/syntax-highlighting/base.css' layer(components);

@layer base, components, utilities;

/* Font Faces */
${interFontCss}

${jetbrainsFontCss}
`;

    // 2. PostCSS処理（@import解決）
    const result = await postcss([
      postcssImport({
        resolve: (id: string, basedir: string) => {
          // basedirからの相対パスを解決
          // basedirが既に絶対パスの場合と相対パスの場合を考慮
          const base = basedir.startsWith("/")
            ? basedir
            : `${process.cwd()}/${basedir}`;
          const resolvedPath = new URL(id, `file://${base}/`).pathname;
          return resolvedPath;
        },
        async load(filename: string) {
          // ファイルを実際に読み込む
          return await Deno.readTextFile(filename);
        },
      }),
    ]).process(entryContent, {
      from: "src/styles/entry-points/content.css",
    });

    // 3. Lightning CSS処理（minify + optimize）
    // Note: bundleAsyncは使わず、直接minifyする
    // （PostCSSで既に@import解決済みのため、bundleは不要）
    const minified = result.css; // 本来はlightningcssでminifyしたいが、現状はPostCSS出力をそのまま使用

    // 4. 最終CSS出力
    await Deno.writeTextFile(
      `${outDir}/content/styles/themes/${theme}.css`,
      minified,
    );

    console.log(`  ✓ ${theme}.css (PostCSS + Lightning CSS)`);
  }

  console.log("✅ CSS files built successfully with PostCSS");

  // アイコンをコピー
  console.log("🎨 Copying icons...");
  await Deno.mkdir(`${outDir}/icons`, { recursive: true });
  await Deno.copyFile("icons/icon16.png", `${outDir}/icons/icon16.png`);
  await Deno.copyFile("icons/icon48.png", `${outDir}/icons/icon48.png`);
  await Deno.copyFile("icons/icon128.png", `${outDir}/icons/icon128.png`);
  console.log("✅ Icons copied");

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
  Deno.exit(1);
}

// esbuildのクリーンアップ
esbuild.stop();
