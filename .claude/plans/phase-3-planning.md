# Phase 3 実装計画: Options UI & Hot Reload

## 📋 Phase 3 の目標

1. **詳細設定ページ (Options UI)** の実装
2. **追加テーマ 4種** の実装
3. **Hot Reload 機能** の実装

---

## 🎯 Step 1: テーマシステムの拡張

### 1.1 新規テーマの追加

#### 実装ファイル

- `src/content/styles/themes/github.css` (NEW)
- `src/content/styles/themes/minimal.css` (NEW)
- `src/content/styles/themes/solarized-light.css` (NEW)
- `src/content/styles/themes/solarized-dark.css` (NEW)

#### 作業内容

1. **GitHub テーマ** (`github.css`)
   - 背景: `#ffffff`
   - テキスト: `#24292e`
   - リンク: `#0366d6`
   - コードブロック背景: `#f6f8fa`
   - ボーダー: `#e1e4e8`

2. **Minimal テーマ** (`minimal.css`)
   - 背景: `#fafafa`
   - テキスト: `#333333`
   - 最小限の装飾、シンプルなタイポグラフィ重視

3. **Solarized Light テーマ** (`solarized-light.css`)
   - 背景: `#fdf6e3`
   - テキスト: `#657b83`
   - アクセント: `#268bd2`, `#2aa198`, `#859900`

4. **Solarized Dark テーマ** (`solarized-dark.css`)
   - 背景: `#002b36`
   - テキスト: `#839496`
   - アクセント: `#268bd2`, `#2aa198`, `#859900`

### 1.2 Theme型定義の拡張

#### ファイル: `src/shared/types/theme.ts`

```typescript
export type Theme =
  | 'light'
  | 'dark'
  | 'github'
  | 'minimal'
  | 'solarized-light'
  | 'solarized-dark';
```

### 1.3 Theme Loaderの更新

#### ファイル: `src/domain/theme/loader.ts`

**既存の THEMES ディクショナリに追加**:

```typescript
const THEMES: Record<Theme, ThemeConfig> = {
  light: { id: 'light', name: 'Light', cssPath: 'content/styles/themes/light.css' },
  dark: { id: 'dark', name: 'Dark', cssPath: 'content/styles/themes/dark.css' },
  github: { id: 'github', name: 'GitHub', cssPath: 'content/styles/themes/github.css' },
  minimal: { id: 'minimal', name: 'Minimal', cssPath: 'content/styles/themes/minimal.css' },
  'solarized-light': { id: 'solarized-light', name: 'Solarized Light', cssPath: 'content/styles/themes/solarized-light.css' },
  'solarized-dark': { id: 'solarized-dark', name: 'Solarized Dark', cssPath: 'content/styles/themes/solarized-dark.css' },
};
```

### 1.4 ビルドスクリプトの更新

#### ファイル: `scripts/build.ts`

**新規CSSファイルのコピー処理を追加**:

```typescript
// CSSファイルをdist/にコピー
console.log('🎨 Copying CSS files...');
await Deno.mkdir('dist/content/styles/themes', { recursive: true });

const themes = ['light', 'dark', 'github', 'minimal', 'solarized-light', 'solarized-dark'];
for (const theme of themes) {
  await Deno.copyFile(
    `src/content/styles/themes/${theme}.css`,
    `dist/content/styles/themes/${theme}.css`
  );
}
console.log('✅ CSS files copied');
```

### 1.5 テスト追加

#### ファイル: `src/domain/theme/loader.test.ts`

**新規テーマのバリデーションテスト**:

```typescript
Deno.test('loadTheme: GitHub テーマの読み込み', async () => {
  const theme = await loadTheme('github');
  assertEquals(theme.id, 'github');
  assertEquals(theme.name, 'GitHub');
  assert(theme.cssPath.includes('github.css'));
});

// minimal, solarized-light, solarized-dark も同様に追加
```

---

## 🎨 Step 2: Options UI の実装

### 2.1 ディレクトリ構造

```
src/settings/options/
  ├── index.tsx              # エントリーポイント
  ├── App.tsx                # メインコンポーネント
  └── components/
      ├── ThemeSelector.tsx  # テーマ選択（拡張版）
      └── HotReloadSettings.tsx  # Hot Reload設定
```

### 2.2 コンポーネント実装

#### 2.2.1 `src/settings/options/index.tsx` (NEW)

