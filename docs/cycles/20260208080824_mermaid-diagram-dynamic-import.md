# Mermaidダイアグラム機能（Dynamic Import）

**Cycle ID:** `20260208080824`
**Started:** 2026-02-08 08:08:24
**Status:** 🟡 Planning

---

## 📝 What & Why

Markdownコードブロック内のMermaid記法（```mermaid）をダイアグラムとして描画する機能を追加。パフォーマンス最適化のため、mermaidライブラリをDynamic Importで遅延ロードする。

## 🎯 Goals

- Mermaid記法のコードブロックを自動検出し、ダイアグラムとしてレンダリング
- `mermaid` npm公式パッケージを使用、esbuildでバンドル可能な形式で統合
- Dynamic Importによる遅延ロード（Mermaidコードブロックが無い場合はロードしない）
- Manifest V3のCSP制約に準拠（CDN不使用、完全バンドル）
- テーマ連動（現在のテーマに合わせたMermaidテーマ適用）
- レイヤー分離の原則を厳守（domain/services/ui-components）

## 📐 Design

### Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│ UI Layer (content/components/MarkdownViewer.tsx)   │
│ - Mermaidブロック検出                                │
│ - ui-components/markdown/MermaidDiagram.tsx呼び出し │
└───────────────────┬─────────────────────────────────┘
                    │
                    ↓
┌─────────────────────────────────────────────────────┐
│ UI Components (ui-components/markdown/)              │
│ - MermaidDiagram.tsx: Dynamic Import + レンダリング │
│ - domain/markdown/mermaid-renderer.tsを呼び出し     │
└───────────────────┬─────────────────────────────────┘
                    │
                    ↓
┌─────────────────────────────────────────────────────┐
│ Domain Layer (domain/markdown/)                      │
│ - mermaid-detector.ts: Mermaidブロック検出ロジック   │
│ - mermaid-renderer.ts: mermaid.render() ラッパー     │
└─────────────────────────────────────────────────────┘
                    │
                    ↓
┌─────────────────────────────────────────────────────┐
│ External (npm: mermaid)                              │
│ - Dynamic Import経由でロード                         │
│ - ESモジュール形式（import('mermaid')）              │
└─────────────────────────────────────────────────────┘
```

### Files to Change/Create

```
src/
  domain/markdown/
    mermaid-detector.ts         # 新規: Mermaidコードブロック検出
    mermaid-detector.test.ts    # 新規: テスト
    mermaid-renderer.ts         # 新規: mermaid.render()ラッパー
    mermaid-renderer.test.ts    # 新規: テスト（モック使用）

  ui-components/markdown/
    MermaidDiagram.tsx          # 新規: Mermaidダイアグラム表示コンポーネント

  content/components/
    MarkdownViewer.tsx          # 変更: Mermaidブロック処理統合

  shared/types/
    mermaid.ts                  # 新規: Mermaid型定義

  package.json                  # 変更: mermaid追加
  deno.json                     # 変更: mermaid import map追加
```

### Key Points

- **Dynamic Import戦略**: `ui-components/markdown/MermaidDiagram.tsx` で `import('mermaid')` を使用
  - 初回レンダリング時のみライブラリロード
  - Mermaidコードブロックが存在しない場合はロードしない
  - バンドルサイズ削減（初期ロード高速化）

