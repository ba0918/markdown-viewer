# Issue: TocService テストの修正が必要

**作成日:** 2026-02-08 **優先度:** Medium **ステータス:** Open

## 概要

`src/services/toc-service.test.ts` のテストが失敗している。
TocServiceの実装がツリー構造（階層構造）を返すように変更されたが、テストはフラット構造を期待している。

## 詳細

### 失敗しているテスト

1. `TocService.generate: 基本的なMarkdownからTOC生成`
   - 期待: `result.length === 4`
   - 実際: `result.length === 1`

2. `TocService.generate: 複雑なMarkdown`
   - 期待: `result.length === 8`
   - 実際: `result.length === 1`

### 原因

TocServiceは現在、階層構造（ツリー構造）を返している:

```json
[
  {
    "level": 1,
    "text": "Main Title",
    "id": "Main-Title",
    "children": [
      {
        "level": 2,
        "text": "Section 1",
        "id": "Section-1",
        "children": [...]
      },
      ...
    ]
  }
]
```

しかし、テストはフラット構造を期待している。

## 修正方法

### オプション1: テストを階層構造に合わせる（推奨）

```typescript
Deno.test("TocService.generate: 基本的なMarkdownからTOC生成", () => {
  const service = new TocService();
  const markdown = `
# Main Title
## Section 1
### Subsection 1.1
## Section 2
  `.trim();

  const result = service.generate(markdown);

  // ツリー構造のルート要素数をチェック
  assertEquals(result.length, 1);
  assertEquals(result[0].text, "Main Title");
  assertEquals(result[0].children.length, 2);
  assertEquals(result[0].children[0].text, "Section 1");
  assertEquals(result[0].children[0].children.length, 1);
  assertEquals(result[0].children[0].children[0].text, "Subsection 1.1");
  assertEquals(result[0].children[1].text, "Section 2");
});
```

### オプション2: フラット化ヘルパー関数を追加

もしフラット構造が必要な場合は、ツリー→フラット変換ヘルパーを追加:

```typescript
function flattenToc(tree: TocItem[]): TocItem[] {
  const result: TocItem[] = [];
  function traverse(items: TocItem[]) {
    for (const item of items) {
      result.push(item);
      if (item.children.length > 0) {
        traverse(item.children);
      }
    }
  }
  traverse(tree);
  return result;
}
```

## 関連ファイル

- `src/services/toc-service.ts` - TocService実装
- `src/services/toc-service.test.ts` - 失敗しているテスト
- `src/domain/toc/extractor.ts` - ツリー構造を生成

## 関連Issue/PR

- ToC階層構造実装: Cycle 20260208111558

## 備考

- 今回のFrontmatter実装とは無関係
- 以前のToC実装時の修正漏れと思われる
- 機能自体は正常動作している（UIでは正しく表示されている）
