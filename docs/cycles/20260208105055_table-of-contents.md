# Table of Contents (TOC) Auto-Generation

**Cycle ID:** `20260208105055` **Started:** 2026-02-08 10:50:55 **Status:** 🟡
Planning

---

## 📝 What & Why

長いMarkdownドキュメントを読む際、H1〜H3見出しを自動抽出して左側に追従するサイドメニュー（TOC）を表示する機能を追加する。これにより、ドキュメントのナビゲーション性が劇的に向上する。

## 🎯 Goals

- H1〜H3見出しを自動抽出し、階層構造を保ったTOCを生成
- 左サイドに固定配置し、スクロールに追従するナビゲーションメニューを実装
- クリックでスムーススクロール、現在位置のハイライト表示
- 全6テーマ（light/dark/github/minimal/solarized_light/solarized_dark）に対応したスタイリング
- レイヤー分離原則を厳守（domain → services → ui-components）

## 📐 Design

### Architecture Overview

```
┌─────────────────────────────────────────────┐
│ 1. domain/toc/                              │
│    ├── extractor.ts        (H1-H3抽出)      │
│    ├── extractor.test.ts                    │
│    └── types.ts            (TOC型定義)       │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ 2. services/toc-service.ts                  │
│    - domainとの組み合わせ                     │
│    - HTMLからTOCデータ生成                    │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ 3. ui-components/markdown/TableOfContents/  │
│    ├── TableOfContents.tsx (TOCコンポーネント)│
│    └── toc.css            (TOC専用スタイル)   │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ 4. content/components/MarkdownViewer.tsx    │
│    - TOCコンポーネントの統合                  │
│    - レイアウト調整                           │
└─────────────────────────────────────────────┘
```

### Files to Change

```
src/
  domain/
    toc/
      types.ts                 # TocHeading, TocItem型定義
      extractor.ts             # H1-H3見出し抽出ロジック（純粋関数）
      extractor.test.ts        # 抽出ロジックのテスト

  services/
    toc-service.ts             # TOC生成サービス（domainの組み合わせ）
    toc-service.test.ts        # サービステスト

  ui-components/
    markdown/
      TableOfContents/
        TableOfContents.tsx    # TOCコンポーネント（左サイド固定）
        toc.css               # TOC専用スタイル

  content/
    components/
      MarkdownViewer.tsx       # TOC統合、レイアウト調整
    styles/
      themes/
        *.css                  # 各テーマのTOCスタイル追加
```

### Key Points

- **見出し抽出（domain層）**:
  DOMパース不要、marked.lexer()を使用してトークン解析でH1-H3抽出
- **ID生成**:
  見出しテキストからURLフレンドリーなIDを生成（空白→ハイフン、小文字化）
- **スクロール追従**: IntersectionObserver
  APIで現在表示中の見出しを検出、アクティブ状態をハイライト
- **スムーススクロール**:
  `scrollIntoView({ behavior: 'smooth', block: 'start' })`でナビゲーション
- **レイアウト**:
  `.markdown-viewer`を`display: flex`に変更、TOCを左、本文を右に配置
- **テーマ対応**: 各テーマCSS（6種類）にTOC用カラー変数を追加

## ✅ Tests

### domain/toc/extractor.test.ts

- [ ] H1見出しのみのMarkdownからTOC抽出
- [ ] H1-H3混在のMarkdownからTOC抽出、階層構造保持
- [ ] H4-H6を含むMarkdownでH1-H3のみ抽出
- [ ] 見出しがないMarkdownで空配列を返す
- [ ] 特殊文字を含む見出しテキストから正しいIDを生成
- [ ] 日本語見出しからURLフレンドリーなIDを生成

### services/toc-service.test.ts

- [ ] レンダリング済みHTMLからTOCデータ生成
- [ ] DOMPurify sanitize後のHTMLでもTOC生成可能
- [ ] 見出しのネスト深度が正しく計算される

### ui-components/markdown/TableOfContents/TableOfContents.test.ts (Optional: E2Eで代替可)

- [ ] TOCアイテムクリックで対象見出しにスクロール
- [ ] 現在位置の見出しがアクティブ状態でハイライト
- [ ] テーマ変更時にTOCスタイルが切り替わる

### E2E Tests (tests/e2e/toc.spec.ts)

