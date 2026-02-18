/**
 * Bundle Script
 *
 * dist/release/ の内容をZIPファイルにパッケージングする。
 * Chrome Web Store提出用のZIPファイルを生成する。
 *
 * 使用: deno task bundle（build + bundle を連続実行）
 *
 * 依存: Python 3（zipfileモジュール使用、外部パッケージ不要）
 */

const VERSION = JSON.parse(await Deno.readTextFile("./manifest.json")).version;
const DIST_DIR = "./dist/release";
const OUTPUT_FILE = `./dist/ba-markdown-viewer-v${VERSION}.zip`;

// dist/release が存在するか確認
try {
  await Deno.stat(DIST_DIR);
} catch {
  console.error(
    `❌ ${DIST_DIR} が見つかりません。先に deno task build を実行してください。`,
  );
  Deno.exit(1);
}

// 既存のZIPがあれば削除
try {
  await Deno.remove(OUTPUT_FILE);
} catch {
  // ファイルが存在しなければ無視
}

// Python 3のzipfileモジュールでZIP作成（外部パッケージ不要）
const pythonScript = `
import zipfile, os, sys

dist_dir = sys.argv[1]
output_file = sys.argv[2]

with zipfile.ZipFile(output_file, 'w', zipfile.ZIP_DEFLATED) as zf:
    for root, dirs, files in os.walk(dist_dir):
        for file in sorted(files):
            # ソースマップファイルを除外（安全策）
            if file.endswith('.map'):
                continue
            file_path = os.path.join(root, file)
            arcname = os.path.relpath(file_path, dist_dir)
            zf.write(file_path, arcname)

print(f"Files added: {len(zf.namelist())}")
`;

const command = new Deno.Command("python3", {
  args: ["-c", pythonScript, DIST_DIR, OUTPUT_FILE],
  stdout: "piped",
  stderr: "piped",
});

const { code, stdout, stderr } = await command.output();

if (code !== 0) {
  console.error("❌ ZIP作成に失敗しました:");
  console.error(new TextDecoder().decode(stderr));
  Deno.exit(1);
}

const pythonOutput = new TextDecoder().decode(stdout).trim();

// ファイルサイズを取得
const stat = await Deno.stat(OUTPUT_FILE);
const sizeMB = (stat.size / 1024 / 1024).toFixed(2);

console.log(`📦 パッケージ作成完了!`);
console.log(`   ファイル: ${OUTPUT_FILE}`);
console.log(`   サイズ: ${sizeMB} MB`);
console.log(`   バージョン: v${VERSION}`);
console.log(`   ${pythonOutput}`);
console.log(``);
console.log(`📋 次のステップ:`);
console.log(`   1. Chrome Web Store Developer Dashboard を開く`);
console.log(`   2. ${OUTPUT_FILE} をアップロード`);
