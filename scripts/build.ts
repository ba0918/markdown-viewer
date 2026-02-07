import * as esbuild from 'esbuild';
import { exists } from 'https://deno.land/std@0.208.0/fs/mod.ts';

/**
 * ビルドスクリプト
 * esbuildを使用してTypeScriptをバンドル
 */

const commonConfig: Partial<esbuild.BuildOptions> = {
  bundle: true,
  format: 'esm',
  target: 'chrome120',
  minify: true,
  sourcemap: true,
  jsxFactory: 'h',
  jsxFragment: 'Fragment',
  jsxImportSource: 'preact'
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

  console.log('\n🎉 Build completed successfully!');
  console.log('\n📋 Next steps:');
  console.log('1. Load extension in Chrome: chrome://extensions/');
  console.log('2. Enable "Developer mode"');
  console.log('3. Click "Load unpacked" and select this directory');

} catch (error) {
  console.error('❌ Build failed:', error);
  Deno.exit(1);
}

// esbuildのクリーンアップ
esbuild.stop();