- [ ] 長いMarkdownファイルを開くとTOCが左サイドに表示される
- [ ] TOCをクリックすると対象セクションにスムーススクロール
- [ ] スクロールすると現在位置の見出しがハイライトされる
- [ ] テーマ切り替えでTOCのスタイルが変更される
- [ ] 見出しのないMarkdownではTOCが表示されない

## 🔒 Security

- [ ] 見出しテキストからID生成時、XSS脆弱性がないことを確認
- [ ] `innerHTML`を使わず、Preactのコンポーネントで安全にレンダリング
- [ ] ユーザー入力（見出しテキスト）のエスケープ処理

## 📊 Progress

| Step                              | Status |
| --------------------------------- | ------ |
| domain/toc実装                    | ⚪     |
| services/toc-service実装          | ⚪     |
| ui-components/TableOfContents実装 | ⚪     |
| content/MarkdownViewer統合        | ⚪     |
| テーマCSS追加                     | ⚪     |
| Tests (Unit)                      | ⚪     |
| Tests (E2E)                       | ⚪     |
| Commit                            | ⚪     |

**Legend:** ⚪ Pending · 🟡 In Progress · 🟢 Done

---

## 📋 Implementation Details

### 1. domain/toc/types.ts

```typescript
/**
 * TOC見出しアイテムの型
 */
export interface TocHeading {
  /** 見出しレベル（1-3） */
  level: 1 | 2 | 3;
  /** 見出しテキスト */
  text: string;
  /** 見出しのID（URLフラグメント用） */
  id: string;
  /** ネスト深度（0始まり） */
  depth: number;
}

/**
 * TOCツリー構造
 */
export interface TocItem extends TocHeading {
  /** 子見出しリスト */
  children: TocItem[];
}
```

### 2. domain/toc/extractor.ts

**責務**: Markdownテキストから見出し（H1-H3）を抽出し、TOC用データ構造を生成

```typescript
import { marked } from "marked";
import type { TocHeading } from "./types.ts";

/**
 * 見出しテキストからURLフレンドリーなIDを生成
 * 例: "Hello World!" → "hello-world"
 */
export const generateHeadingId = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // 英数字、空白、ハイフン以外を削除
    .replace(/[\s_]+/g, "-") // 空白とアンダースコアをハイフンに
    .replace(/^-+|-+$/g, ""); // 先頭/末尾のハイフン削除
};

/**
 * Markdownテキストから見出し（H1-H3）を抽出
 * @param markdown Markdownテキスト
 * @returns 見出しリスト（階層構造なし）
 */
export const extractHeadings = (markdown: string): TocHeading[] => {
  const tokens = marked.lexer(markdown);
  const headings: TocHeading[] = [];

  for (const token of tokens) {
    if (token.type === "heading" && token.depth <= 3) {
      const text = token.text;
      const id = generateHeadingId(text);

      headings.push({
        level: token.depth as 1 | 2 | 3,
        text,
        id,
        depth: 0, // ネスト深度は buildTocTree で計算
      });
    }
  }

  return headings;
};

/**
 * フラットな見出しリストから階層構造のTOCツリーを構築
 * @param headings フラットな見出しリスト
 * @returns TOCツリー（ルートレベルのアイテムリスト）
 */
export const buildTocTree = (headings: TocHeading[]): TocItem[] => {
  // 実装は次のフェーズで...
  // シンプルにフラットリストを返す実装からスタートも可
  return headings.map((h) => ({ ...h, children: [] }));
};
```

### 3. services/toc-service.ts

**責務**: domainロジックを組み合わせてTOC生成のビジネスフローを実現

```typescript
import { buildTocTree, extractHeadings } from "../domain/toc/extractor.ts";
import type { TocItem } from "../domain/toc/types.ts";

export class TocService {
  /**
   * Markdownテキストから目次を生成
   * @param markdown Markdownテキスト
   * @returns TOCツリー
   */
  generate(markdown: string): TocItem[] {
    const headings = extractHeadings(markdown);
    return buildTocTree(headings);
  }
}

export const tocService = new TocService();
```

### 4. ui-components/markdown/TableOfContents/TableOfContents.tsx

**責務**: TOCの表示、スクロール追従、アクティブ状態管理

