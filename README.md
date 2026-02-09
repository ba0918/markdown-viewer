# Markdown Viewer

[![CI/CD Pipeline](https://github.com/ba0918/ba-markdown-viewer/actions/workflows/ci.yml/badge.svg)](https://github.com/ba0918/markdown-viewer/actions/workflows/ci.yml)
[![Release](https://github.com/ba0918/ba-markdown-viewer/actions/workflows/release.yml/badge.svg)](https://github.com/ba0918/markdown-viewer/actions/workflows/release.yml)

セキュアなローカルMarkdownファイルビューアーChrome拡張機能

## 特徴

- 🔒 **セキュアな設計** - XSS対策（DOMPurify）、厳格なCSP
- 🎨 **6つのプリセットテーマ** - Light/Dark/GitHub/Minimal/Solarized
- 🔥 **Hot Reload** - ファイル変更の自動検出・再読み込み
- 📝 **GitHub Flavored Markdown (GFM)** 完全対応
- 🎯 **シンタックスハイライト** - highlight.js
- 📊 **Mermaid ダイアグラム**対応
- 🧮 **MathJax 数式表示**対応

## インストール

### 開発版をビルドして使用

1. このリポジトリをクローン

```bash
git clone <repository-url>
cd ba-markdown-viewer
```

2. ビルド

```bash
deno task build
```

3. Chrome拡張機能として読み込み
   - `chrome://extensions/` を開く
   - 「デベロッパーモード」を有効化
   - 「パッケージ化されていない拡張機能を読み込む」
   - プロジェクトのルートディレクトリを選択

4. `file:///*` へのアクセスを許可
   - 拡張機能の詳細ページで「ファイルのURLへのアクセスを許可する」を有効化

## 使い方

1. `.md` または `.markdown` ファイルをChromeで開く
2. 自動的にレンダリングされたMarkdownが表示される
3. ツールバーアイコンをクリックして設定を変更

## 開発

### 必要な環境

- [Deno](https://deno.land/) 2.x以上
- Chrome/Chromium ブラウザ

### 初回セットアップ

リポジトリをクローンした後、Git hooksをセットアップしてください：

```bash
deno task setup-hooks
```

これにより、以下のフックが有効化されます：

- **pre-commit**: フォーマット、リント、単体テストを実行
- **pre-push**: ビルド確認、E2Eテストを実行

これらのフックにより、品質基準を満たさないコードのコミット・プッシュを防ぎます。

### CI/CD

このプロジェクトではGitHub Actionsを使用して自動テスト・ビルドを実行しています。

#### CI Pipeline (`.github/workflows/ci.yml`)

- **トリガー**: Pull Request / `main`・`develop`ブランチへのpush
- **実行内容**:
  - リント (`deno lint`)
  - フォーマットチェック (`deno fmt --check`)
  - 単体テスト + カバレッジ測定
  - E2Eテスト (Playwright)
  - ビルド検証
  - セキュリティチェック (XSS/CSP/manifest検証)
- **マトリックス**: Deno 2.x

#### Release Pipeline (`.github/workflows/release.yml`)

- **トリガー**: `v*.*.*` タグpush / 手動実行
- **実行内容**:
  - 全テスト実行
  - プロダクションビルド
  - manifest.json バージョン更新
  - ZIPパッケージ作成
  - GitHub Release 自動作成
- **リリース方法**:
  ```bash
  git tag v1.0.0
  git push origin v1.0.0
  ```

### コマンド

```bash
# Git hooks セットアップ（初回のみ）
deno task setup-hooks

# 開発モード（ファイル監視）
deno task dev

# ビルド
deno task build

# テスト実行
deno task test

# テスト（watchモード）
deno task test:watch

# E2Eテスト
deno task test:e2e

# E2Eテスト（WSL2環境）
deno task test:e2e:wsl2

# リンティング
deno task lint

# フォーマット
deno task fmt

# 配布用バンドル
deno task bundle
```

## 技術スタック

- **開発環境**: Deno 2.x
- **ビルド**: esbuild
- **実行環境**: Chrome Extension (Manifest V3)
- **UI Framework**: Preact
- **Markdown Parser**: marked
- **Security**: DOMPurify
- **Syntax Highlight**: highlight.js
- **State Management**: Preact Signals
- **Testing**: Deno標準テストランナー + Playwright

## アーキテクチャ

レイヤー分離を徹底した設計:

```
UI層（background/content/settings）
  ↓
ui-components/
  ↓
messaging/
  ↓
services/
  ↓
domain/
  ↓
shared/
```

詳細は [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) を参照。

## セキュリティ

- DOMPurifyによる厳格なHTMLサニタイゼーション
- `javascript:` protocol完全ブロック
- イベントハンドラ除去（`onerror`, `onload`等）
- Content Security Policy (CSP) strict mode
- 最小権限の原則に基づく permissions 設定

詳細は [docs/SECURITY.md](docs/SECURITY.md) を参照。

## ドキュメント

プロジェクトルートの以下のドキュメントに詳細な情報があります:

- [spec.md](spec.md) - 機能仕様とフェーズ計画
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) - アーキテクチャ設計
- [docs/CODING_PRINCIPLES.md](docs/CODING_PRINCIPLES.md) - コーディング原則
- [docs/IMPLEMENTATION_GUIDE.md](docs/IMPLEMENTATION_GUIDE.md) - 実装手順
- [docs/SECURITY.md](docs/SECURITY.md) - セキュリティ設計
- [docs/DIRECTORY_STRUCTURE.md](docs/DIRECTORY_STRUCTURE.md) - ディレクトリ構造

## ライセンス

[MIT License](LICENSE)
