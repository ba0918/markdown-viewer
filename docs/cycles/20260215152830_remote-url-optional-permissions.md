# Remote URL Support with Optional Permissions

**Cycle ID:** `20260215152830` **Started:** 2026-02-15 15:28:30 **Status:** 🟡
Planning

---

## 📝 What & Why

ローカルファイル専用のMarkdownビューアから、リモートURL（GitHub、GitLab等）にも対応できるよう機能を拡張する。ただし、セキュリティとプライバシーを最優先し、`all_urls`権限は絶対に使用せず、`optional_host_permissions`でユーザーが明示的に許可したドメインのみアクセスできるようにする。

## 🎯 Goals

- **セキュリティファースト**: `all_urls`使用禁止、optional permissionsのみ
- **ユーザー制御**: インストール時は権限要求なし、設定画面で必要に応じて許可
- **granular access control**: ドメインごとに細かく制御
- GitHub/GitLabなどのプリセット対応
- content scriptの動的登録/解除
- 権限の追加/削除がいつでも可能
- レイヤー分離原則を厳守
- 全テスト通過（Unit + E2E）

## 📐 Design

### Architecture Overview

```
┌─────────────────────────────────────────────────┐
│ 1. manifest.json                                │
│    - optional_host_permissions 定義              │
│    - scripting 権限追加                          │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ 2. settings/options/RemoteUrlSettings.tsx       │
│    - プリセット一覧表示（GitHub/GitLab等）      │
│    - 許可/取り消しボタン                         │
│    - 権限状態の表示                              │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ 3. chrome.permissions API                       │
│    - request(): ユーザーに許可を求める           │
│    - remove(): 許可を取り消す                    │
│    - getAll(): 現在の許可状態を取得              │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ 4. chrome.scripting.registerContentScripts()    │
│    - content scriptを動的に登録                  │
│    - 許可されたドメインのみ有効化                │
└─────────────────────────────────────────────────┘
```

### Files to Change/Add

```
manifest.json                    # (変更) optional_host_permissions, scripting権限追加

src/
  settings/
    options/
      components/
        RemoteUrlSettings.tsx    # (新規) リモートURL設定UIコンポーネント
      App.tsx                    # (変更) RemoteUrlSettings統合

  styles/
    components/
      remote-url-settings/
        base.css                 # (新規) リモートURL設定スタイル

tests/
  e2e/
    remote-url.spec.ts           # (新規) E2Eテスト
```

### Key Points

- **optional_host_permissions**:
  - インストール時は権限要求なし
  - ユーザーが設定画面で明示的に許可
  - プリセット（GitHub/GitLab等）とカスタムドメイン対応

- **プリセット一覧**:
  ```json
  [
    {
      "id": "github",
      "name": "GitHub",
      "origins": [
        "https://raw.githubusercontent.com/*",
        "https://gist.githubusercontent.com/*"
      ]
    },
    {
      "id": "gitlab",
      "name": "GitLab",
      "origins": ["https://gitlab.com/*"]
    }
  ]
  ```

- **content script動的登録**:
  - 許可時: `chrome.scripting.registerContentScripts()`
  - 取り消し時: `chrome.scripting.unregisterContentScripts()`

- **セキュリティ原則**:
  - ❌ `all_urls` 絶対使用禁止
  - ✅ optional_host_permissions のみ
  - ✅ ユーザーが明示的に許可
  - ✅ いつでも取り消し可能

## ✅ Tests

### E2E Tests (tests/e2e/remote-url.spec.ts)

- [ ] 設定画面にプリセット一覧が表示される
- [ ] GitHub presetが表示される（raw.githubusercontent.com,
      gist.githubusercontent.com）
- [ ] GitLab presetが表示される（gitlab.com）
- [ ] 「Grant Permission」ボタンが表示される
- [ ] 許可後に「Revoke Permission」ボタンに変わる
- [ ] セキュリティ情報ボックスが表示される
- [ ] 「all_urls」権限が使用されていないことを確認

## 🔒 Security

