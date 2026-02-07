# Phase 2 実装計画 - Settings UI & Hot Reload

## Phase 1完成状況の総括

### ✅ 完成した機能

**コア機能**
- ✅ Markdown → HTML変換（marked v11）
- ✅ XSS対策サニタイゼーション（isomorphic-dompurify）
- ✅ テーマシステム基盤（light/dark）
- ✅ レイヤー分離アーキテクチャ
- ✅ TDD（全26件テストパス）

**ビルドシステム**
- ✅ esbuild + esbuild-deno-loader
- ✅ dist/への成果物生成
- ✅ manifest.json, CSS自動コピー

**現在の制限事項**
- ⚠️ Content Scriptのみ動作（.mdファイルを開くと表示される）
- ⚠️ テーマは固定（lightのみ）
- ⚠️ Settings UIなし（popup.html/options.htmlはダミー）
- ⚠️ Hot Reloadなし
- ⚠️ アイコンなし

---

## Phase 2 実装目標

### 目標：ユーザーが設定を変更できる最小限のUI

**Phase 2で実現すること**
1. テーマ切り替えUI（popup.html）
2. Chrome Storage APIとの連携
3. 設定の永続化
4. （オプション）Hot Reload機能

---

## Phase 2 実装計画

### Step 1: Chrome Storage APIの統合

**実装場所**: `src/background/state-manager.ts`

**責務**:
- Chrome Storage Sync APIとの通信
- 状態の読み書き
- デフォルト値の管理

**TDD**:
```typescript
// src/background/state-manager.test.ts
Deno.test('StateManager: デフォルト状態の読み込み', async () => {
  const state = await stateManager.load();
  assertEquals(state.theme, 'light');
});

Deno.test('StateManager: 状態の保存', async () => {
  await stateManager.save({ theme: 'dark' });
  const state = await stateManager.load();
  assertEquals(state.theme, 'dark');
});
```

**実装順序**:
1. `src/shared/types/state.ts`の型定義を確認
2. `src/background/state-manager.ts`を作成（TDD）
3. `src/messaging/handlers/background-handler.ts`でstateManagerを使用

---

### Step 2: メッセージング層の拡張

**新規メッセージタイプ**:
```typescript
// src/shared/types/message.ts
export type Message =
  | { type: 'RENDER_MARKDOWN'; payload: { markdown: string; themeId?: string } }
  | { type: 'LOAD_THEME'; payload: { themeId: string } }
  | { type: 'UPDATE_THEME'; payload: { themeId: string } }  // ← 実装
  | { type: 'GET_SETTINGS'; payload: {} }                     // ← 新規
  | { type: 'UPDATE_SETTINGS'; payload: Partial<AppState> }; // ← 新規
```

**実装内容**:
- `GET_SETTINGS`: 現在の設定を取得
- `UPDATE_SETTINGS`: 設定を更新してChrome Storageに保存
- `UPDATE_THEME`: テーマを変更して全タブに通知

---

### Step 3: Popup UI実装（Preact）

**ファイル構成**:
```
src/settings/popup/
  ├── index.ts          # エントリーポイント
  ├── App.tsx           # メインコンポーネント
  └── components/
      ├── ThemeSelector.tsx   # テーマ選択
      └── StatusDisplay.tsx   # ステータス表示
```

**実装内容**:

1. **`src/settings/popup/index.ts`**
```typescript
import { render } from 'preact';
import { App } from './App.tsx';

render(<App />, document.getElementById('app')!);
```

2. **`src/settings/popup/App.tsx`**
```typescript
import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { sendMessage } from '../../messaging/client.ts';
import type { AppState } from '../../shared/types/state.ts';

export const App = () => {
  const [settings, setSettings] = useState<AppState | null>(null);

  useEffect(() => {
    sendMessage<AppState>({ type: 'GET_SETTINGS', payload: {} })
      .then(setSettings);
  }, []);

  const handleThemeChange = async (theme: string) => {
    await sendMessage({
      type: 'UPDATE_THEME',
      payload: { themeId: theme }
    });
    setSettings({ ...settings!, theme });
  };

  if (!settings) return <div>Loading...</div>;

  return (
    <div class="popup">
      <h1>Markdown Viewer</h1>
      <ThemeSelector
        current={settings.theme}
        onChange={handleThemeChange}
      />
    </div>
  );
};
```

3. **`popup.html`を実装版に置き換え**
```html
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Markdown Viewer</title>
  <style>
    body {
      width: 320px;
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
  </style>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="popup.js"></script>
</body>
</html>
```

---