```typescript
import { h } from "preact";
import { useEffect, useState } from "preact/hooks";
import type { TocItem } from "../../../domain/toc/types.ts";
import "./toc.css";

interface Props {
  items: TocItem[];
  themeId: string;
}

export const TableOfContents = ({ items, themeId }: Props) => {
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    // IntersectionObserverで現在表示中の見出しを検出
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: "-10% 0px -80% 0px" },
    );

    // 全見出し要素を監視
    const headings = document.querySelectorAll("h1, h2, h3");
    headings.forEach((h) => observer.observe(h));

    return () => observer.disconnect();
  }, [items]);

  const handleClick = (id: string) => {
    const element = document.getElementById(id);
    element?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (items.length === 0) return null;

  return (
    <nav class={`toc toc-theme-${themeId}`}>
      <h2 class="toc-title">Table of Contents</h2>
      <ul class="toc-list">
        {items.map((item) => (
          <li key={item.id} class={`toc-item toc-level-${item.level}`}>
            <a
              href={`#${item.id}`}
              class={activeId === item.id ? "toc-link active" : "toc-link"}
              onClick={(e) => {
                e.preventDefault();
                handleClick(item.id);
              }}
            >
              {item.text}
            </a>
            {item.children.length > 0 && (
              <ul class="toc-sublist">
                {/* 再帰的にchildren表示 */}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
};
```

### 5. ui-components/markdown/TableOfContents/toc.css

```css
.toc {
  position: sticky;
  top: 2rem;
  width: 250px;
  max-height: calc(100vh - 4rem);
  overflow-y: auto;
  padding: 1rem;
  font-size: 0.9rem;
}

.toc-title {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 1rem;
}

.toc-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.toc-item {
  margin: 0.5rem 0;
}

.toc-link {
  display: block;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  transition: all 0.2s ease;
  text-decoration: none;
}

.toc-link:hover {
  background: rgba(0, 0, 0, 0.05);
}

.toc-link.active {
  font-weight: 600;
  border-left: 3px solid;
  padding-left: calc(0.5rem - 3px);
}

/* レベル別インデント */
.toc-level-1 {
  padding-left: 0;
}
.toc-level-2 {
  padding-left: 1rem;
}
.toc-level-3 {
  padding-left: 2rem;
}
```

### 6. content/components/MarkdownViewer.tsx

**変更内容**: TOCコンポーネントの統合、レイアウト調整

```tsx
import { TableOfContents } from "../../ui-components/markdown/TableOfContents/TableOfContents.tsx";
import { tocService } from "../../services/toc-service.ts";

export const MarkdownViewer = ({ html, themeId, markdown }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tocItems, setTocItems] = useState<TocItem[]>([]);

  useEffect(() => {
    // TOC生成
    const items = tocService.generate(markdown);
    setTocItems(items);
  }, [markdown]);

  // 既存のMathJax/Mermaidレンダリング処理...

  return (
    <div class="markdown-viewer-layout">
      <TableOfContents items={tocItems} themeId={themeId.value} />
      <div class="markdown-viewer">
        <div
          ref={containerRef}
          class="markdown-body"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </div>
  );
};
```

### 7. content/styles/themes/*.css

**変更内容**: 各テーマにTOC用カラー変数を追加

```css
/* github.css の例 */
.toc-theme-github {
  background: #f6f8fa;
  border-right: 1px solid #e1e4e8;
}

.toc-theme-github .toc-link {
  color: #24292e;
}

.toc-theme-github .toc-link.active {
  color: #0366d6;
  border-left-color: #0366d6;
  background: #ffffff;
}
```

---

## 🎯 Implementation Strategy

### Phase 1: Domain層（純粋関数）

1. `domain/toc/types.ts` - 型定義
2. `domain/toc/extractor.ts` - 見出し抽出ロジック
3. `domain/toc/extractor.test.ts` - テスト

### Phase 2: Service層

4. `services/toc-service.ts` - TOC生成サービス
5. `services/toc-service.test.ts` - テスト

### Phase 3: UI層

6. `ui-components/markdown/TableOfContents/` - TOCコンポーネント
7. `content/components/MarkdownViewer.tsx` - 統合

### Phase 4: スタイリング

8. `ui-components/markdown/TableOfContents/toc.css` - 基本スタイル
9. `content/styles/themes/*.css` - 各テーマ対応

### Phase 5: E2Eテスト

10. `tests/e2e/toc.spec.ts` - 機能全体のE2Eテスト

---

**Next:** Write tests → Implement → Commit with `smart-commit` 🚀