- [ ] `all_urls` 権限を絶対に使用しない
- [ ] `optional_host_permissions` のみ使用
- [ ] インストール時の権限警告なし
- [ ] ユーザーが明示的に許可した場合のみアクセス
- [ ] 権限をいつでも取り消し可能
- [ ] プライバシーポリシーに記載

## 📊 Progress

| Step                     | Status |
| ------------------------ | ------ |
| manifest.json更新        | ⚪     |
| RemoteUrlSettings UI実装 | ⚪     |
| プリセット定義           | ⚪     |
| 権限管理ロジック         | ⚪     |
| content script動的登録   | ⚪     |
| スタイリング             | ⚪     |
| Tests (E2E)              | ⚪     |
| Commit                   | ⚪     |

**Legend:** ⚪ Pending · 🟡 In Progress · 🟢 Done

---

## 📋 Implementation Details

### 1. manifest.json（変更部分）

```json
{
  "manifest_version": 3,
  "name": "Markdown Viewer - Simple & Secure",
  "version": "0.2.0",

  "permissions": [
    "storage",
    "activeTab",
    "scripting"
  ],

  "host_permissions": [
    "file:///*"
  ],

  "optional_host_permissions": [
    "https://raw.githubusercontent.com/*",
    "https://gist.githubusercontent.com/*",
    "https://gitlab.com/*",
    "https://*/*"
  ],

  "content_scripts": [{
    "matches": [
      "file://*/*.md",
      "file://*/*.markdown",
      "http://localhost:*/*.md",
      "http://localhost:*/*.markdown"
    ],
    "js": ["content.js"],
    "run_at": "document_start"
  }]
}
```

**重要な変更点**:

- `scripting` 権限追加（content script動的登録に必要）
- `optional_host_permissions` 追加（ユーザーが明示的に許可）
- `https://*/*` は最後のフォールバック（カスタムドメイン用）

### 2. settings/options/components/RemoteUrlSettings.tsx

