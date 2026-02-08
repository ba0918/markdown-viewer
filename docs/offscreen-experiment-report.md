# Offscreen Document API実験レポート

**Cycle ID:** `20260208101823`
**実験日:** 2026-02-08
**目的:** WSL2環境でのHot Reload制限をOffscreen Document APIで回避できるか検証

---

## 📋 Executive Summary

**結論: ❌ Offscreen Document APIではWSL2ファイルアクセス制限を回避できない**

Offscreen Document APIを使用しても、`file://wsl.localhost/...` パスへのアクセスは同じセキュリティポリシーによってブロックされる。Chrome拡張機能のすべてのコンテキスト（Background Script、Content Script、Offscreen Document）で同一の制限が適用される。

---

## 🎯 実験目的

### 背景

現在のHot Reload実装では、以下の問題が存在する：

- **Windowsローカルファイル** (`file:///C:/...`) → ✅ 動作
- **WSL2ファイル** (`file://wsl.localhost/Ubuntu-24.04/...`) → ❌ ブロック

エラー: `Not allowed to load local resource: file://wsl.localhost/...`

### 仮説

Offscreen Document APIは通常のWebページコンテキストに近い環境を提供するため、Background Scriptとは異なるセキュリティポリシーが適用される可能性がある。これによりWSL2ファイルへのアクセスが可能になるかもしれない。

---

## 🔬 実験設計

### 実装内容

1. **manifest.json**
   - `offscreen` permission 追加

2. **Offscreen Document** (`src/offscreen/hot-reload/`)
   - `offscreen.html`: 最小限のHTML
   - `offscreen.ts`: fetch APIでfile://URLにアクセス

3. **Background Script統合**
   - `offscreen-manager.ts`: ライフサイクル管理
   - `offscreen-test.ts`: テスト用グローバル関数

4. **ビルド設定**
   - esbuildで offscreen.js/offscreen.html をビルド

### テストケース

```javascript
// Service Workerコンソールで実行
testOffscreenFetch("file://wsl.localhost/Ubuntu-24.04/home/mizumi/develop/ba-markdown-viewer/test-offscreen.md")
```

---

## 📊 実験結果

### ✅ 成功した項目

1. **Offscreen Document作成**
   ```
   [OffscreenManager] Creating offscreen document
   [Offscreen] Hot Reload offscreen document loaded
   [OffscreenManager] Offscreen document created
   [Experiment] Offscreen document created successfully
   ```

2. **Background ↔ Offscreen メッセージング**
   - `chrome.runtime.sendMessage()` で正常に通信
   - 非同期レスポンス処理も正常動作

3. **Fetch API実行**
   - Offscreen contextで fetch API 自体は動作
   - HTTP/HTTPS URLには問題なくアクセス可能（推定）

### ❌ 失敗した項目

**WSL2ファイルへのfetchアクセス**

```
[Offscreen] Fetching file: file://wsl.localhost/Ubuntu-24.04/...
[Offscreen] Request method: HEAD, cache: no-cache

Not allowed to load local resource: file://wsl.localhost/...

[Offscreen] Fetch failed: TypeError: Failed to fetch
[Offscreen] Error details: {
  name: 'TypeError',
  message: 'Failed to fetch',
  stack: '...'
}

[Offscreen] Retrying with GET method...
Not allowed to load local resource: file://wsl.localhost/...
[Offscreen] GET Fetch also failed: TypeError: Failed to fetch
```

**エラー分析:**
- `HEAD` / `GET` 両方のメソッドで失敗
- エラーメッセージは Background Script と全く同じ
- Chromeのコンソールに `Not allowed to load local resource` が表示
- これはChrome自体のセキュリティポリシー違反

---

## 🧪 技術的分析

### なぜOffscreen Documentでも失敗するのか

1. **拡張機能全体で同一のセキュリティポリシー**
   - Offscreen Documentも拡張機能の一部として実行される
   - `chrome-extension://` オリジンで動作
   - Background Script / Content Script と同じ制限を受ける

