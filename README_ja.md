# Markdown Viewer - Simple & Secure

[![CI/CD Pipeline](https://github.com/ba0918/markdown-viewer/actions/workflows/ci.yml/badge.svg)](https://github.com/ba0918/markdown-viewer/actions/workflows/ci.yml)
[![Release](https://github.com/ba0918/markdown-viewer/actions/workflows/release.yml/badge.svg)](https://github.com/ba0918/markdown-viewer/actions/workflows/release.yml)

**[English README is here](README.md)**

セキュリティとシンプルさを重視したローカルMarkdownビューア。

## なぜ作ったか

拡張機能のマルウェア化を避けるため、必要最小限の権限で自作。

## 特徴

- 🔒 **最小権限** - storage + activeTab + scripting
  (デフォルトはファイルアクセスのみ)
- 🔥 **Hot Reload** - ファイル変更を自動検出
- 🎨 **6つのテーマ** - Light/Dark/GitHub/Minimal/SolarizedLight/SolarizedDark
- 🌐 **リモートURL対応 (オプション)** -
  カスタムドメインを追加してリモートMarkdownファイルに対応
- **GFM対応** - シンタックスハイライト、Mermaid、数式、目次

## スクリーンショット

### Lightテーマ

![Light Theme](docs/images/screenshot-light.png)

### Darkテーマ

![Dark Theme](docs/images/screenshot-dark.png)

### GitHubテーマ + 目次

![GitHub Theme](docs/images/screenshot-github-toc.png)

## インストール

### Chrome Web Storeから

🚧 準備中

### 手動インストール

```bash
git clone https://github.com/ba0918/markdown-viewer.git
cd markdown-viewer
deno task build  # Deno 2.x必須
```

1. `chrome://extensions/` → デベロッパーモード有効化
2. 「パッケージ化されていない拡張機能を読み込む」
3. 拡張機能の詳細 → 「ファイルのURLへのアクセスを許可する」

## 使い方

1. `.md`ファイルをChromeで開く
2. 以上

## セキュリティ

### やること

- ✅ ローカルMarkdownファイルを読む
- ✅ 設定をローカル保存
- ✅ リモートURLへのアクセス (明示的に許可したドメインのみ)

### やらないこと

- ❌ データ収集・トラッキング
- ❌ 許可していないドメインへのネットワークリクエスト
- ❌ ユーザーの許可なしにWebサイトへアクセス

**権限:**

- 必須: `storage`, `activeTab`, `scripting`, `file:///*`
- オプション: `https://*/*` (設定でカスタムドメインを追加した場合のみ)

## FAQ

### WSL2ファイルは?

レンダリングは問題ないが、Hot ReloadはChrome拡張の制限で動作しない。

## ライセンス

[MIT License](LICENSE)