```typescript
import { h } from "preact";
import { useEffect, useState } from "preact/hooks";

interface PermissionPreset {
  id: string;
  name: string;
  description: string;
  origins: string[];
  icon: string;
}

const PRESETS: PermissionPreset[] = [
  {
    id: "github",
    name: "GitHub",
    description: "View Markdown files from GitHub repositories",
    origins: [
      "https://raw.githubusercontent.com/*",
      "https://gist.githubusercontent.com/*",
    ],
    icon: "🐙",
  },
  {
    id: "gitlab",
    name: "GitLab",
    description: "View Markdown files from GitLab repositories",
    origins: [
      "https://gitlab.com/*",
    ],
    icon: "🦊",
  },
];

export const RemoteUrlSettings = () => {
  const [grantedPermissions, setGrantedPermissions] = useState<Set<string>>(
    new Set(),
  );

  useEffect(() => {
    // 現在の権限を取得
    chrome.permissions.getAll((permissions) => {
      const granted = new Set<string>();
      for (const preset of PRESETS) {
        const hasAll = preset.origins.every((origin) =>
          permissions.origins?.includes(origin)
        );
        if (hasAll) {
          granted.add(preset.id);
        }
      }
      setGrantedPermissions(granted);
    });
  }, []);

  const requestPermission = async (preset: PermissionPreset) => {
    const granted = await chrome.permissions.request({
      origins: preset.origins,
    });

    if (granted) {
      // content scriptを動的に登録
      await chrome.scripting.registerContentScripts([{
        id: `remote-${preset.id}`,
        matches: preset.origins.map((origin) => origin.replace(/\*$/, "*.md")),
        js: ["content.js"],
        runAt: "document_start",
      }]);

      setGrantedPermissions(new Set([...grantedPermissions, preset.id]));
    }
  };

  const revokePermission = async (preset: PermissionPreset) => {
    await chrome.permissions.remove({
      origins: preset.origins,
    });

    // content scriptを解除
    try {
      await chrome.scripting.unregisterContentScripts({
        ids: [`remote-${preset.id}`],
      });
    } catch (e) {
      // スクリプトが登録されてない場合は無視
    }

    const newPermissions = new Set(grantedPermissions);
    newPermissions.delete(preset.id);
    setGrantedPermissions(newPermissions);
  };

  return (
    <div class="remote-url-settings">
      <h2>🌐 Remote URL Support</h2>
      <p class="description">
        Optionally enable Markdown viewing from remote URLs.
        <br />
        <strong>Privacy First:</strong>{" "}
        Permissions are requested only when you need them.
      </p>

      <div class="presets">
        {PRESETS.map((preset) => {
          const isGranted = grantedPermissions.has(preset.id);

          return (
            <div key={preset.id} class="permission-card">
              <div class="card-header">
                <span class="icon">{preset.icon}</span>
                <h3>{preset.name}</h3>
                {isGranted && <span class="badge-granted">✅ Enabled</span>}
              </div>

              <p class="card-description">{preset.description}</p>

              <div class="card-origins">
                <strong>Domains:</strong>
                <ul>
                  {preset.origins.map((origin) => (
                    <li key={origin}>
                      <code>{origin}</code>
                    </li>
                  ))}
                </ul>
              </div>

              {isGranted
                ? (
                  <button
                    type="button"
                    class="btn btn-revoke"
                    onClick={() => revokePermission(preset)}
                  >
                    ❌ Revoke Permission
                  </button>
                )
                : (
                  <button
                    type="button"
                    class="btn btn-grant"
                    onClick={() => requestPermission(preset)}
                  >
                    ✅ Grant Permission
                  </button>
                )}
            </div>
          );
        })}
      </div>

      <div class="info-box">
        <h4>🔒 Security & Privacy</h4>
        <ul>
          <li>
            ✅ Permissions are <strong>optional</strong>{" "}
            - the extension works without them
          </li>
          <li>✅ You can revoke permissions anytime</li>
          <li>✅ We only request specific domains you choose</li>
          <li>
            ✅ No <code>all_urls</code>{" "}
            permission - your browsing data stays private
          </li>
          <li>✅ No tracking, no data collection</li>
        </ul>
      </div>
    </div>
  );
};
```

### 3. settings/options/App.tsx（変更部分）

```typescript
import { RemoteUrlSettings } from "./components/RemoteUrlSettings.tsx";

export const App = () => {
  return (
    <div class="options-container">
      <header>
        <h1>Markdown Viewer Settings</h1>
      </header>

      <main>
        {/* 既存の設定セクション */}
        <section>
          <h2>Appearance</h2>
          <ThemeSelector />
        </section>

        <section>
          <h2>Hot Reload</h2>
          <HotReloadSettings />
        </section>

        {/* 新規: リモートURL設定 */}
        <section>
          <RemoteUrlSettings />
        </section>
      </main>
    </div>
  );
};
```

### 4. styles/components/remote-url-settings/base.css

```css
.remote-url-settings {
  padding: 2rem;
}

.remote-url-settings .description {
  font-size: 0.95rem;
  color: #6b7280;
  margin-bottom: 2rem;
  line-height: 1.6;
}

.presets {
  display: grid;
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.permission-card {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1.5rem;
  background: #f9fafb;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.card-header .icon {
  font-size: 2rem;
}

.card-header h3 {
  margin: 0;
  font-size: 1.25rem;
  flex: 1;
}

.badge-granted {
  font-size: 0.875rem;
  color: #059669;
  font-weight: 600;
}

.card-description {
  color: #6b7280;
  margin-bottom: 1rem;
  font-size: 0.95rem;
}

.card-origins {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  padding: 1rem;
  margin-bottom: 1rem;
}

.card-origins strong {
  font-size: 0.875rem;
  color: #374151;
  display: block;
  margin-bottom: 0.5rem;
}

.card-origins ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.card-origins li {
  margin: 0.25rem 0;
}

.card-origins code {
  background: #f3f4f6;
  padding: 0.125rem 0.375rem;
  border-radius: 3px;
  font-size: 0.875rem;
  color: #1f2937;
}

.btn {
  width: 100%;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-grant {
  background: #10b981;
  color: white;
}

.btn-grant:hover {
  background: #059669;
}

.btn-revoke {
  background: #ef4444;
  color: white;
}

.btn-revoke:hover {
  background: #dc2626;
}

.info-box {
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  padding: 1.5rem;
}

.info-box h4 {
  margin: 0 0 1rem 0;
  color: #1e40af;
  font-size: 1rem;
}

.info-box ul {
  margin: 0;
  padding-left: 1.5rem;
  color: #1e3a8a;
}

.info-box li {
  margin: 0.5rem 0;
  font-size: 0.95rem;
}

.info-box code {
  background: white;
  padding: 0.125rem 0.375rem;
  border-radius: 3px;
  font-size: 0.875rem;
  color: #dc2626;
}
```