2. **`file://` プロトコルの特殊性**
   - Chromeは `file://` URLへのアクセスを厳格に制限
   - 特に `file://wsl.localhost/...` のような特殊パスは拒否
   - Manifest V3のセキュリティ強化により、回避手段が限定的

3. **Offscreen Document APIの設計意図**
   - DOM操作、Canvas処理、Audio/Video処理などのため
   - ファイルシステムアクセスの制限回避を目的としていない

---

## 💡 代替案の検討

### 1. Localhost HTTPサーバー（現行実装・推奨）

**メリット:**
- ✅ すでに実装済み
- ✅ WSL2環境でも動作確認済み
- ✅ Hot Reload完全対応

**デメリット:**
- ⚠️ ユーザーが手動でサーバー起動が必要
- ⚠️ ポート番号管理が必要

**実装例:**
```bash
# WSL2内で実行
python3 -m http.server 8000
# または
deno run --allow-net --allow-read https://deno.land/std/http/file_server.ts
```

### 2. Native Messaging Host

**メリット:**
- ✅ ファイルシステムへの完全アクセス
- ✅ WSL2パスも直接アクセス可能

**デメリット:**
- ❌ 複雑なセットアップ（ネイティブアプリのインストール）
- ❌ クロスプラットフォーム対応が困難
- ❌ ユーザーフレンドリーでない

### 3. File System Access API

**メリット:**
- ✅ 標準Web API
- ✅ 永続的なディレクトリアクセス（一度許可すれば継続）

**デメリット:**
- ❌ ユーザーが毎回ファイルピッカーで選択
- ❌ Hot Reload の「自動」という特性と矛盾
- ⚠️ WSL2パス対応は不明

---

## 📝 結論と推奨事項

### 結論

**Offscreen Document APIはWSL2 Hot Reload問題の解決策にならない。**

Chromeの拡張機能セキュリティポリシーは、実行コンテキスト（Background/Content/Offscreen）に関わらず一貫して適用される。`file://wsl.localhost/...` へのアクセス制限は、Offscreen Documentでも回避できない。

### 推奨事項

1. **現行実装を維持**
   - Windowsローカルファイルでは Hot Reload 完全対応
   - WSL2環境では localhost HTTPサーバー推奨

2. **ドキュメント整備**
   - README に環境別の動作状況を明記
   - Options UI で WSL2制限について警告表示
   - localhost HTTPサーバーの使い方ガイド

3. **将来的な改善の可能性**
   - Chrome拡張機能のセキュリティポリシー変更を監視
   - File System Access API の進化を追跡
   - Manifest V4以降の新機能を調査

---

## 🔗 実装成果物

### 作成したファイル

```
manifest.json                                # offscreen permission追加
src/offscreen/hot-reload/
  offscreen.html                              # Offscreen Document HTML
  offscreen.ts                                # Fetch処理 + メッセージング
src/background/
  offscreen-manager.ts                        # ライフサイクル管理
  offscreen-test.ts                           # テスト用関数（実験終了後削除予定）
src/domain/file-watcher/
  offscreen-fetcher.ts                        # メッセージング定義（実験終了後削除予定）
scripts/
  build.ts                                    # offscreen ビルド設定追加
  watch.ts                                    # offscreen watch設定追加
```

### 学習成果

- ✅ Offscreen Document API の基本的な使い方を習得
- ✅ Background ↔ Offscreen メッセージング実装
- ✅ Chrome拡張機能のセキュリティモデルの理解深化
- ✅ esbuildによる複数エントリポイントのビルド設定

---

## 📚 参考資料

- [Chrome Extensions: Offscreen Documents API](https://developer.chrome.com/docs/extensions/reference/offscreen)
- [Chrome Extensions: File Access Restrictions](https://developer.chrome.com/docs/extensions/mv3/security/)
- [Manifest V3 Migration Guide](https://developer.chrome.com/docs/extensions/migrating/)

---

**実験担当:** Claude Sonnet 4.5
**検証環境:** Windows 11 + WSL2 (Ubuntu 24.04) + Chrome 131+
**最終更新:** 2026-02-08
