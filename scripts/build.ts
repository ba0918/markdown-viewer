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
  minify: true,
  sourcemap: true,
  jsxFactory: 'h',
  jsxFragment: 'Fragment',
  plugins: [...denoPlugins({
    configPath
  })]
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

  // manifest.jsonをdist/にコピー
  console.log('📄 Copying manifest.json...');
  await Deno.copyFile('manifest.json', 'dist/manifest.json');
  console.log('✅ manifest.json copied');

  // HTMLファイルをdist/にコピー
  console.log('📄 Copying HTML files...');
  await Deno.copyFile('popup.html', 'dist/popup.html');
  await Deno.copyFile('options.html', 'dist/options.html');
  console.log('✅ HTML files copied');

  // CSSファイルをdist/にコピー
  console.log('🎨 Copying CSS files...');
  await Deno.mkdir('dist/content/styles/themes', { recursive: true });
  await Deno.copyFile(
    'src/content/styles/themes/light.css',
    'dist/content/styles/themes/light.css'
  );
  await Deno.copyFile(
    'src/content/styles/themes/dark.css',
    'dist/content/styles/themes/dark.css'
  );
  console.log('✅ CSS files copied');

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
