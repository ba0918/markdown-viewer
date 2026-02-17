# アーキテクチャ決定記録（ADR）

このドキュメントでは、重要なアーキテクチャの決定事項と、その理由を記録します。

## ADR-001: domain/層の導入

### 日付

2026-02-07

### ステータス

承認済み

### コンテキスト

初期設計では、ビジネスロジックの配置場所が不明確でした：

- `content/markdown/` にMarkdown処理
- `shared/utils/security/` にセキュリティ処理
- ビジネスロジックがUI層と汎用層に散在

### 問題点

1. **レイヤー混同**: UIコンポーネント内にビジネスロジックが混入しやすい
2. **テスト困難**: ビジネスロジックがUI層と密結合
3. **再利用性低下**: 同じロジックを複数箇所に記述
4. **責務不明確**: 「ビジネスロジックはどこに置くべきか」が不明

### 決定

**`domain/`層を新設し、ビジネスロジックを集約する。**

```
src/
  domain/              # ビジネスロジック層
    markdown/
    theme/
    file-watcher/
```

### 理由

1. **責務の明確化**: ビジネスロジックの置き場所が明確
2. **テスト容易性**: UI層から分離され、純粋関数としてテスト可能
3. **再利用性向上**: 複数のUI層（content, popup, options）から参照可能
4. **DDD（ドメイン駆動設計）**: ドメインロジックをドメイン層に配置

### 影響

- `content/markdown/` → `domain/markdown/` に移動
- `shared/utils/security/sanitizer.ts` → `domain/markdown/sanitizer.ts` に移動
- UI層は`domain/`を使用するように変更

### 代替案

1. **services/層**: より一般的な命名だが、ドメインロジックを表現しにくい
2. **現状維持**: `content/markdown/`のまま → ドメインロジックとUI層の境界が曖昧

---

## ADR-002: settings/層による popup/ と options/ の統合

### 日付

2026-02-07

### ステータス

承認済み（2026-02-07更新: `ui/` → `settings/` に命名変更）

### コンテキスト

初期設計では、`popup/`と`options/`が並列に配置されていました：

```
src/
  popup/
  options/
```

### 問題点

1. **ドメイン重複**: 両方とも「設定UI」という同じドメイン
2. **コード重複**: ThemeSelectorなどの共通コンポーネントが重複
3. **境界不明確**: popup/optionsの違いが構造から理解しにくい

### 決定

**`settings/`層を新設し、popup/optionsを統合管理する。**

```
src/
  settings/
    popup/
    options/
```

### 理由

1. **ドメイン統合**: 「設定UI」として論理的に統合
2. **意図の明確化**: `ui/`より`settings/`の方が用途が明確
3. **Chrome拡張の制約を明示**:
   manifest.jsonの制約による物理的分離を保ちつつ、論理的に統合

### 影響

- `popup/` → `settings/popup/` に移動
- `options/` → `settings/options/` に移動

### 代替案

1. **ui/層**: より一般的だが、意図が曖昧
2. **完全統合**: popup.tsxとoptions.tsxをsettings/に配置 →
   manifest.jsonの制約を隠蔽しすぎる

---

## ADR-003: shared/層からドメインロジックを排除

### 日付

2026-02-07

### ステータス

承認済み

### コンテキスト

初期設計では、`shared/utils/security/`にDOMPurifyのラッパーが配置されていました。

### 問題点

1. **責務混同**: セキュリティはMarkdownドメインのロジック
2. **依存関係**: `shared/`がMarkdown固有の処理を含む
3. **再利用性**: 実際には他のドメインで再利用されない

### 決定

**`shared/`層はドメイン非依存な汎用ユーティリティのみ配置する。**

ドメイン固有のロジック（Markdown、テーマ、ファイル監視）は`domain/`層に配置。

### 理由

1. **単一責任**: `shared/`は純粋な汎用処理のみ
2. **依存関係の整理**: `shared/`は他のどの層にも依存しない
3. **テスト容易性**: ドメインロジックとユーティリティを明確に分離

### 影響

- `shared/utils/security/sanitizer.ts` → `domain/markdown/sanitizer.ts`
- `shared/utils/hash.ts` → `domain/file-watcher/hash.ts`

---

## ADR-004: レイヤー依存関係の厳格化

### 日付

2026-02-07

### ステータス

承認済み

### 決定

以下の依存関係ルールを厳格に適用する：

```
UI層        → domain層 → shared層
             ↗
messaging層
background層
```

### ルール

1. **上位層 → 下位層のみ許可**
   - `content/` → `domain/` → `shared/` ✅
   - `shared/` → `domain/` ❌

2. **横方向の依存は禁止**
   - `background/` → `content/` ❌
   - `popup/` → `options/` ❌

3. **循環依存は絶対禁止**
   - A → B → A ❌

### 強制方法

- コードレビュー時にimport文を確認
- 将来的に`deno lint`のカスタムルールで自動検出

---

## ADR-005: ui-components/層の導入

### 日付

2026-02-07

### ステータス

承認済み

