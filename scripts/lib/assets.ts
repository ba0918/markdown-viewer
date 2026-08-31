/**
 * 静的アセットのビルド
 *
 * manifest.json / HTML / CSS / フォント / アイコンの出力を担当する。
 * build.ts と watch.ts の両方から呼ばれる。
 */

import postcss from "postcss";
import postcssImport from "postcss-import";
import cssnano from "cssnano";
import process from "node:process";
import { fromFileUrl } from "@std/path";
import { MARKDOWN_EXTENSIONS } from "../../src/shared/constants/markdown.ts";
import { VALID_THEMES } from "../../src/shared/constants/themes.ts";

/** Content Script CSSのエントリーポイントテンプレート */
const CSS_ENTRY_TEMPLATE = "src/styles/entry-points/content.css";
/** テンプレート内のテーマ名プレースホルダ */
const THEME_PLACEHOLDER = "__THEME__";
/** フォントCSSに差し込む拡張機能リソースのURLプレフィックス */
const FONT_URL_PREFIX =
  "url(chrome-extension://__MSG_@@extension_id__/content/styles/fonts/files/";

/** @fontsource パッケージのディレクトリを解決する（バージョンをハードコードしない） */
const fontsourceDir = (pkg: string): string =>
  fromFileUrl(new URL(".", import.meta.resolve(`${pkg}/400.css`)));

/** ビルドするフォント: パッケージ名と含めるウェイト */
const FONTS = [
  { pkg: "@fontsource/inter", weights: ["400", "600"] },
  { pkg: "@fontsource/jetbrains-mono", weights: ["400", "500"] },
] as const;

/**
 * PostCSSでCSSを処理する（@import解決 + minify）
 *
 * @param css 入力CSS
 * @param from ソースパス（エラーメッセージ・相対解決の基点）
 */
const processCss = async (css: string, from: string): Promise<string> => {
  const result = await postcss([
    postcssImport({
      resolve: (id: string, basedir: string) => {
        // basedirが相対パスの場合はcwd基準で絶対化する
        const base = basedir.startsWith("/")
          ? basedir
          : `${process.cwd()}/${basedir}`;
        return new URL(id, `file://${base}/`).pathname;
      },
      load: (filename: string) => Deno.readTextFile(filename),
    }),
    cssnano(),
  ]).process(css, { from });

  return result.css;
};

/**
 * フォントCSSを拡張機能向けに変換して連結する
 *
 * - `url(./files/...)` を chrome-extension:// のリソースURLへ書き換え
 * - font-display: swap → block（CLS削減）
 */
const buildFontCss = async (): Promise<string> => {
  const perFont: string[] = [];

  for (const { pkg, weights } of FONTS) {
    const dir = fontsourceDir(pkg);
    const cssPerWeight: string[] = [];
    for (const weight of weights) {
      const css = await Deno.readTextFile(`${dir}${weight}.css`);
      cssPerWeight.push(
        css
          .replace(/url\(\.\/files\//g, FONT_URL_PREFIX)
          .replace(/font-display:\s*swap/g, "font-display: block"),
      );
    }
    // 同一フォントのウェイトは改行1つで連結
    perFont.push(cssPerWeight.join("\n"));
  }

  // フォントごとの塊は空行で区切る
  return `${perFont.join("\n\n")}\n`;
};

/** フォントファイル（woff2等）を出力先へコピーする */
const copyFontFiles = async (outDir: string): Promise<void> => {
  const filesDir = `${outDir}/content/styles/fonts/files`;
  await Deno.mkdir(filesDir, { recursive: true });

  for (const { pkg, weights } of FONTS) {
    const srcDir = `${fontsourceDir(pkg)}files`;
    for await (const entry of Deno.readDir(srcDir)) {
      if (weights.some((weight) => entry.name.includes(`${weight}-normal`))) {
        await Deno.copyFile(
          `${srcDir}/${entry.name}`,
          `${filesDir}/${entry.name}`,
        );
      }
    }
  }
};

/**
 * manifest.json を出力する
 *
 * devビルドではE2Eテスト用にlocalhost設定を注入する。
 */
export const buildManifest = async (
  outDir: string,
  isDev: boolean,
): Promise<void> => {
  if (!isDev) {
    await Deno.copyFile("manifest.json", `${outDir}/manifest.json`);
    return;
  }

  const manifest = JSON.parse(await Deno.readTextFile("manifest.json"));
  // E2Eテスト用: localhost設定を注入（MARKDOWN_EXTENSIONSから動的生成）
  manifest.content_scripts[0].matches.push(
    ...MARKDOWN_EXTENSIONS.map((ext) => `http://localhost:*/*${ext}`),
  );
  manifest.host_permissions.push("http://localhost:*/*");
  manifest.web_accessible_resources[0].matches.push("http://localhost:*/*");

  await Deno.writeTextFile(
    `${outDir}/manifest.json`,
    JSON.stringify(manifest, null, 2) + "\n",
  );
};

/** Popup/OptionsのHTMLをコピーする */
export const copyHtml = async (outDir: string): Promise<void> => {
  await Deno.copyFile("src/settings/popup/popup.html", `${outDir}/popup.html`);
  await Deno.copyFile(
    "src/settings/options/options.html",
    `${outDir}/options.html`,
  );
};

/** Popup/Options用のCSSをビルドする */
export const buildSettingsCss = async (outDir: string): Promise<void> => {
  const entries = [
    { input: "src/settings/options/options.css", output: "options.css" },
    { input: "src/settings/popup/popup.css", output: "popup.css" },
  ];

  for (const { input, output } of entries) {
    const css = await processCss(await Deno.readTextFile(input), input);
    await Deno.writeTextFile(`${outDir}/${output}`, css);
  }
};

/**
 * Content Script用のテーマCSSをビルドする
 *
 * テーマごとに entry-points/content.css の `__THEME__` を差し替え、
 * @import を解決した単一ファイルを出力する。
 * テーマ一覧は shared/constants/themes.ts の VALID_THEMES を参照する。
 */
export const buildThemeCss = async (outDir: string): Promise<void> => {
  await Deno.mkdir(`${outDir}/content/styles/themes`, { recursive: true });
  await copyFontFiles(outDir);

  const template = await Deno.readTextFile(CSS_ENTRY_TEMPLATE);
  const fontCss = await buildFontCss();

  for (const theme of VALID_THEMES) {
    const entryContent = template.replaceAll(THEME_PLACEHOLDER, theme) +
      `\n/* Font Faces */\n${fontCss}`;
    const css = await processCss(entryContent, CSS_ENTRY_TEMPLATE);
    await Deno.writeTextFile(
      `${outDir}/content/styles/themes/${theme}.css`,
      css,
    );
  }
};

/** アイコンをコピーする */
export const copyIcons = async (outDir: string): Promise<void> => {
  await Deno.mkdir(`${outDir}/icons`, { recursive: true });
  for (const size of [16, 48, 128]) {
    await Deno.copyFile(
      `icons/icon${size}.png`,
      `${outDir}/icons/icon${size}.png`,
    );
  }
};

/**
 * 静的アセットを一括でビルドする
 *
 * @param outDir 出力ディレクトリ
 * @param isDev 開発ビルドか
 */
export const buildAssets = async (
  outDir: string,
  isDev: boolean,
): Promise<void> => {
  await buildManifest(outDir, isDev);
  await copyHtml(outDir);
  await buildSettingsCss(outDir);
  await buildThemeCss(outDir);
  await copyIcons(outDir);
};
