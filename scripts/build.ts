import * as esbuild from 'esbuild';
import { denoPlugins } from 'esbuild-deno-loader';
import { exists } from 'https://deno.land/std@0.208.0/fs/mod.ts';
import { fromFileUrl } from 'https://deno.land/std@0.208.0/path/mod.ts';

/**
 * ビルドスクリプト
 * esbuildを使用してTypeScriptをバンドル
 */

// プロジェクトルートの絶対パスを取得
const projectRoot = fromFileUrl(new URL('../', import.meta.url));
const configPath = `${projectRoot}deno.json`;

const commonConfig: Partial<esbuild.BuildOptions> = {
  bundle: true,
  format: 'esm',
  target: 'chrome120',
  platform: "browser",
  minify: true,
  sourcemap: true,
  define: {
    "global": "globalThis",
    "process.env.NODE_ENV": '"production"',
  },
  jsxFactory: 'h',
  jsxFragment: 'Fragment',
  mainFields: ['browser', 'module', 'main'],
  conditions: ['browser', 'import', 'module', 'default'],
  // Node.js の組み込みモジュールを空のモジュールに置き換え
  alias: {
    'path': 'https://deno.land/std@0.208.0/path/mod.ts',
  },
  plugins: [...denoPlugins({
    configPath,
    importMapURL: new URL('../deno.json', import.meta.url).href,
  })],
  supported: {
    'dynamic-import': true,
  }
};

console.log('🔨 Building Markdown Viewer...\n');

// distディレクトリ作成
const distDir = './dist';
if (!await exists(distDir)) {
  await Deno.mkdir(distDir, { recursive: true });
  console.log('📁 Created dist/ directory');
}