- **レイヤー分離の徹底**:
  - **domain/markdown/**: 純粋関数（Mermaidブロック検出・レンダリングロジック）
  - **ui-components/**: UIコンポーネント + Dynamic Import実行
  - **content/**: 描画のみ、ui-components呼び出し

- **テーマ連動**:
  - 現在のテーマ（light/dark/github等）に応じて `mermaid.initialize({ theme })` を実行
  - テーマ切り替え時に自動再描画

- **セキュリティ考慮**:
  - Mermaidコードはユーザーの意図的な入力のみ処理
  - sanitizeHTML()を通過済みのHTML内から検出（XSS対策済み）
  - CSP準拠: CDN不使用、完全バンドル

### Implementation Steps

1. **依存関係追加**
   - `npm install mermaid` (または `deno.json` importMap経由)
   - esbuildで正しくバンドル可能か確認

2. **Domain層: 検出ロジック**
   - `domain/markdown/mermaid-detector.ts`: `<code class="language-mermaid">` 検出
   - TDD: 先にテスト、後で実装

3. **Domain層: レンダリングロジック**
   - `domain/markdown/mermaid-renderer.ts`: `mermaid.render()` ラッパー
   - Dynamic Importの型定義
   - TDD: モックで mermaid.render() 動作確認

4. **UI Components層: Mermaidダイアグラム**
   - `ui-components/markdown/MermaidDiagram.tsx`
   - Dynamic Import実装
   - テーマ連動
   - エラーハンドリング（レンダリング失敗時のフォールバック）

5. **Content層: 統合**
   - `content/components/MarkdownViewer.tsx` で MermaidDiagram.tsx 呼び出し
   - 既存の表示フローに統合

6. **E2Eテスト**
   - `tests/e2e/mermaid-rendering.spec.ts`
   - フローチャート、シーケンス図等のサンプルをテスト

## ✅ Test List

### Domain Layer (domain/markdown/)

#### mermaid-detector.ts
- [ ] Mermaidコードブロックを正しく検出できる
- [ ] 複数のMermaidブロックを検出できる
- [ ] Mermaid以外のコードブロックは無視する
- [ ] 空のコードブロックは無視する
- [ ] HTMLエスケープされたMermaid記法を処理できる

#### mermaid-renderer.ts（モックテスト）
- [ ] mermaid.render()を正しく呼び出す（モック使用）
- [ ] レンダリング結果のSVGを返す
- [ ] エラー時に適切な例外を投げる
- [ ] テーマを正しく適用する

### UI Components Layer (ui-components/markdown/)

#### MermaidDiagram.tsx
- [ ] Dynamic Importが正しく動作する
- [ ] レンダリング成功時にSVGを表示する
- [ ] レンダリング失敗時にフォールバック表示する
- [ ] テーマ変更時に再描画する
- [ ] 初期ロード時のみライブラリをロードする（2回目以降はキャッシュ）

### E2E Test (tests/e2e/)

#### mermaid-rendering.spec.ts
- [ ] フローチャートが正しく描画される
- [ ] シーケンス図が正しく描画される
- [ ] クラス図が正しく描画される
- [ ] テーマ切り替えでMermaidダイアグラムのテーマも変わる
- [ ] Mermaidブロックが無いページでライブラリがロードされない

## 🔒 Security

- [x] MermaidコードはsanitizeHTML()通過済みのHTMLから検出（XSS対策済み）
- [x] CSP準拠: CDN不使用、完全バンドル（`script-src 'self'`）
- [x] Dynamic Importはesbuild経由で静的解析可能な形式
- [ ] Mermaid構文自体の悪用可能性を調査（必要に応じて制限追加）

## 🔧 Technical Notes

### mermaid Dynamic Import Example

```typescript
// ui-components/markdown/MermaidDiagram.tsx
import { h } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';

let mermaidLoaded = false;
let mermaid: any = null;

export const MermaidDiagram = ({ code, theme }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const render = async () => {
      try {
        // Dynamic Import: 初回のみロード
        if (!mermaidLoaded) {
          const m = await import('mermaid');
          mermaid = m.default;
          mermaidLoaded = true;
        }

        // テーマ設定
        mermaid.initialize({ theme: theme === 'dark' ? 'dark' : 'default' });

        // レンダリング
        const { svg } = await mermaid.render('mermaid-diagram', code);

        if (containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
      } catch (err) {
        setError(`Mermaid rendering failed: ${err.message}`);
      }
    };

    render();
  }, [code, theme]);

  if (error) {
    return <pre><code class="language-mermaid">{code}</code></pre>;
  }

  return <div ref={containerRef} class="mermaid-diagram" />;
};
```

### esbuild Configuration

```javascript
// scripts/build.ts
{
  // ...
  splitting: true,  // Dynamic Importのコード分割
  format: 'esm',    // ESモジュール形式
  // ...
}
```

## 📊 Progress

| Step | Status |
|------|--------|
| 依存関係追加 | ⚪ |
| Domain: mermaid-detector.ts | ⚪ |
| Domain: mermaid-renderer.ts | ⚪ |
| UI Components: MermaidDiagram.tsx | ⚪ |
| Content: 統合 | ⚪ |
| E2E Test | ⚪ |
| Commit | ⚪ |

**Legend:** ⚪ Pending · 🟡 In Progress · 🟢 Done

---

## 🚀 Next Steps

1. **Context7でmermaid公式ドキュメント確認** ✅ 完了
   - Dynamic Importでの使い方
   - テーマ設定方法
   - レンダリングAPI

2. **TDD開始**: `tdd-red` or "テスト書いて"
   - domain/markdown/mermaid-detector.test.ts から開始

3. **実装**: `tdd-green` or "実装して"
   - テストを通すための最小限実装

4. **リファクタ**: `tdd-refactor` or "リファクタして"
   - コード品質向上

5. **コミット**: `smart-commit` or "コミットして"
   - 変更を1機能単位でコミット

---

**Note:** このプランは spec.md Phase 2-8 に対応します。レイヤー分離とTDDを厳守して実装します。
