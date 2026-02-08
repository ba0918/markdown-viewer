# DocumentHeader テーマ追従問題 - 実装プラン

## Context（背景）

View/Raw モード切り替え機能を実装した際、DocumentHeaderのテーマが現在のテーマに追従しないという問題が発生。

**問題の原因:**
- DocumentHeaderコンポーネントに `themeId` Propsがない
- DocumentHeader要素にテーマクラス（`theme-*`や`document-header-theme-*`）が付与されていない
- CSSセレクタ（`.theme-dark .document-header` など）が機能していない

**調査結果:**
- TableOfContentsは `toc-theme-${themeId}` クラスを aside要素に付与している
- markdown-bodyは `theme-${themeId}` クラスが applier.ts で付与される
- 両者とも themeId を Props で受け取り、クラス名に反映している

**なぜこれを修正するのか:**
ユーザーがテーマを変更した際に、DocumentHeaderのスタイル（背景色、文字色、タブ色）も自動的に追従する必要がある。現状ではlight themeのスタイルのままになっている。

---

## 実装アプローチ

### 戦略: 案1 + 案2 の組み合わせ（最も堅牢）

**案1: DocumentHeader に `document-header-theme-${themeId}` クラスを直接付与**
- TableOfContents の `toc-theme-*` パターンと統一
- DocumentHeader要素に確実にテーマクラスが適用される

**案2: markdown-viewer-layout に `theme-${themeId}` も付与**
- フォールバックとして機能
- 全体の統一感を保つ
- 将来的に他のUI要素が追加された際にも対応可能

---

## 修正対象ファイル

### 1. `src/ui-components/markdown/DocumentHeader/DocumentHeader.tsx`

**変更内容:**
- Props に `themeId: string` を追加
- header要素に `document-header-theme-${themeId}` クラスを付与

```tsx
interface Props {
  currentMode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
  style?: { left: string };
  themeId: string;  // ← 追加
}

export const DocumentHeader = ({ currentMode, onModeChange, style, themeId }: Props) => {
  // ...
  return (
    <header class={`document-header document-header-theme-${themeId}`} style={style}>
      {/* ... */}
    </header>
  );
};
```

---

### 2. `src/content/components/MarkdownViewer.tsx`

**変更内容:**
- DocumentHeader に `themeId={themeId.value}` を渡す
- markdown-viewer-layout に `theme-${themeId.value}` クラスを付与（案2）

```tsx
return (
  <div class={`markdown-viewer-layout theme-${themeId.value}`}>
    <DocumentHeader
      currentMode={viewMode}
      onModeChange={setViewMode}
      style={{ left: `${marginLeft - 20}px` }}
      themeId={themeId.value}  // ← 追加
    />
    <TableOfContents items={tocItems} themeId={themeId.value} />
    {/* ... */}
  </div>
);
```

---

### 3. `src/ui-components/markdown/DocumentHeader/styles.css`

**変更内容:**
- 既存の `.theme-dark .document-header` セレクタを削除
- 新しい `.document-header-theme-*` セレクタに書き換え

**変更前（既存）:**
```css
.theme-dark .document-header {
  background: rgba(30, 30, 30, 0.92);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}
```

**変更後（新規）:**
```css
.document-header-theme-dark,
.document-header-theme-github {
  background: rgba(30, 30, 30, 0.92);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.document-header-theme-dark .tab,
.document-header-theme-github .tab {
  color: #9ca3af;
}

.document-header-theme-dark .tab:hover,
.document-header-theme-github .tab:hover {
  color: #f3f4f6;
  background: rgba(255, 255, 255, 0.08);
}

.document-header-theme-dark .tab.active,
.document-header-theme-github .tab.active {
  color: #f3f4f6;
}

.document-header-theme-solarized-dark {
  background: rgba(0, 43, 54, 0.92);
  border-bottom: 1px solid rgba(147, 161, 161, 0.2);
}

.document-header-theme-solarized-dark .tab {
  color: #839496;
}

.document-header-theme-solarized-dark .tab:hover,
.document-header-theme-solarized-dark .tab.active {
  color: #93a1a1;
}
```

**全テーマ対応:**
- light（デフォルト）: 既存スタイル
- dark: rgba(30, 30, 30, 0.92)
- github: dark と同じ
- solarized-dark: rgba(0, 43, 54, 0.92)

---

## 検証方法

### 1. ビルド確認
```bash
deno task build
```

### 2. 拡張機能の動作確認

1. Chrome拡張をリロード
2. Markdownファイルを開く
3. テーマを切り替える（light → dark → github → solarized-dark）
4. DocumentHeaderの背景色・文字色が追従することを確認

**期待される動作:**
- light: 白背景（rgba(255, 255, 255, 0.92)）
- dark: 暗い背景（rgba(30, 30, 30, 0.92)）+ 薄いグレー文字
- github: dark と同じスタイル
- solarized-dark: Solarized Dark 背景（rgba(0, 43, 54, 0.92)）

### 3. E2Eテスト実行（既存テストが通ることを確認）
```bash
deno task test:e2e:wsl2 tests/e2e/view-raw-toggle.spec.ts
```

---

## 技術的な補足

### テーマ適用パターンの統一

| コンポーネント | クラス付与方法 | セレクタ形式 |
|---|---|---|
| TableOfContents | `toc-theme-${themeId}` | `.toc-theme-dark` |
| markdown-body | `theme-${themeId}` | `.theme-dark` |
| **DocumentHeader（修正後）** | `document-header-theme-${themeId}` | `.document-header-theme-dark` |

### Preact Signalsによる自動追従

```tsx
// themeId が Signal なので、変更時に自動的に再レンダリング
<DocumentHeader themeId={themeId.value} />
```

ユーザーがテーマを変更すると：
1. `themeId` Signal が更新される
2. MarkdownViewer が再レンダリング
3. DocumentHeader の `themeId` Props が新しい値に更新
4. class名が `document-header-theme-light` → `document-header-theme-dark` に変わる
5. CSS セレクタが自動的に適用される

---

## リスク評価

### 低リスク
- DocumentHeader の Props 追加は既存の動作に影響しない
- CSS セレクタの変更は既存のスタイルと競合しない
- markdown-viewer-layout へのクラス追加も既存スタイルに影響なし

### 考慮事項
- ビルド時のCSS bundling に変更がないか確認
- 全6テーマ（light, dark, github, github-dark, solarized-light, solarized-dark）で動作確認

---

## 参考: 既存のテーマID一覧

プロジェクト内で定義されているテーマ:
- `light`
- `dark`
- `github`
- `github-dark`
- `solarized-light`
- `solarized-dark`

（src/domain/theme/defaults.ts で定義）

---

## 完了条件

- [ ] DocumentHeader.tsx に themeId Props 追加
- [ ] MarkdownViewer.tsx で themeId を DocumentHeader に渡す
- [ ] markdown-viewer-layout に theme-* クラス付与
- [ ] DocumentHeader/styles.css のセレクタを新パターンに書き換え
- [ ] ビルド成功
- [ ] 全テーマで DocumentHeader のスタイルが追従することを確認
- [ ] E2Eテスト通過