try {
  // Background Script
  console.log('📦 Building background script...');
  await esbuild.build({
    ...commonConfig,
    entryPoints: ['src/background/service-worker.ts'],
    outfile: 'dist/background.js',
    platform: 'browser'
  });
  console.log('✅ background.js built');

  // Content Script
  console.log('📦 Building content script...');
  await esbuild.build({
    ...commonConfig,
    entryPoints: ['src/content/index.ts'],
    outfile: 'dist/content.js',
    platform: 'browser'
  });
  console.log('✅ content.js built');

  // Popup Script
  console.log('📦 Building popup script...');
  await esbuild.build({
    ...commonConfig,
    entryPoints: ['src/settings/popup/index.tsx'],
    outfile: 'dist/popup.js',
    platform: 'browser'
  });
  console.log('✅ popup.js built');

  // Options Script
  console.log('📦 Building options script...');
  await esbuild.build({
    ...commonConfig,
    entryPoints: ['src/settings/options/index.tsx'],
    outfile: 'dist/options.js',
    platform: 'browser'
  });
  console.log('✅ options.js built');

  // manifest.jsonをdist/にコピー
  console.log('📄 Copying manifest.json...');
  await Deno.copyFile('manifest.json', 'dist/manifest.json');
  console.log('✅ manifest.json copied');

  // HTMLファイルをdist/にコピー
  console.log('📄 Copying HTML files...');
  await Deno.copyFile('src/settings/popup/popup.html', 'dist/popup.html');
  await Deno.copyFile('src/settings/options/options.html', 'dist/options.html');
  console.log('✅ HTML files copied');

  // CSSファイルをバンドルしてdist/にコピー (Phase 3: 6テーマ対応 + ToC統合)
  console.log('🎨 Bundling CSS files with ToC styles...');
  await Deno.mkdir('dist/content/styles/themes', { recursive: true });

  // フォントファイルをコピー (Inter + JetBrains Mono)
  console.log('🔤 Copying font files...');
  await Deno.mkdir('dist/content/styles/fonts', { recursive: true });

  const interPath = 'node_modules/.deno/@fontsource+inter@5.2.8/node_modules/@fontsource/inter';
  const jetbrainsPath = 'node_modules/.deno/@fontsource+jetbrains-mono@5.2.8/node_modules/@fontsource/jetbrains-mono';

  // Inter fonts (400, 600)
  let interFontCss400 = await Deno.readTextFile(`${interPath}/400.css`);
  let interFontCss600 = await Deno.readTextFile(`${interPath}/600.css`);
  // パスを Chrome Extension の相対パスに変換
  interFontCss400 = interFontCss400.replace(/url\(\.\/files\//g, 'url(chrome-extension://__MSG_@@extension_id__/content/styles/fonts/files/');
  interFontCss600 = interFontCss600.replace(/url\(\.\/files\//g, 'url(chrome-extension://__MSG_@@extension_id__/content/styles/fonts/files/');
  const interFontCss = interFontCss400 + '\n' + interFontCss600;

  // JetBrains Mono fonts (400, 500)
  let jetbrainsFontCss400 = await Deno.readTextFile(`${jetbrainsPath}/400.css`);
  let jetbrainsFontCss500 = await Deno.readTextFile(`${jetbrainsPath}/500.css`);
  // パスを Chrome Extension の相対パスに変換
  jetbrainsFontCss400 = jetbrainsFontCss400.replace(/url\(\.\/files\//g, 'url(chrome-extension://__MSG_@@extension_id__/content/styles/fonts/files/');
  jetbrainsFontCss500 = jetbrainsFontCss500.replace(/url\(\.\/files\//g, 'url(chrome-extension://__MSG_@@extension_id__/content/styles/fonts/files/');
  const jetbrainsFontCss = jetbrainsFontCss400 + '\n' + jetbrainsFontCss500;

  // フォント files ディレクトリをコピー
  await Deno.mkdir('dist/content/styles/fonts/files', { recursive: true });

  // Inter WOFF2ファイルをコピー
  for await (const entry of Deno.readDir(`${interPath}/files`)) {
    if (entry.name.includes('400-normal') || entry.name.includes('600-normal')) {
      await Deno.copyFile(
        `${interPath}/files/${entry.name}`,
        `dist/content/styles/fonts/files/${entry.name}`
      );
    }
  }

  // JetBrains Mono WOFF2ファイルをコピー
  for await (const entry of Deno.readDir(`${jetbrainsPath}/files`)) {
    if (entry.name.includes('400-normal') || entry.name.includes('500-normal')) {
      await Deno.copyFile(
        `${jetbrainsPath}/files/${entry.name}`,
        `dist/content/styles/fonts/files/${entry.name}`
      );
    }
  }

  console.log('✅ Font files copied');

  // ToC CSSを読み込み（ベーススタイル部分のみ: 1-437行目）
  const tocCssContent = await Deno.readTextFile('src/ui-components/markdown/TableOfContents/toc.css');
  const tocLines = tocCssContent.split('\n');
  const tocBaseStyles = tocLines.slice(0, 437).join('\n'); // 1-437行目: ベーススタイル

  // 各テーマのCSSとToC変数をマッピング
  const themeMap: Record<string, { start: number; end: number }> = {
    'light': { start: 438, end: 485 },
    'dark': { start: 486, end: 533 },
    'github': { start: 534, end: 581 },
    'minimal': { start: 582, end: 629 },
    'solarized-light': { start: 630, end: 677 },
    'solarized-dark': { start: 678, end: 725 },
  };

  // DocumentHeader, RawTextView, CopyButton, CodeBlock の CSS を読み込み
  const documentHeaderCss = await Deno.readTextFile('src/ui-components/markdown/DocumentHeader/styles.css');
  const rawTextViewCss = await Deno.readTextFile('src/ui-components/markdown/RawTextView/styles.css');
  const copyButtonCss = await Deno.readTextFile('src/ui-components/shared/CopyButton.css');
  const codeBlockCss = await Deno.readTextFile('src/ui-components/markdown/CodeBlock.css');

  // 各テーマファイルにToC CSS + DocumentHeader + RawTextView + CopyButton + CodeBlock + Fonts をバンドル
  for (const theme of Object.keys(themeMap)) {
    const themeCss = await Deno.readTextFile(`src/content/styles/themes/${theme}.css`);
    const tocThemeVars = tocLines.slice(themeMap[theme].start, themeMap[theme].end + 1).join('\n');

    // テーマCSS + Fonts + ToC Base + ToC Theme Variables + DocumentHeader + RawTextView + CopyButton + CodeBlock
    const bundledCss = `/* ===== Font Faces (Inter + JetBrains Mono) ===== */\n${interFontCss}\n${jetbrainsFontCss}\n\n${themeCss}\n\n/* ===== ToC Styles (Bundled) ===== */\n${tocBaseStyles}\n${tocThemeVars}\n}\n\n/* ===== DocumentHeader Styles (Bundled) ===== */\n${documentHeaderCss}\n\n/* ===== RawTextView Styles (Bundled) ===== */\n${rawTextViewCss}\n\n/* ===== CopyButton Styles (Bundled) ===== */\n${copyButtonCss}\n\n/* ===== CodeBlock Styles (Bundled) ===== */\n${codeBlockCss}\n`;

    await Deno.writeTextFile(`dist/content/styles/themes/${theme}.css`, bundledCss);
    console.log(`  ✓ ${theme}.css (with Fonts + ToC + DocumentHeader + RawTextView + CopyButton + CodeBlock)`);
  }
  console.log('✅ CSS files bundled (6 themes + Fonts + ToC + CopyButton)');

  // アイコンをdist/にコピー
  console.log('🎨 Copying icons...');
  await Deno.mkdir('dist/icons', { recursive: true });
  await Deno.copyFile('icons/icon16.png', 'dist/icons/icon16.png');
  await Deno.copyFile('icons/icon48.png', 'dist/icons/icon48.png');
  await Deno.copyFile('icons/icon128.png', 'dist/icons/icon128.png');
  console.log('✅ Icons copied');

  console.log('\n🎉 Build completed successfully!');
  console.log('\n📋 Next steps:');
  console.log('1. Load extension in Chrome: chrome://extensions/');
  console.log('2. Enable "Developer mode"');
  console.log('3. Click "Load unpacked" and select the "dist" directory');

} catch (error) {
  console.error('❌ Build failed:', error);
  Deno.exit(1);
}

// esbuildのクリーンアップ
esbuild.stop();
