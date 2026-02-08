# YAML Frontmatter処理とView/Rawモード切り替え

**Cycle ID:** `20260208130545` **Started:** 2026-02-08 13:05:45 **Status:** 🟡
Planning

---

## 📝 What & Why

GitHub/Jekyll/Hugo等で使われるYAML
Frontmatter（`---`で囲まれたメタデータ）を正しく処理し、レンダリング結果から除外。同時にView/Rawモード切り替え機能を実装して、レンダリング結果と元のMarkdownテキストを簡単に確認・コピーできるようにする。

## 🎯 Goals

- YAML Frontmatterを解析し、レンダリング結果からは完全除外（GitHub互換）
- 固定ヘッダーに[ View | Raw ]タブボタンを配置
- Viewモード: レンダリング結果を表示（Frontmatter除外済み）
- Rawモード: 元のMarkdownテキスト全文を表示（Frontmatter含む）
- ミニマルデザインの固定ヘッダー（薄いグレー背景）
- GFM互換性の向上（Frontmatterが表や横線として誤認識されない）

## 📐 Design

### Architecture

```
UI層（content/ui-components）
  ↓
messaging/
  ↓
services/markdown-service.ts
  ↓
domain/
  frontmatter/
    parser.ts          # YAML Frontmatter解析（gray-matterライブラリ使用）
    parser.test.ts
    types.ts           # Frontmatter型定義
  markdown/
    parser.ts          # 既存（変更不要: gray-matterがFrontmatter除外済みのcontentを返す）
    parser.test.ts
```

### Files to Change

```
src/
  domain/
    frontmatter/
      parser.ts                 # NEW - YAML解析、content分離
      parser.test.ts            # NEW - Frontmatter解析テスト
      types.ts                  # NEW - FrontmatterResult型定義

  services/
    markdown-service.ts         # MODIFY - Frontmatter解析を統合
    markdown-service.test.ts    # ADD - Frontmatter統合テスト

  ui-components/
    markdown/
      DocumentHeader.tsx        # NEW - 固定ヘッダー（View/Rawタブ）
      RawTextView.tsx           # NEW - Rawモード表示コンポーネント
      MarkdownViewer.tsx        # MODIFY - DocumentHeader統合、viewMode Signal

  content/
    styles.css                  # MODIFY - ヘッダースタイル追加（ミニマルデザイン）

  shared/
    types/
      frontmatter.ts            # NEW - Frontmatter関連型定義エクスポート
      message.ts                # MODIFY - RenderResultにrawMarkdown追加

tests/
  e2e/
    fixtures/
      frontmatter-example.md   # NEW - テスト用Frontmatter付きMarkdown
    frontmatter-rendering.spec.ts # NEW - Frontmatter除外のE2Eテスト
    view-raw-toggle.spec.ts    # NEW - View/Raw切り替えのE2Eテスト
```

### Key Points

- **gray-matterライブラリ使用**: YAML
  Frontmatterの標準的な解析ライブラリ（Jekyll/Hugo互換）
- **domain層の分離**: Frontmatter処理は`domain/frontmatter/`に独立
- **View/Raw状態管理**: Preact Signalsで`viewMode: 'view' | 'raw'`を管理
- **ミニマルデザイン**: 薄いグレー背景（`#f6f8fa` GitHub風）、控えめでスッキリ
- **frontend-design活用**: DocumentHeaderのUI設計はfrontend-designスキルで実装
- **Frontmatter完全除外**: ViewモードではFrontmatterを表示しない（GitHub互換）
- **Rawモードで確認可**: 元のMarkdownテキストはRawモードで全文表示

### Implementation Strategy

1. **Phase 1: Frontmatter解析 (domain層)**
   - gray-matterライブラリ導入（`deno.json` imports追加）
   - Context7でgray-matter最新情報確認
   - `domain/frontmatter/parser.ts`でYAML解析 + content分離
   - gray-matterがFrontmatter除外済みのcontentを返すので、markdown
     parserは変更不要

2. **Phase 2: サービス層統合**
   - `services/markdown-service.ts`でFrontmatter解析を統合
   - messageペイロードに`rawMarkdown`（元テキスト）を追加
   - Frontmatter除外済みcontentをmarkdown parserに渡す

3. **Phase 3: UI実装（frontend-design使用）**
   - `DocumentHeader.tsx`でView/Rawタブボタン（ミニマル）
   - `RawTextView.tsx`で元のMarkdownテキスト表示（モノスペース）
   - `MarkdownViewer.tsx`にviewMode Signal追加、ヘッダー統合

4. **Phase 4: E2Eテスト**
   - Frontmatter付きMarkdownファイルで除外確認
   - View/Raw切り替え動作確認

## ✅ Tests

### domain/frontmatter/parser.test.ts

- [ ] 標準的なYAML Frontmatterを正しく解析（title, date, tags）
- [ ] Frontmatterがない場合は元のmarkdownをそのまま返す
- [ ] Frontmatter + content分離が正しく動作
- [ ] 不正なFrontmatter（`---`のみ、閉じタグなし）のエラーハンドリング
- [ ] 複数行のYAML値を正しく解析
- [ ] contentにFrontmatter部分が含まれないことを確認