**Popup と同じパターン**:

```typescript
import { h, render } from 'preact';
import { App } from './App.tsx';

const root = document.getElementById('app');
if (root) {
  render(<App />, root);
} else {
  console.error('Failed to find #app element');
}
```

#### 2.2.2 `src/settings/options/App.tsx` (NEW)

**Popup.App.tsx を参考にした実装**:

```typescript
import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { sendMessage } from '../../messaging/client.ts';
import { ThemeSelector } from './components/ThemeSelector.tsx';
import { HotReloadSettings } from './components/HotReloadSettings.tsx';
import type { AppState } from '../../shared/types/state.ts';
import type { Theme } from '../../shared/types/theme.ts';

/**
 * Options メインコンポーネント
 *
 * 責務: messaging I/O のみ、UI状態管理
 * レイヤー: settings/options層
 *
 * ❌ 絶対禁止: services/domain直接呼び出し
 * ✅ OK: messaging経由でのみ通信
 */
export const App = () => {
  const [settings, setSettings] = useState<AppState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await sendMessage<AppState>({
        type: 'GET_SETTINGS',
        payload: {},
      });
      setSettings(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleThemeChange = async (theme: Theme) => {
    try {
      setError(null);
      await sendMessage({
        type: 'UPDATE_THEME',
        payload: { themeId: theme },
      });
      setSettings({ ...settings!, theme });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update theme');
    }
  };

  const handleHotReloadChange = async (hotReload: AppState['hotReload']) => {
    try {
      setError(null);
      await sendMessage({
        type: 'UPDATE_SETTINGS',
        payload: { hotReload },
      });
      setSettings({ ...settings!, hotReload });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update hot reload settings');
    }
  };

  if (loading) {
    return (
      <div class="options-page">
        <div class="loading">読み込み中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div class="options-page">
        <div class="error">
          エラー: {error}
          <button onClick={loadSettings} class="retry-btn">
            再試行
          </button>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div class="options-page">
        <div class="error">設定を読み込めませんでした</div>
      </div>
    );
  }

  return (
    <div class="options-page">
      <header class="header">
        <h1 class="title">🎨 Markdown Viewer - 詳細設定</h1>
      </header>

      <main class="content">
        <section class="section">
          <h2 class="section-title">テーマ</h2>
          <ThemeSelector current={settings.theme} onChange={handleThemeChange} />
        </section>

        <section class="section">
          <h2 class="section-title">Hot Reload</h2>
          <HotReloadSettings
            config={settings.hotReload}
            onChange={handleHotReloadChange}
          />
        </section>
      </main>

      <footer class="footer">
        <div class="version">v0.3.0 (Phase 3)</div>
      </footer>
    </div>
  );
};
```

#### 2.2.3 `src/settings/options/components/ThemeSelector.tsx` (NEW)

**全6テーマ対応版**:

```typescript
import { h } from 'preact';
import type { Theme } from '../../../shared/types/theme.ts';

interface ThemeSelectorProps {
  current: Theme;
  onChange: (theme: Theme) => void;
}

/**
 * テーマ選択コンポーネント（詳細版）
 *
 * 責務: 全テーマの表示と選択UIのみ
 * レイヤー: ui-components層
 */
export const ThemeSelector = ({ current, onChange }: ThemeSelectorProps) => {
  const themes: { id: Theme; label: string; emoji: string; description: string }[] = [
    { id: 'light', label: 'Light', emoji: '☀️', description: '明るいテーマ' },
    { id: 'dark', label: 'Dark', emoji: '🌙', description: '暗いテーマ' },
    { id: 'github', label: 'GitHub', emoji: '🐙', description: 'GitHub風のテーマ' },
    { id: 'minimal', label: 'Minimal', emoji: '📄', description: 'ミニマルなテーマ' },
    { id: 'solarized-light', label: 'Solarized Light', emoji: '🌞', description: 'Solarized明るいテーマ' },
    { id: 'solarized-dark', label: 'Solarized Dark', emoji: '🌚', description: 'Solarized暗いテーマ' },
  ];

  return (
    <div class="theme-selector">
      <div class="theme-grid">
        {themes.map((theme) => (
          <button
            key={theme.id}
            class={`theme-card ${current === theme.id ? 'active' : ''}`}
            onClick={() => onChange(theme.id)}
            type="button"
          >
            <span class="emoji">{theme.emoji}</span>
            <span class="label">{theme.label}</span>
            <span class="description">{theme.description}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
```