### Step 4: ビルドスクリプト更新

**`scripts/build.ts`に追加**:
```typescript
// Popup Script
console.log('📦 Building popup script...');
await esbuild.build({
  ...commonConfig,
  entryPoints: ['src/settings/popup/index.ts'],
  outfile: 'dist/popup.js',
  platform: 'browser'
});
console.log('✅ popup.js built');

// HTMLファイルをコピー
await Deno.copyFile('popup.html', 'dist/popup.html');
await Deno.copyFile('options.html', 'dist/options.html');
```

---

### Step 5: Content Script更新（テーマ切り替え対応）

**実装内容**:
- Chrome Storage変更イベントをリッスン
- テーマが変更されたら再レンダリング

```typescript
// src/content/index.ts に追加
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && changes.theme) {
    const newTheme = changes.theme.newValue;
    // 再レンダリング
    sendMessage<string>({
      type: 'RENDER_MARKDOWN',
      payload: { markdown: currentMarkdown, themeId: newTheme }
    }).then(html => {
      render(<MarkdownViewer html={html} />, document.body);
    });
  }
});
```

---

### Step 6: アイコン作成（オプション）

**必要なサイズ**:
- 16x16 (ツールバー)
- 48x48 (拡張機能管理ページ)
- 128x128 (Chromeウェブストア)

**簡易実装**:
- SVGでシンプルなMarkdownアイコン作成
- 各サイズにエクスポート
- `icons/`ディレクトリに配置

---

## Phase 2 実装順序まとめ

### 優先度: 高

1. **Chrome Storage API統合** (state-manager.ts)
   - 設定の永続化基盤
   - TDD必須

2. **メッセージング拡張** (message types)
   - GET_SETTINGS, UPDATE_SETTINGS, UPDATE_THEME
   - 既存のレイヤー分離を維持

3. **Popup UI実装** (Preact)
   - テーマ切り替えのみ
   - シンプルなUI

4. **Content Script更新** (storage listener)
   - リアルタイムテーマ切り替え

### 優先度: 中

5. **Options UI実装** (options.html)
   - より詳細な設定画面
   - 将来の拡張に備えた設計

6. **アイコン作成**
   - ブランディング
   - ユーザー体験向上

### 優先度: 低（Phase 3候補）

7. **Hot Reload機能**
   - File System Access API検討
   - ファイル監視実装
   - 自動再読み込み

---

## 実装時の注意点

### レイヤー分離の堅持

**絶対禁止**:
- ❌ popup/options層がdomain/servicesを直接呼ぶ
- ❌ messaging層にChrome Storage APIロジック
- ❌ state-manager層にビジネスロジック

**正しい依存関係**:
```
popup/options
  ↓ messaging I/O
messaging/client
  ↓ chrome.runtime.sendMessage
messaging/handlers/background-handler
  ↓ service呼び出し
background/state-manager
  ↓ Chrome Storage API
```

### TDD継続

- state-manager: 8件以上のテストケース
- messaging: 各メッセージタイプごとにテスト
- popup: UI統合テスト（Playwright）

### セキュリティ維持

- DOMPurifyによるサニタイゼーションは継続
- CSPは現状維持
- 外部リソースの読み込み禁止

---

## Phase 2 完了基準

### 機能面

- ✅ Popupからテーマを切り替えられる
- ✅ 設定がChrome Storageに永続化される
- ✅ Content Scriptがテーマ変更をリアルタイム反映
- ✅ すべてのテストがパスする（35件以上）

### 技術面

- ✅ レイヤー分離が維持されている
- ✅ TDDサイクルが守られている
- ✅ ビルドが成功する（popup.js追加）
- ✅ Chrome拡張として実用的に動作する

### ドキュメント

- ✅ README更新（Phase 2機能追加）
- ✅ ARCHITECTURE.md更新（state-manager追加）
- ✅ コミットメッセージが明確

---

## 次のセッションで開始すべきこと

1. **TDD開始**: `src/background/state-manager.test.ts`作成
2. **型定義確認**: `src/shared/types/state.ts`の内容を確認
3. **メッセージタイプ拡張**: GET_SETTINGS, UPDATE_SETTINGS追加

**最初のコマンド**:
```bash
# state-managerのテストファイル作成
touch src/background/state-manager.test.ts
touch src/background/state-manager.ts

# TDD Red Phase開始
deno test src/background/state-manager.test.ts
```

---

Phase 1で築いた堅固な基盤の上に、ユーザーが触れるUI層を実装していきます。
レイヤー分離とTDDの原則を守りながら、段階的に機能を追加していきましょう！