### services/markdown-service.test.ts

- [ ] Frontmatter解析 + Markdown変換が統合動作
- [ ] rawMarkdown（元テキスト）とhtml（レンダリング結果）の両方が返される
- [ ] Frontmatter除外済みのcontentがHTMLに変換される
- [ ] Frontmatterがない場合も正常動作
- [ ] テーマ適用時もFrontmatter解析が正常動作

### ui-components/markdown/DocumentHeader.test.tsx

- [ ] View/Rawタブボタンが正しく表示される
- [ ] タブクリックでviewMode Signalが切り替わる
- [ ] アクティブなタブに下線が表示される
- [ ] ミニマルデザインスタイルが適用される

### ui-components/markdown/RawTextView.test.tsx

- [ ] rawMarkdownテキストがモノスペースフォントで表示される
- [ ] 改行・インデントが保持される
- [ ] Frontmatter部分も含めて全文表示される
- [ ] スクロール可能（長いテキスト対応）

### E2E: tests/e2e/frontmatter-rendering.spec.ts

- [ ] Frontmatter付きMarkdownファイルを開く
- [ ] Viewモードでレンダリング結果にFrontmatterが表示されない
- [ ] Frontmatterの`---`が表や横線として表示されない
- [ ] Markdownコンテンツ部分のみが正しくレンダリングされる

### E2E: tests/e2e/view-raw-toggle.spec.ts

- [ ] DocumentHeaderが固定表示される
- [ ] デフォルトでViewモードが選択されている
- [ ] Rawタブクリックで元のMarkdownテキストが表示される
- [ ] Rawモードでは Frontmatter含む全文が表示される
- [ ] Viewタブクリックでレンダリング結果に戻る
- [ ] モード切り替え時に表示がちらつかない

## 🔒 Security

- [ ] Rawモード表示時はプレーンテキストのみ（HTML解釈させない）
- [ ] Frontmatterメタデータは使用しないため、XSS対策不要（将来的に使う場合はsanitize必須）

## 📦 Dependencies

新規ライブラリ追加（Context7で最新情報確認）:

```json
// deno.json imports
{
  "gray-matter": "npm:gray-matter@^4.0.3"
}
```

**⚠️ CRITICAL**: 実装前にContext7でgray-matterの最新ドキュメント確認必須！

```bash
mcp__plugin_context7_context7__resolve-library-id
mcp__plugin_context7_context7__query-docs
```

## 📊 Progress

| Step                                  | Status | Note               |
| ------------------------------------- | ------ | ------------------ |
| gray-matter調査（Context7）           | ⚪     | API・型定義確認    |
| domain/frontmatter/parser実装         | ⚪     | RED→GREEN→REFACTOR |
| services/markdown-service統合         | ⚪     | rawMarkdown追加    |
| DocumentHeader実装（frontend-design） | ⚪     | ミニマルデザイン   |
| RawTextView実装                       | ⚪     |                    |
| MarkdownViewer統合                    | ⚪     | viewMode Signal    |
| E2Eテスト（Frontmatter除外）          | ⚪     |                    |
| E2Eテスト（View/Raw切り替え）         | ⚪     |                    |
| Commit                                | ⚪     | smart-commit       |

**Legend:** ⚪ Pending · 🟡 In Progress · 🟢 Done

---

## 💡 Design Notes

### DocumentHeader UI (frontend-design実装予定)

```
┌────────────────────────────────────────────────────────┐
│                                        [ View | Raw ]  │ ← 薄いグレー背景 #f6f8fa
└────────────────────────────────────────────────────────┘
```

- **背景**: `#f6f8fa` (GitHub風グレー)
- **高さ**: 40px程度（コンパクト）
- **タブボタン**:
  - アクティブ時: 下線（border-bottom: 2px solid #0366d6）
  - 非アクティブ時: グレーテキスト (#586069)
- **スティッキー固定**: `position: sticky; top: 0; z-index: 100;`
- **右寄せ**: タブボタンは右端に配置（`justify-content: flex-end`）

### RawTextView

```
┌────────────────────────────────────────────────────────┐
│ ---                                                     │ ← モノスペース
│ title: Example Document                                │
│ date: 2026-02-08                                       │
│ tags: [yaml, frontmatter]                              │
│ ---                                                     │
│                                                         │
│ # Heading 1                                            │
│ ...                                                     │
└────────────────────────────────────────────────────────┘
```

- **フォント**: Monospace (Consolas, Monaco, 'Courier New', monospace)
- **フォントサイズ**: 14px
- **背景**: 白 or テーマに合わせた薄いグレー
- **パディング**: 20px
- **スクロール**: `overflow-y: auto; max-height: calc(100vh - 40px);`
- **ホワイトスペース**: `white-space: pre-wrap;`（改行保持）

---

**Next:** Context7でgray-matter調査 → Tests → Implement → frontend-design for UI
→ Commit 🚀