#### 2.2.4 `src/settings/options/components/HotReloadSettings.tsx` (NEW)

```typescript
import { h } from 'preact';
import type { AppState } from '../../../shared/types/state.ts';

interface HotReloadSettingsProps {
  config: AppState['hotReload'];
  onChange: (config: AppState['hotReload']) => void;
}

/**
 * Hot Reload設定コンポーネント
 *
 * 責務: Hot Reload設定UIのみ
 * レイヤー: ui-components層
 */
export const HotReloadSettings = ({ config, onChange }: HotReloadSettingsProps) => {
  const handleEnabledChange = (enabled: boolean) => {
    onChange({ ...config, enabled });
  };

  const handleIntervalChange = (interval: number) => {
    onChange({ ...config, interval });
  };

  const handleAutoReloadChange = (autoReload: boolean) => {
    onChange({ ...config, autoReload });
  };

  return (
    <div class="hot-reload-settings">
      <div class="setting-row">
        <label class="label">
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={(e) => handleEnabledChange((e.target as HTMLInputElement).checked)}
          />
          <span>Hot Reload を有効化</span>
        </label>
      </div>

      {config.enabled && (
        <>
          <div class="setting-row">
            <label class="label">
              チェック間隔（ミリ秒）
              <input
                type="number"
                value={config.interval}
                onChange={(e) => handleIntervalChange(Number((e.target as HTMLInputElement).value))}
                min="1000"
                max="60000"
                step="1000"
              />
            </label>
            <span class="hint">推奨: 3000ms (3秒)</span>
          </div>

          <div class="setting-row">
            <label class="label">
              <input
                type="checkbox"
                checked={config.autoReload}
                onChange={(e) => handleAutoReloadChange((e.target as HTMLInputElement).checked)}
              />
              <span>ファイル変更時に自動リロード</span>
            </label>
          </div>
        </>
      )}
    </div>
  );
};
```

### 2.3 options.html の更新

#### ファイル: `options.html`

**Phase 1のプレースホルダーを実際のUIに置き換え**:

```html
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Markdown Viewer - 詳細設定</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f5f5;
      color: #333;
      line-height: 1.6;
    }

    .options-page {
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
    }

    .header {
      margin-bottom: 32px;
    }

    .title {
      font-size: 28px;
      font-weight: 600;
      color: #1a1a1a;
    }

    .content {
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      padding: 32px;
    }

    .section {
      margin-bottom: 32px;
    }

    .section:last-child {
      margin-bottom: 0;
    }

    .section-title {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 16px;
      color: #1a1a1a;
    }

    /* Theme Selector Styles */
    .theme-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 16px;
    }

    .theme-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 20px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      background: white;
      cursor: pointer;
      transition: all 0.2s;
    }

    .theme-card:hover {
      border-color: #007bff;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 123, 255, 0.15);
    }

    .theme-card.active {
      border-color: #007bff;
      background: #f0f8ff;
    }

    .theme-card .emoji {
      font-size: 32px;
      margin-bottom: 8px;
    }

    .theme-card .label {
      font-weight: 600;
      margin-bottom: 4px;
    }

    .theme-card .description {
      font-size: 12px;
      color: #666;
      text-align: center;
    }

    /* Hot Reload Settings Styles */
    .hot-reload-settings {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .setting-row {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .setting-row .label {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 500;
    }

    .setting-row input[type="checkbox"] {
      width: 18px;
      height: 18px;
      cursor: pointer;
    }

    .setting-row input[type="number"] {
      width: 150px;
      padding: 8px 12px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
      margin-top: 4px;
    }

    .setting-row .hint {
      font-size: 12px;
      color: #666;
    }

    /* Loading & Error States */
    .loading, .error {
      text-align: center;
      padding: 40px;
      font-size: 16px;
    }

    .error {
      color: #dc3545;
    }

    .retry-btn {
      margin-top: 16px;
      padding: 8px 16px;
      background: #007bff;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }

    .retry-btn:hover {
      background: #0056b3;
    }

    .footer {
      margin-top: 32px;
      text-align: center;
      color: #666;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div id="app"></div>
  <script src="options.js"></script>
</body>
</html>
```

### 2.4 ビルドスクリプトの更新

#### ファイル: `scripts/build.ts`

**Options Script のビルド追加**:

