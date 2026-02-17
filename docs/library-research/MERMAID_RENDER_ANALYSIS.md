# Mermaid v11.12.2 render() API 分析

## 概要

本プロジェクトで使用している Mermaid v11.12.2 の `render()` メソッドについて、
特にエラー時のDOM操作とクリーンアップの挙動をソースコード（`mermaid.core.mjs`）から分析した。

## render() の基本フロー

```
mermaid.render(id, text)
  │
  ├─ 1. removeExistingElements() ─ 同一IDの既存要素を削除
  │
  ├─ 2. appendDivSvgG() ─ 一時要素をDOMに作成
  │     body直下に <div id="d{id}"><svg id="{id}"><g></g></svg></div>
  │
  ├─ 3. Diagram.fromText(text) ─ 構文解析
  │     ├─ 成功 → diag = パース結果
  │     └─ 失敗 → catch:
  │           ├─ suppressErrorRendering=true → removeTempElements() + throw
  │           └─ suppressErrorRendering=false(デフォルト)
  │                → diag = Diagram.fromText("error")  // エラーダイアグラム
  │                → parseEncounteredException = error  // 例外を保存
  │
  ├─ 4. diag.renderer.draw() ─ SVG描画
  │     ├─ 成功 → SVGが一時要素内に描画
  │     └─ 失敗 → catch:
  │           ├─ suppressErrorRendering=true → removeTempElements()
  │           └─ suppressErrorRendering=false → errorRenderer.draw()
  │           → throw e  // 常に再throw
  │
  ├─ 5. SVGコード抽出 + DOMPurifyサニタイズ
  │
  ├─ 6. ★ if (parseEncounteredException) throw parseEncounteredException
  │     └─ removeTempElements() は呼ばれない！（throwの後にある）
  │
  ├─ 7. removeTempElements() ─ 一時要素をDOMから削除（正常時のみ到達）
  │
  └─ 8. return { svg, diagramType, bindFunctions }
```

## 重要な発見: 構文エラー時の挙動

### 該当コード（mermaid.core.mjs L1076-1079）

```javascript
// L1076-1079
attachFunctions();
if (parseEncounteredException) {
  throw parseEncounteredException; // ← 構文エラー時ここでthrow
}
removeTempElements(); // ← throwの後なので構文エラー時は到達しない
return { diagramType, svg: svgCode, bindFunctions: diag.db.bindFunctions };
```

### 結果

| シナリオ                                      | 一時要素のクリーンアップ            | 返り値         |
| --------------------------------------------- | ----------------------------------- | -------------- |
| **正常終了**                                  | `removeTempElements()` で削除される | `{ svg, ... }` |
| **構文エラー (suppressErrorRendering=false)** | **削除されない！DOMに残る**         | 例外throw      |
| **構文エラー (suppressErrorRendering=true)**  | catch内で削除される                 | 例外throw      |
| **描画エラー**                                | `suppressErrorRendering`に依存      | 例外throw      |

### 構文エラー時にDOMに残る一時要素

```html
<!-- body直下に以下が残る -->
<div id="d{mermaid-diagram-XXXXX}">
  <svg id="{mermaid-diagram-XXXXX}">
    <!-- エラーダイアグラムのSVGコンテンツ -->
  </svg>
</div>
```

## 本プロジェクトへの影響

### 設定

```typescript
// mermaid-renderer.ts
mermaidInstance.initialize({
  securityLevel: "strict", // サンドボックスなし
  startOnLoad: false,
  // suppressErrorRendering は未設定 → デフォルト false
});
```

### 影響

1. **一時要素の蓄積**: 不正構文のMermaidブロックがあるたびに、body直下に
   `<div id="dXXX"><svg id="XXX">` が残る。renderMermaid()内の手動削除
   （L187-190）は成功時のみ実行されるため、エラー時には対処できない。

2. **エラー時のフロー**: `renderMermaid()` → `mermaidInstance.render()` がthrow
   → `renderMermaid()` のcatchで再throw → 呼び出し元のcatchで処理。

### renderMermaid() の手動クリーンアップ（L183-190）

```typescript
const { svg } = await mermaidInstance.render(id, code);
// ↑ 構文エラー時はここでthrowされるので↓は到達しない
const tempSvg = document.getElementById(id);
if (tempSvg) {
  tempSvg.remove();
}
```

エラー時は `document.getElementById(id)` による手動削除にも到達しない。
対策として、catchブロック内でもID指定の一時要素削除を行う必要がある。

## 対策オプション

### Option A: suppressErrorRendering を有効化

```typescript
mermaidInstance.initialize({
  suppressErrorRendering: true, // エラー時にMermaid内部でクリーンアップしてthrow
});
```

- メリット: Mermaid側で一時要素を確実に削除してくれる
- デメリット:
  エラーダイアグラムSVGが生成されない（ただし本プロジェクトでは独自フォールバックHTMLを使うので問題なし）

### Option B: renderMermaid() のcatchで手動クリーンアップ

```typescript
export async function renderMermaid(code, theme) {
  const id = `mermaid-diagram-${Date.now()}-${...}`;
  try {
    await initializeMermaid(theme);
    const { svg } = await mermaidInstance.render(id, code);
    document.getElementById(id)?.remove();
    return sanitizeSvg(svg);
  } catch (error) {
    // エラー時も一時要素を削除
    document.getElementById(id)?.remove();
    document.getElementById(`d${id}`)?.remove();
    throw new Error(`Mermaid rendering failed: ${...}`);
  }
}
```

### Option C: A + B の併用（推奨）

`suppressErrorRendering: true`
で一次防御し、catchブロックでも念のため手動クリーンアップ。

## appendDivSvgG() の詳細

```javascript
// L956-968: body直下にdiv > svg > gを追加
var appendDivSvgG = (parentRoot, id28, enclosingDivId, divStyle, svgXlink) => {
  const enclosingDiv = parentRoot.append("div");
  enclosingDiv.attr("id", enclosingDivId); // id="d{id}"
  const svgNode = enclosingDiv.append("svg")
    .attr("id", id28) // id="{id}"
    .attr("width", "100%")
    .attr("xmlns", XMLNS_SVG_STD);
  svgNode.append("g");
  return parentRoot;
};
```

## removeExistingElements() の詳細

```javascript
// L973-977: 同一IDの既存要素を事前削除（render呼び出し時に毎回実行）
var removeExistingElements = (doc, id28, divId, iFrameId) => {
  doc.getElementById(id28)?.remove(); // svg要素
  doc.getElementById(divId)?.remove(); // 外側div
  doc.getElementById(iFrameId)?.remove(); // iframe（サンドボックス時）
};
```

## 参考: Diagram.fromText("error") のdetector登録

```javascript
// chunk-ABZYJK2D.mjs L581-582
registerDiagram("error", errorDiagram_default, (text) => {
  return text.toLowerCase().trim() === "error";
});
```

"error" という文字列に対してエラーダイアグラムのdetectorが登録されている。
構文エラー時に `Diagram.fromText("error")`
が呼ばれ、エラー表示用SVGが生成される。

## 分析日

- 2026-02-18
- Mermaid: v11.12.2
- ソース:
  `node_modules/.pnpm/mermaid@11.12.2/node_modules/mermaid/dist/mermaid.core.mjs`
