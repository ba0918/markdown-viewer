# E2E Tests

Chrome拡張機能のE2Eテスト (Playwright)

## 実行方法

### 通常環境 (Mac / Windows / Linux GUI)

```bash
deno task test:e2e
```

### WSL2環境

WSL2ではxvfb-run (仮想ディスプレイ) が必要:

```bash
deno task test:e2e:wsl2
```

または手動で:

```bash
xvfb-run --auto-servernum --server-args="-screen 0 1280x960x24" deno task test:e2e
```

## トラブルシューティング

### WSL2で固まる

- `xvfb-run` を使用してください
- `playwright.config.ts` でDBus環境変数を自動設定しています

### テストがタイムアウトする

- Hot Reloadテストは最大60秒かかります
- `playwright.config.ts` の `timeout` を確認してください

### ブラウザが起動しない

- `dist/` ディレクトリが存在するか確認: `deno task build`
- Chrome拡張機能として正しくビルドされているか確認

## アーキテクチャ

- **fixtures.ts**: Chrome拡張ロード + localhost HTTPサーバー
- **localhost方式**: file:// のパーミッション問題を回避
- **WSL2対応**: xvfb-run + DBus環境変数設定