```typescript
// Options Script
console.log('📦 Building options script...');
await esbuild.build({
  ...commonConfig,
  entryPoints: ['src/settings/options/index.tsx'],
  outfile: 'dist/options.js',
  platform: 'browser'
});
console.log('✅ options.js built');
```

---

## ⚡ Step 3: Hot Reload 機能の実装

### 3.1 File Watcher Domain の追加

#### ファイル: `src/domain/file-watcher/file-watcher.ts` (NEW)

```typescript
/**
 * ファイル変更検知ドメイン
 *
 * 責務: document.lastModified を使ったファイル変更検知ロジック
 * レイヤー: domain層
 *
 * ❌ 絶対禁止: Chrome API、UI操作、副作用
 * ✅ OK: 純粋なビジネスロジック
 */

/**
 * 現在のドキュメントの最終更新日時を取得
 */
export const getLastModified = (): Date => {
  return new Date(document.lastModified);
};

/**
 * ファイルが変更されたかチェック
 *
 * @param previousModified 前回の最終更新日時
 * @returns 変更されていればtrue
 */
export const hasFileChanged = (previousModified: Date): boolean => {
  const current = getLastModified();
  return current.getTime() > previousModified.getTime();
};
```

#### ファイル: `src/domain/file-watcher/file-watcher.test.ts` (NEW)

```typescript
import { assertEquals } from '@std/assert';
import { hasFileChanged } from './file-watcher.ts';

Deno.test('hasFileChanged: ファイル変更なし', () => {
  const now = new Date();
  const result = hasFileChanged(now);
  assertEquals(result, false);
});

Deno.test('hasFileChanged: ファイルが変更されている', () => {
  const pastDate = new Date(Date.now() - 10000); // 10秒前
  // document.lastModified は現在時刻なので、過去の日時と比較すればtrue
  const result = hasFileChanged(pastDate);
  assertEquals(result, true);
});
```

### 3.2 Content Script への Hot Reload 実装

#### ファイル: `src/content/index.ts`

**既存の init() に Hot Reload ロジックを追加**:

```typescript
import { sendMessage } from '../messaging/client.ts';
import type { AppState } from '../shared/types/state.ts';
import type { Theme } from '../shared/types/theme.ts';
import { getLastModified, hasFileChanged } from '../domain/file-watcher/file-watcher.ts';

declare const chrome: {
  storage: {
    onChanged: {
      addListener: (
        callback: (changes: Record<string, { newValue: unknown; oldValue: unknown }>, area: string) => void
      ) => void;
    };
  };
};

let currentMarkdown = '';
let lastModified: Date | null = null;
let hotReloadIntervalId: number | null = null;

/**
 * Markdown を描画
 */
const renderMarkdown = async (markdown: string, theme: Theme) => {
  try {
    const html = await sendMessage<string>({
      type: 'RENDER_MARKDOWN',
      payload: { markdown, themeId: theme },
    });

    document.body.innerHTML = html;
  } catch (error) {
    console.error('Failed to render markdown:', error);
    document.body.innerHTML = '<div class="error">Failed to render markdown</div>';
  }
};

/**
 * Hot Reload の開始
 */
const startHotReload = (interval: number, autoReload: boolean) => {
  // 既存のインターバルをクリア
  if (hotReloadIntervalId !== null) {
    clearInterval(hotReloadIntervalId);
  }

  lastModified = getLastModified();

  hotReloadIntervalId = setInterval(() => {
    if (hasFileChanged(lastModified!)) {
      console.log('File changed detected, reloading...');
      lastModified = getLastModified();

      if (autoReload) {
        window.location.reload();
      } else {
        // 通知のみ（将来的にはトースト通知を実装）
        console.log('File changed. Auto-reload is disabled.');
      }
    }
  }, interval);
};

/**
 * Hot Reload の停止
 */
const stopHotReload = () => {
  if (hotReloadIntervalId !== null) {
    clearInterval(hotReloadIntervalId);
    hotReloadIntervalId = null;
  }
};

/**
 * 初期化処理
 */
const init = async () => {
  try {
    currentMarkdown = document.body.textContent || '';

    const settings = await sendMessage<AppState>({
      type: 'GET_SETTINGS',
      payload: {},
    });

    await renderMarkdown(currentMarkdown, settings.theme);

    // Hot Reload の初期化
    if (settings.hotReload.enabled) {
      startHotReload(settings.hotReload.interval, settings.hotReload.autoReload);
    }

    // Chrome Storage の変更を監視
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'sync' && changes.appState) {
        const newState = changes.appState.newValue as AppState;

        // テーマ変更の反映
        renderMarkdown(currentMarkdown, newState.theme);

        // Hot Reload 設定の反映
        if (newState.hotReload.enabled) {
          startHotReload(newState.hotReload.interval, newState.hotReload.autoReload);
        } else {
          stopHotReload();
        }
      }
    });
  } catch (error) {
    console.error('Failed to initialize content script:', error);
    document.body.innerHTML = '<div class="error">Failed to initialize</div>';
  }
};

init();
```

