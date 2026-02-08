#!/usr/bin/env -S deno run --allow-run --allow-read

/**
 * Git hooks セットアップスクリプト
 *
 * .githooks/ ディレクトリをgitのhooksPathとして設定する
 */

async function setupHooks(): Promise<void> {
  console.log("🔧 Setting up git hooks...");

  try {
    // git config core.hooksPath を .githooks に設定
    const command = new Deno.Command("git", {
      args: ["config", "core.hooksPath", ".githooks"],
    });

    const { code, stderr } = await command.output();

    if (code !== 0) {
      const errorMessage = new TextDecoder().decode(stderr);
      throw new Error(`Failed to set git hooks path: ${errorMessage}`);
    }

    console.log("✅ Git hooks configured successfully!");
    console.log("📍 Hooks location: .githooks/");
    console.log("");
    console.log("Active hooks:");
    console.log("  - pre-commit: fmt, lint, test");
    console.log("  - pre-push: build, e2e tests");
  } catch (error) {
    console.error("❌ Failed to setup git hooks:");
    console.error(error);
    Deno.exit(1);
  }
}

if (import.meta.main) {
  await setupHooks();
}