### コンテキスト

Content
Script、Popup、Optionsの各UI層で、同じUIコンポーネント（ThemeSelector、CodeBlockなど）が重複する問題が発生していました。

### 問題点

1. **UI層間でのコード重複**: 同じコンポーネントを複数箇所に実装
2. **責務の曖昧さ**: `settings/shared/components/`だと「設定画面専用」に見える
3. **Content Scriptでの再利用不可**:
   `settings/`配下だと、content層から使いにくい

### 決定

**`ui-components/`層を新設し、全UI層で共有するUIパーツを配置する。**

```
src/
  ui-components/
    markdown/      # Markdown表示用（CodeBlock, MermaidDiagramなど）
    settings/      # 設定画面用（ThemeSelector, ToggleButtonなど）
    shared/        # 汎用UI（Button, Select, Formなど）
```

### 理由

1. **完全な再利用性**: content/settings 両方から利用可能
2. **責務の明確化**: 「純粋なUIパーツ集」として独立
3. **用途別分類**: markdown/settings/shared で用途が明確

### 影響

- 共通UIコンポーネントを`ui-components/`に集約
- content/settings 各層は`ui-components/`をimport

---

## ADR-006: services/層の導入（ドメイン組み合わせ層）

### 日付

2026-02-07

### ステータス

承認済み

### コンテキスト

複雑なChrome拡張機能では、以下のメッセージフローが発生します：

```
content <--> background
content <--> background <--> offscreen
```

過去のプロジェクト（DuckDB +
offscreen）で、**messaging層にビジネスロジックを混在させた結果、管理不能になり不具合が多発**した経験があります。

### 問題点

1. **責務の混在**:
   messaging層が「ルーティング」と「ビジネスロジック」の両方を担う
2. **複雑化**: offscreenが絡むとメッセージ経路が複雑怪奇になる
3. **テスト困難**: messagingの仕組みごとテストする必要がある
4. **ドメイン組み合わせの所在不明**:
   複数domainを組み合わせる処理をどこに書くべきか不明

### 決定

**`services/`層を新設し、ドメイン組み合わせとビジネスフローを担当させる。**

実行コンテキスト層（background/content/offscreen/settings）は、**messagingとのやり取りのみ**に専念させる。

```
src/
  background/        # messagingのみ（ビジネスロジック禁止）
  content/           # messagingのみ（ビジネスロジック禁止）
  offscreen/         # messagingのみ（ビジネスロジック禁止）
  settings/          # messagingのみ（ビジネスロジック禁止）

  messaging/         # ルーティングのみ（ビジネスロジック禁止）
    handlers/        # serviceへの委譲のみ

  services/          # ✅ ドメイン組み合わせ + ビジネスフロー
    markdown-service.ts
    theme-service.ts
    file-watch-service.ts

  domain/            # ✅ 純粋なビジネスロジック（単一責任）
    markdown/
    theme/
    file-watcher/
```

### メッセージフロー

```
# シンプルケース
content → background → messaging/handler → service → domain

# 複雑ケース（offscreen）
content → background → offscreen → messaging/handler → service → domain
```

### 各層の厳格な責務定義