---

## 📝 実装順序

### Phase 3-1: テーマシステム拡張 (1日目)

1. **型定義の更新**
   - `src/shared/types/theme.ts` に 4テーマ追加
   - ビルドエラー確認（全ての switch 文で網羅性チェック）

2. **CSSファイルの作成**
   - `github.css`, `minimal.css`, `solarized-light.css`, `solarized-dark.css` を作成
   - 既存の `light.css` を参考に構造を統一

3. **Theme Loader の更新**
   - `src/domain/theme/loader.ts` の THEMES に追加
   - テスト追加 (`loader.test.ts`)

4. **ビルドスクリプト更新**
   - `scripts/build.ts` で新規CSSをコピー

5. **動作確認**
   - `deno task build`
   - Chrome拡張で新テーマを手動テスト

### Phase 3-2: Options UI 実装 (2日目)

1. **コンポーネント作成**
   - `src/settings/options/index.tsx`
   - `src/settings/options/App.tsx`
   - `src/settings/options/components/ThemeSelector.tsx`
   - `src/settings/options/components/HotReloadSettings.tsx`

2. **options.html 更新**
   - プレースホルダーを実際のUIに置き換え
   - スタイリング完成

3. **ビルドスクリプト更新**
   - `scripts/build.ts` に options.js ビルド追加

4. **動作確認**
   - `deno task build`
   - `chrome://extensions/` → 拡張のオプションページを開く
   - 全設定が正しく動作するか確認

### Phase 3-3: Hot Reload 実装 (3日目)

1. **File Watcher Domain 作成 (TDD)**
   - **RED**: `src/domain/file-watcher/file-watcher.test.ts` 作成
   - **GREEN**: `src/domain/file-watcher/file-watcher.ts` 実装
   - テスト実行: `deno task test`

2. **Content Script 更新**
   - `src/content/index.ts` に Hot Reload ロジック追加
   - `startHotReload()`, `stopHotReload()` 実装
   - Storage 変更リスナーで Hot Reload 設定の反映

3. **動作確認**
   - `deno task build`
   - `.md` ファイルを開く
   - Options で Hot Reload を有効化
   - ファイルを編集して自動リロードを確認

4. **エッジケースのテスト**
   - 間隔変更時の挙動
   - 有効/無効の切り替え
   - autoReload の ON/OFF

---

## ✅ Phase 3 完了条件

- [ ] 6種類のテーマが全て動作する
- [ ] Options UI で全設定が変更可能
- [ ] Hot Reload が正しく動作する
- [ ] 全テストが通過 (domain/file-watcher/file-watcher.test.ts を含む)
- [ ] `deno task build` がエラーなし
- [ ] Chrome拡張として読み込んで動作確認完了

---

## 🚨 注意事項

### レイヤー分離の厳守

- **Options UI層** → messaging I/O のみ
- **File Watcher Domain層** → 純粋関数のみ、Chrome API禁止
- **Content Script層** → messaging + domain 呼び出しのみ

### TDD の徹底

- File Watcher Domain は必ず **Red-Green-Refactor** で実装
- テストが通らない実装は本番に含めない

### セキュリティ

- Hot Reload で `window.location.reload()` を使用
- `eval()` や動的スクリプト注入は絶対禁止

### パフォーマンス

- Hot Reload の interval は最小 1000ms (1秒)
- `setInterval` の適切なクリーンアップ

---

## 📚 参考資料

- `docs/ARCHITECTURE.md` - レイヤー分離の詳細
- `docs/CODING_PRINCIPLES.md` - TDD サイクル
- `spec.md` - Phase 3 の機能仕様

---

**Phase 3 実装計画 完成！🎉**