### 5. E2E テスト

**tests/e2e/remote-url.spec.ts**

```typescript
import { expect, test } from "./fixtures.ts";

test.describe("Remote URL Settings", () => {
  test("shows preset list", async ({ page, extensionId }) => {
    await page.goto(`chrome-extension://${extensionId}/options.html`);

    // GitHub preset
    await expect(page.locator("text=GitHub")).toBeVisible();
    await expect(page.locator("text=raw.githubusercontent.com")).toBeVisible();

    // GitLab preset
    await expect(page.locator("text=GitLab")).toBeVisible();
    await expect(page.locator("text=gitlab.com")).toBeVisible();
  });

  test("shows grant permission button", async ({ page, extensionId }) => {
    await page.goto(`chrome-extension://${extensionId}/options.html`);

    const grantButton = page.locator("button:has-text('Grant Permission')")
      .first();
    await expect(grantButton).toBeVisible();
  });

  test("shows security info box", async ({ page, extensionId }) => {
    await page.goto(`chrome-extension://${extensionId}/options.html`);

    await expect(page.locator("text=Security & Privacy")).toBeVisible();
    await expect(page.locator("text=No all_urls permission")).toBeVisible();
  });

  test("does not use all_urls permission", async ({ page, extensionId }) => {
    // manifest.jsonを確認
    const manifestUrl = `chrome-extension://${extensionId}/manifest.json`;
    const response = await page.goto(manifestUrl);
    const manifest = await response?.json();

    // all_urlsが使われていないことを確認
    expect(manifest.host_permissions).not.toContain("<all_urls>");
    expect(manifest.permissions).not.toContain("<all_urls>");
  });
});
```

---

## 🎯 Implementation Strategy

### Phase 1: Manifest & Types

1. `manifest.json` - optional_host_permissions, scripting権限追加

### Phase 2: UI層

2. `settings/options/components/RemoteUrlSettings.tsx` - 設定UIコンポーネント
3. `settings/options/App.tsx` - RemoteUrlSettings統合

### Phase 3: Styling

4. `src/styles/components/remote-url-settings/base.css` - スタイル実装

### Phase 4: E2Eテスト

5. `tests/e2e/remote-url.spec.ts` - E2Eテスト実装

---

## 📝 Notes

- **セキュリティ原則**: `all_urls` 絶対禁止、optional_host_permissions のみ
- **ユーザー体験**: インストール時は権限要求なし、設定画面で明示的に許可
- **プライバシー**: ユーザーが許可したドメインのみアクセス、いつでも取り消し可能
- **プリセット**: GitHub/GitLabを標準対応、将来的に追加可能
- **Chrome Web Store審査**: optional
  permissionsは高評価、all_urlsはreject可能性大

---

## 🔗 References

- [Chrome Permissions API](https://developer.chrome.com/docs/extensions/reference/api/permissions)
- [Optional Permissions Best Practices](https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions)
- [Content Scripts Dynamic Registration](https://developer.chrome.com/docs/extensions/reference/api/scripting#method-registerContentScripts)

---

**Next:** Write tests → Implement → Commit with `smart-commit` 🚀