| 層                                        | 責務                                | ❌ 禁止事項                          |
| ----------------------------------------- | ----------------------------------- | ------------------------------------ |
| **background/content/offscreen/settings** | messagingとのやり取り"のみ"         | ビジネスロジック、ドメイン組み合わせ |
| **messaging/handlers/**                   | ルーティング"のみ"、serviceへの委譲 | ビジネスロジック、domain直接呼び出し |
| **services/**                             | ドメイン組み合わせ、ビジネスフロー  | Chrome API直接使用、UI処理           |
| **domain/**                               | 純粋なビジネスロジック（単一責任）  | 他domainへの依存、副作用の隠蔽       |

### 理由

1. **責務の完全分離**: messaging層はルーティングのみ、services層がビジネスフロー
2. **offscreen対応**: 複雑なメッセージ経路でも破綻しない
3. **テスト容易性**: services/domain は純粋関数としてテスト可能
4. **過去の失敗からの学習**: messagingにビジネスロジックを持たせない

### 影響

- 既存の複雑なロジックを`services/`に移動
- `messaging/handlers/`はシンプルなルーティングのみに
- `background/content/offscreen/settings`は messagingとのI/Oのみに

### 代替案

1. **messaging層が担う**: シンプルだが、責務混在で複雑化する（過去に失敗）
2. **background/orchestrators/**: background層が太る、offscreen考慮が不十分
3. **usecase層**: 過剰な抽象化、domain層との境界が曖昧

---

## 解決済みの議論

### ~~議題1: ui/層の命名~~

- **決定**: `settings/` に決定（ADR-002参照）
- **理由**: 意図が明確、Chrome拡張の用語との整合性

### ~~議題2: domain/層の粒度~~

- **決定**: 現状維持（`domain/markdown/`, `domain/theme/`,
  `domain/file-watcher/`）
- **理由**: 適切な粒度、将来的な拡張性も十分

### ~~議題3: ドメイン組み合わせの責務~~

- **決定**: `services/`層を新設（ADR-006参照）
- **理由**: offscreen対応、責務の明確化、過去の失敗からの学習

---

## ADR-007: レイヤールールの実用的例外

### 日付

2026-02-15

### ステータス

承認済み

### コンテキスト

ADR-004で定めたレイヤー依存関係ルールは厳格に運用されてきましたが、実装を進める中で以下のケースで厳格すぎるルールが開発効率を阻害することが判明しました。

### 許容される例外

#### 1. 軽量なdomain関数のmessaging直接呼び出し

```typescript
// ✅ OK: 軽量なルックアップ関数は直接呼び出し可
const theme = loadTheme(message.payload.themeId);
```

**理由**: `loadTheme()`
は純粋なマッピング関数であり、services層を経由させるとボイラープレートが増えるだけで利点がない。

#### 2. DOM操作系domainのcontent直接呼び出し

```typescript
// ✅ OK: ブラウザ専用APIはcontent層から直接呼び出し可
renderMath(containerRef.current);
const svg = await renderMermaid(code, theme);
```

**理由**:
MathJax/Mermaidはブラウザ環境でのみ動作し、DOM要素を直接操作する。messaging経由は技術的に不可能（DOM参照をシリアライズできない）。

#### 3. UIローカル状態のchrome.storage直接

```typescript
// ✅ OK: UIコンポーネント内の状態永続化は直接chrome.storage使用可
chrome.storage.sync.set({ tocState: newState });
```

**理由**:
ToC幅やトグル状態はUIローカルの表示状態であり、ビジネスロジックではない。StateManager経由は過剰。

#### 4. chrome.runtime.getURL()

```typescript
// ✅ OK: 全層で許可（services層を含む）
const cssUrl = chrome.runtime.getURL(`content/styles/themes/${theme}.css`);
```

**理由**: 静的リソースパス取得は副作用のないユーティリティ関数と同等。

#### 5. TOC生成domain関数のcontent直接呼び出し

```typescript
// ✅ OK: domain純粋関数の組み合わせは直接呼び出し可
const headings = extractHeadings(markdown);
const normalized = normalizeHeadingLevels(headings);
const items = buildTocTree(normalized);
```

**理由**: TOC生成は`extractHeadings` → `normalizeHeadingLevels` →
`buildTocTree`の3つの純粋関数の組み合わせ。
services層（TocService）はこれらを呼ぶだけでビジネスロジックを追加していないため、
content層から直接呼び出しても判断基準1（副作用がない）を満たす。

### 判断基準

例外を適用するかの判断基準:

1. **副作用がない or 最小限か**: 純粋関数やルックアップはOK
2. **技術的に他の方法が不可能か**: DOM参照のシリアライズ不可等
3. **ビジネスロジックではないか**: UI表示状態の永続化はOK
4. **services層を経由する利点があるか**:
   ボイラープレートが増えるだけならスキップ

### 影響

- CLAUDE.md に「許容される例外」セクションを追加
- コードレビュー時に上記基準で判断

### 注意

例外は **最小限**
に留めること。判断に迷う場合は、原則に従ってservices/messaging経由にする。

---

## ADR-008: Export HTML機能の一時無効化とデッドコード保持

### 日付

2026-02-17

### ステータス

承認済み

### コンテキスト

Export HTML機能（DocumentHeaderMenu, ExportMenuItem）はContent ScriptのIsolated
Worldにおける Blob
URL問題（オリジンがnullで`<a download>`が機能しない）を回避するため、
chrome.downloads
APIを使用する実装になっていた。しかし、ストア公開時の権限削減方針により
downloads権限を削除した結果、Background
Script経由のダウンロード方式に変更したが、
一部エッジケースで不安定なため一時無効化している。

### 決定

- **コード保持**: DocumentHeaderMenu.tsx, ExportMenuItem.tsx, export-service.ts,
  html-exporter.ts, base64-encoder.tsは削除せず保持する
- **importコメントアウト**: MarkdownViewer.tsxのimportをコメントアウトで無効化
- **復活条件**: Blob URL問題の代替解決策が見つかった場合
- **期限**: 次回メジャーバージョンアップ（v2.0）時に削除判断

### 復活時の必須対応

1. ExportMenuItem.tsxのmessaging直接importをコールバックprops経由に変更（レイヤー違反解消）
2. exportAsHTML()の引数htmlにsanitizeHTML()を適用（XSS防止）
3. E2Eテスト（html-export.spec.ts）の有効化と更新

## 将来的な検討事項

### usecase層の導入

- **現状**: services層でドメイン組み合わせを実現
- **検討タイミング**: 以下の場合に再検討
  1. services層に複雑なビジネスフローが増えすぎた
  2. services層とdomain層の境界が曖昧になってきた
  3. 同じビジネスフローパターンが複数箇所で重複
- **過去の経験**: usecase層は扱いが難しかった（境界が曖昧、過度な抽象化）
- **方針**: YAGNI原則で、必要になってから導入する
