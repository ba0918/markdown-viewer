# ToC不正見出しレベル正規化

**Cycle ID:** `20260208140329`
**Started:** 2026-02-08 14:03:29
**Status:** 🟡 Planning

---

## 📝 What & Why

h1から始まらない不正な見出しレベル（h3→h3→h2など）のMarkdownでも、ToCが違和感なく表示されるように、見出しレベルを正規化する機能を実装。相対的な階層構造は保ちつつ、最小レベルを基準として自然な表示を実現する。

## 🎯 Goals

- h3やh2から始まる文書でも自然なToC表示
- 相対的な階層構造は保持（h3→h2は1レベル戻る）
- 最小レベルを基準に正規化（h3から始まる場合、h3を疑似h1として扱う）
- 既存の正常な文書（h1から始まる）には影響なし
- ツリー構造が崩れない堅牢な実装

## 📐 Design

### Architecture

```
services/toc-service.ts
  ↓
domain/toc/
  extractor.ts          # extractHeadings（変更なし）
  normalizer.ts         # NEW - 見出しレベル正規化ロジック
  normalizer.test.ts    # NEW - 正規化テスト
  tree-builder.ts       # REFACTOR - buildTocTree（正規化後のレベルで構築）
  tree-builder.test.ts  # MODIFY - ツリー構築テスト（正規化ケース追加）
  types.ts              # MODIFY - NormalizedHeading型追加
```

### Files to Change

```
src/
  domain/
    toc/
      normalizer.ts                 # NEW - レベル正規化ロジック
      normalizer.test.ts            # NEW - 正規化テスト（h3開始、h2開始等）
      tree-builder.ts               # REFACTOR - extractor.tsから分離、正規化対応
      tree-builder.test.ts          # NEW - ツリー構築テスト
      extractor.ts                  # MODIFY - buildTocTreeをtree-builder.tsに移動
      extractor.test.ts             # MODIFY - テスト分割（extractHeadingsのみ）
      types.ts                      # MODIFY - NormalizedHeading型追加

  services/
    toc-service.ts                  # MODIFY - normalizeHeadings統合
    toc-service.test.ts             # MODIFY - 正規化統合テスト追加
```

### Key Points

- **正規化アルゴリズム**: 最小レベルを検出し、`normalizedLevel = level - minLevel + 1` で変換
- **分離・責務**: normalizer.ts（正規化）、tree-builder.ts（ツリー構築）で責務分離
- **後方互換性**: h1から始まる正常な文書は正規化の影響なし（minLevel=1）
- **テスト駆動**: RED→GREEN→REFACTOR で実装

### Implementation Strategy

1. **Phase 1: normalizer.ts実装（TDD）**
   - `normalizeHeadingLevels(headings: TocHeading[]): TocHeading[]`
   - 最小レベル検出 → 正規化レベル計算
   - テストケース: h3開始、h2開始、h1開始（正常）

2. **Phase 2: tree-builder.ts分離（Refactor）**
   - extractor.tsから`buildTocTree`を分離
   - tree-builder.tsに移動
   - 既存テストが通ることを確認

3. **Phase 3: services統合**
   - toc-service.tsで正規化を統合
   - `extractHeadings → normalizeHeadings → buildTocTree` の流れ
   - 統合テスト追加

4. **Phase 4: E2Eテスト（Optional）**
   - 不正見出しレベルのMarkdownファイルで表示確認

## ✅ Tests

### domain/toc/normalizer.test.ts

- [ ] h1から始まる正常な文書: 正規化なし（minLevel=1）
- [ ] h2から始まる文書: h2→疑似h1、h3→疑似h2に正規化
- [ ] h3から始まる文書: h3→疑似h1に正規化
- [ ] 空配列: 空配列を返す
- [ ] 混在ケース（h2→h3→h2）: 相対的な階層保持

### domain/toc/tree-builder.test.ts

- [ ] 正規化後のレベルでツリー構築
- [ ] ルート要素が正しく配置される
- [ ] 親子関係が正しく構築される
- [ ] 空配列: 空ツリーを返す

### services/toc-service.test.ts

- [ ] 正規化統合テスト: h3開始の文書で自然なツリー生成
- [ ] 既存の正常文書: 影響なし（既存テスト通過）

## 🔒 Security

- [ ] 入力検証: headingsが空でもクラッシュしない
- [ ] 無限ループ防止: 正規化ロジックが確実に終了する

## 📊 Progress

| Step | Status | Note |
|------|--------|------|
| normalizer.ts実装（TDD） | ⚪ | RED→GREEN→REFACTOR |
| tree-builder.ts分離（Refactor） | ⚪ | 既存テスト通過確認 |
| services統合 | ⚪ | toc-service.ts修正 |
| テスト全通過確認 | ⚪ | 全155+αテスト |
| Commit | ⚪ | smart-commit |

**Legend:** ⚪ Pending · 🟡 In Progress · 🟢 Done

---

## 💡 Design Notes

### 正規化アルゴリズム

```typescript
// normalizer.ts
export function normalizeHeadingLevels(headings: TocHeading[]): TocHeading[] {
  if (headings.length === 0) return [];

  // 1. 最小レベル検出
  const minLevel = Math.min(...headings.map(h => h.level));

  // 2. 正規化（最小レベル = 1として扱う）
  return headings.map(h => ({
    ...h,
    level: (h.level - minLevel + 1) as 1 | 2 | 3,
  }));
}
```

### 具体例

#### ケース1: h3から始まる（不正）

**入力:**
```
h3: Section 1
h3: Section 2
h2: Part A
```

**正規化後:**
```
h1: Section 1  (h3 → h1)
h1: Section 2  (h3 → h1)
h1: Part A     (h2 → h1)  ← 相対的に1レベル上なので、正規化後も同レベル
```

**ツリー表示:**
```
Section 1
Section 2
Part A
```

#### ケース2: h2から始まる（不正）

**入力:**
```
h2: Introduction
h3: Overview
h3: Features
h2: Setup
```

**正規化後:**
```
h1: Introduction  (h2 → h1)
h2: Overview      (h3 → h2)
h2: Features      (h3 → h2)
h1: Setup         (h2 → h1)
```

**ツリー表示:**
```
Introduction
├─ Overview
└─ Features
Setup
```

#### ケース3: h1から始まる（正常）

**入力:**
```
h1: Title
h2: Section 1
h3: Sub 1.1
```

**正規化後:**
```
h1: Title       (h1 → h1) 変更なし
h2: Section 1   (h2 → h2) 変更なし
h3: Sub 1.1     (h3 → h3) 変更なし
```

**ツリー表示:**
```
Title
└─ Section 1
   └─ Sub 1.1
```

---

**Next:** Write tests → Implement → Commit with `smart-commit` 🚀
