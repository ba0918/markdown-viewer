# レビュー結果ベース品質改善 - Review-Driven Quality Improvement

**Cycle ID:** `20260217104826` **Started:** 2026-02-17 10:48:26 **Status:** 🟡
Implementation **Based on:**
[Codebase Review Report (2026-02-17 06:45)](../reviews/review-20260217-0645.md)

---

## 📝 What & Why

コードベースレビュー（総合81/100,
ランクA）で検出された全指摘事項を体系的に修正する。
前回の「包括的品質改善」サイクル（20260217040010）で対応済みの項目を除き、残存する
Critical 1件 + Major 17件 + Minor多数 + 長期検討事項を含む包括的改善を実施する。

**前回サイクルからの引き継ぎ（実装済み）:**

- escapeHtml共通化、hash.ts作成、base64-encoder作成
- useEffect→カスタムフック分割（useCopyButtons/useMathJax/useMermaid）
- contentStateグローバル変数集約、Hot Reloadハッシュ比較化
- CHECK_FILE_CHANGEビジネスロジック抽出、isLocalUrl制限
- Markdown拡張子定数統一、Mermaid SVG XSS E2Eテスト追加

## 🎯 Goals

- セキュリティスコア 79→90+ を目指す（属性値エスケープ、入力バリデーション強化）
- メモリリークの完全解消（useCopyButtonsアンマウント漏れ、リスナー未解除）
- レイヤー違反ゼロ化（content→services直接依存の解消）
- テストカバレッジの穴を埋める（background-handler、export-service）
- パフォーマンスボトルネック解消（highlight.js、mathjax-full、Markdown二重パース）
- コード衛生改善（DRY違反解消、デッドコード整理、console.warn統一）

---

## 📋 改善一覧（優先度順）

### Phase 1: セキュリティ強化 (Critical/Major)

| #   | タスク                                       | 影響ファイル                               | 重要度   | 推定工数 |
| --- | -------------------------------------------- | ------------------------------------------ | -------- | -------- |
| 1-1 | sanitizer.tsの属性値エスケープ追加           | `domain/markdown/sanitizer.ts`             | 🔴 Major | low      |
| 1-2 | html-exporter.tsのthemeIdバリデーション      | `domain/export/html-exporter.ts`           | 🔴 Major | low      |
| 1-3 | Mermaid SVGのサニタイズ強化                  | `content/components/hooks/useMermaid.ts`   | 🔴 Major | medium   |
| 1-4 | background-handlerのランタイムバリデーション | `messaging/handlers/background-handler.ts` | 🔴 Major | medium   |
| 1-5 | HTMLエクスポートのサニタイズ適用             | `domain/export/html-exporter.ts`           | 🔴 Major | medium   |

#### 1-1: sanitizer.tsの属性値エスケープ追加

**問題:** onTagAttrでclass, href,
src属性値をそのままダブルクオートで囲んで返しているが、
value内のダブルクオートがエスケープされていない。属性値注入によるXSSの可能性。

**修正方針:**

- js-xssの`escapeAttrValue()`を使用、またはvalue内の`"`を`&quot;`にエスケープ
- 3箇所（class, href, src）すべてに適用

```typescript
// ❌ 現状 (sanitizer.ts:49-67)
return `class="${value}"`;
return `href="${value}"`;
return `src="${value}"`;

// ✅ 修正後
const safeValue = value.replace(/"/g, "&quot;");
return `class="${safeValue}"`;
return `href="${safeValue}"`;
return `src="${safeValue}"`;
```

**Files to Change:**

```
src/domain/markdown/sanitizer.ts         - onTagAttr属性値エスケープ追加
src/domain/markdown/sanitizer.test.ts    - 属性値インジェクションテスト追加
```

#### 1-2: html-exporter.tsのthemeIdバリデーション

**問題:** themeIdがclass属性にエスケープなしで埋め込まれている。

**修正方針:**

- shared/constants/themes.tsのVALID_THEMESリストでバリデーション
- 不正なthemeIdはデフォルトテーマにフォールバック

```typescript
// ✅ 修正後
import { THEME_IDS } from "../../shared/constants/themes.ts";

const safeThemeId = THEME_IDS.includes(themeId) ? themeId : DEFAULT_THEME_ID;
```

**Files to Change:**

```
src/domain/export/html-exporter.ts       - themeIdバリデーション追加
src/domain/export/html-exporter.test.ts  - 不正themeIdテスト追加
```

#### 1-3: Mermaid SVGのサニタイズ強化

**問題:**
Mermaidがレンダリングしたsvg文字列をcontainer.innerHTMLとして直接DOM挿入。
securityLevel: 'strict'設定はあるが、Mermaid自体の脆弱性発見時にリスク。

**修正方針:**

- SVG出力に対してDOMParser→XMLSerializer方式でサニタイズ
- script要素、onXXXイベント属性を除去してからinnerHTMLに設定
- または、sanitizeHTML()をSVG対応に拡張

```typescript
// ✅ SVGサニタイズ関数
function sanitizeSvg(svgString: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, "image/svg+xml");
  // script要素を除去
  doc.querySelectorAll("script").forEach((el) => el.remove());
  // onXXXイベント属性を除去
  doc.querySelectorAll("*").forEach((el) => {
    for (const attr of [...el.attributes]) {
      if (attr.name.startsWith("on")) el.removeAttribute(attr.name);
    }
  });
  return new XMLSerializer().serializeToString(doc.documentElement);
}
```

**Files to Change:**

```
src/content/components/hooks/useMermaid.ts    - SVGサニタイズ適用
src/domain/markdown/mermaid-renderer.ts       - sanitizeSvg関数追加（またはsanitizer.ts拡張）
tests/e2e/xss.spec.ts                        - Mermaid SVGサニタイズE2Eテスト強化
```

#### 1-4: background-handlerのランタイムバリデーション

**問題:**
受信メッセージの型チェックがTypeScriptのみ。ランタイムバリデーションなし。
CHECK_FILE_CHANGEのURLにisLocalUrl()チェックがなくSSRFリスク。

**修正方針:**

- 各メッセージハンドラにペイロードバリデーションを追加
- URL系はisLocalUrl()でローカル限定チェック
- 不正ペイロードはエラーレスポンスを返す

```typescript
// ✅ バリデーション例
case "CHECK_FILE_CHANGE": {
  const url = message.payload?.url;
  if (typeof url !== "string" || !isLocalUrl(url)) {
    return { success: false, error: "Invalid or non-local URL" };
  }
  // ... 処理
}
```

**Files to Change:**

```
src/messaging/handlers/background-handler.ts - ランタイムバリデーション追加
src/shared/utils/url-validator.ts            - isLocalUrl()をbackground側でも利用可能に
```

#### 1-5: HTMLエクスポートのサニタイズ適用

**問題:** エクスポート時にContent
ScriptのDOM内容が直接テンプレートに埋め込まれる。 Mermaid
SVGやMathJax出力はsanitizeHTML()未通過。

**免責:** Export機能は現在無効化中。復活時に必須対応。

**修正方針:**

- exportAsHTML()の引数htmlにsanitizeHTML()を適用
- または復活時のTODOコメントとして明記

**Files to Change:**

```
src/domain/export/html-exporter.ts       - sanitizeHTML()適用 or TODOコメント
```

---

### Phase 2: メモリリーク修正 (Critical/Major)

| #   | タスク                                               | 影響ファイル                                 | 重要度      | 推定工数 |
| --- | ---------------------------------------------------- | -------------------------------------------- | ----------- | -------- |
| 2-1 | useCopyButtonsのPreactコンポーネントアンマウント漏れ | `content/components/hooks/useCopyButtons.ts` | 🔴 Critical | medium   |
| 2-2 | content/index.tsのイベントリスナー未解除             | `content/index.ts`                           | 🔴 Major    | medium   |
| 2-3 | Mermaid一時SVG要素のDOMクリーンアップ                | `domain/markdown/mermaid-renderer.ts`        | 🔴 Major    | low      |

#### 2-1: useCopyButtonsのPreactコンポーネントアンマウント漏れ

**問題:** Preactのrender()で動的マウントしたCopyButtonコンポーネントが、
useEffectのクリーンアップでrender(null,
container)によるアンマウントを行っていない。
viewMode切り替えのたびにPreactコンポーネントツリー（イベントリスナー含む）がリークする。

**修正方針:**

- useEffect内でマウントしたコンテナのリストをRefで保持
- クリーンアップ関数でrender(null, container)を各コンテナに対して呼び出す

```typescript
// ✅ 修正後
const mountedContainersRef = useRef<HTMLElement[]>([]);

useEffect(() => {
  // ... マウント処理
  mountedContainersRef.current.push(container);
  render(h(CopyButton, { code }), container);

  return () => {
    // クリーンアップ: 全コンテナをアンマウント
    mountedContainersRef.current.forEach((c) => render(null, c));
    mountedContainersRef.current = [];
  };
}, [viewMode]);
```

**Files to Change:**

```
src/content/components/hooks/useCopyButtons.ts - アンマウント処理追加
src/content/components/hooks/useCopyButtons.test.ts - アンマウントテスト追加（既存テスト確認）
```

#### 2-2: content/index.tsのイベントリスナー未解除

**問題:** setupRelativeLinkHandlerのdocument.addEventListenerと
chrome.storage.onChanged.addListenerにremoveListenerが不在。

**修正方針:**

- AbortControllerで一括管理
- Content Scriptはページライフサイクルと同期なので実害は限定的だが、
  クリーンなリソース管理として実装

```typescript
// ✅ AbortController方式
const controller = new AbortController();
document.addEventListener("click", handler, { signal: controller.signal });
// cleanup時: controller.abort();
```

**Files to Change:**

```
src/content/index.ts - AbortController導入またはフラグ方式の理由コメント追記
```

#### 2-3: Mermaid一時SVG要素のDOMクリーンアップ

**問題:**
mermaid.render()が生成する一時SVG要素がDOMに残る可能性。テーマ変更で蓄積。

**修正方針:**

- render後にid属性で一時SVGを検索・削除

**Files to Change:**

```
src/domain/markdown/mermaid-renderer.ts - 一時SVG要素の削除処理追加
```

---

### Phase 3: レイヤー違反修正 + コード品質 (Critical/Major)

| #   | タスク                                        | 影響ファイル                                  | 重要度      | 推定工数 |
| --- | --------------------------------------------- | --------------------------------------------- | ----------- | -------- |
| 3-1 | MarkdownViewer→tocService直接依存の解消       | `content/components/MarkdownViewer.tsx`       | 🔴 Critical | medium   |
| 3-2 | services層でのchrome.runtime.getURL()例外整理 | `services/export-service.ts`, ADRドキュメント | 🔴 Critical | low      |
| 3-3 | ui-components層のmessaging直接import解消      | `ui-components/.../ExportMenuItem.tsx`        | 🔴 Critical | medium   |
| 3-4 | messaging層のCHECK_FILE_CHANGEロジック確認    | `messaging/handlers/background-handler.ts`    | 🔴 Major    | medium   |
| 3-5 | console.warn→logger.warn統一（4箇所）         | 各ファイル                                    | 🔴 Major    | low      |

#### 3-1: MarkdownViewer→tocService直接依存の解消

**問題:** content層がtocServiceを直接importしている。messaging経由が原則。

**修正方針:**

- 案A: TOC生成をmessaging経由に変更（GENERATE_TOCメッセージタイプ追加）
- 案B: tocService.generate()をdomain層の純粋関数として再配置しADR-007例外に追加

**推奨:** 案B - tocServiceの中身はdomain層関数の組み合わせのみであり、
extractHeadings→normalizeHeadingLevels→buildTocTreeの呼び出しチェーン。
domain直接呼び出しのADR-007例外として整理する方が自然。

**Files to Change:**

```
src/content/components/MarkdownViewer.tsx - toc生成をdomain直接呼び出しに変更 or messaging経由
docs/ARCHITECTURE_DECISIONS.md           - ADR-007更新
```

#### 3-2: services層でのchrome.runtime.getURL()例外整理

**問題:** export-service.tsでchrome.runtime.getURL()を使用。
ADR-007の例外「全層で許可」との整合性を明確化する必要がある。

**修正方針:**

- ADR-007の例外規定にservices層でのchrome.runtime.getURL()使用を明文化
- CLAUDE.mdのレイヤー表にも注記追加

**Files to Change:**

```
docs/ARCHITECTURE_DECISIONS.md - ADR-007例外の明文化
.claude/CLAUDE.md              - レイヤー表に注記追加
```

#### 3-3: ui-components層のmessaging直接import解消

**問題:** ExportMenuItem.tsxからmessaging/client.tsを直接import。

**免責:** Export機能は現在無効化中。復活時に必須対応。

**修正方針:**

- sendMessageの呼び出しをコールバックprops経由で親コンポーネントから注入する設計に変更
- 復活時のTODOコメントとして明記

**Files to Change:**

```
src/ui-components/markdown/DocumentHeaderMenu/ExportMenuItem.tsx - コールバックprops化 or TODOコメント
```

#### 3-4: messaging層CHECK_FILE_CHANGEのロジック確認

**前回サイクルで抽出済みだが**、レビューではまだ40行超のビジネスロジックが指摘されている。
現在の実装を確認し、残存ロジックがあれば追加でservices層に移動。

**Files to Change:**

```
src/messaging/handlers/background-handler.ts - 残存ロジックの確認・移動
src/services/file-change-service.ts          - 必要に応じて新規作成
```

#### 3-5: console.warn→logger.warn統一

**問題:** 4箇所でconsole.warnがlogger.warn()経由でなく直接使用。

**検出箇所:**

1. `src/domain/frontmatter/parser.ts:66, 81`
2. `src/background/service-worker.ts:42, 55`
3. `src/settings/options/components/RemoteUrlSettings.tsx:108`
4. `src/content/components/hooks/useMermaid.ts:55, 64, 108`

**修正方針:**

- logger.warn()に置換
- セキュリティ警告（frontmatter）は意図的なら理由コメント追加

**Files to Change:**

```
src/domain/frontmatter/parser.ts                       - logger.warn()に置換
src/background/service-worker.ts                       - logger.warn()に置換
src/settings/options/components/RemoteUrlSettings.tsx   - logger.warn()に置換
src/content/components/hooks/useMermaid.ts              - logger.warn()に置換
```

---

### Phase 4: パフォーマンス最適化 (Major)

| #   | タスク                          | 影響ファイル              | 重要度   | 推定工数 |
| --- | ------------------------------- | ------------------------- | -------- | -------- |
| 4-1 | highlight.js バンドルサイズ監視 | `scripts/build.ts`        | 🟡 Minor | low      |
| 4-2 | Markdown二重パース統合          | `services/toc-service.ts` | 🔴 Major | medium   |
| 4-3 | mathjax-full遅延読み込み        | `domain/math/renderer.ts` | 🔴 Major | high     |

#### 4-1: highlight.js バンドルサイズ監視（全言語維持）

**レビュー指摘:** highlight.js全言語バンドル（192言語,
~300-500KB）をCommon版（37言語）に変更すべき。

**トレードオフ分析の結果、全言語維持を決定:**

| 観点           | 全言語 (192)                 | Common (37)                                            |
| -------------- | ---------------------------- | ------------------------------------------------------ |
| 対応言語       | あらゆるコードブロックに対応 | Dockerfile, TOML, PowerShell, Scala, Haskell等が非対応 |
| ユーザー体験   | どんなMarkdownでもハイライト | 非対応言語はplaintextフォールバック                    |
| 保守コスト     | ゼロ                         | ゼロ                                                   |
| バンドルサイズ | 大（192言語分）              | 約1/5に削減                                            |

**決定理由:**

- Markdownビューアは「何が来るかわからない」汎用ツール。対応言語の広さ自体がプロダクトの強み
- Common版で漏れるDockerfile, TOML, PowerShell等は開発者のREADMEで頻出
- 非対応言語のplaintextフォールバックは「壊れてる？」とユーザーに思わせるリスク
- autoDetection未使用・明示的言語指定のため、登録言語数=対応言語数で直結
- **注意:**
  esbuildのtree-shakingはhighlight.jsのCJS形式に対して効かないことを確認済み

**代わりにバンドルサイズ監視を導入:**

- esbuildのmetafile出力を有効化し、highlight.jsの実際の寄与率を可視化
- 将来的にサイズが問題になった場合のベースラインデータとする

```typescript
// ✅ scripts/build.ts にmetafile出力を追加
const result = await esbuild.build({
  // ... 既存設定
  metafile: true,
});
// ビルドサイズレポート出力
const text = await esbuild.analyzeMetafile(result.metafile);
console.log(text);
```

**Files to Change:**

```
scripts/build.ts                         - metafile出力有効化
src/domain/markdown/highlighter.ts       - コメント更新（全言語維持の理由を明記）
```

#### 4-2: Markdown二重パース統合

**問題:**
MarkdownService.render()でmarked.parse()、TocService.generate()でmarked.lexer()と、
同一テキストを2回パース。

**調査結果: 統合不要（プロセス境界）**

実装確認の結果、二重パースは存在するが **統合できない** ことが判明：

1. `marked.parse()` → **Background Script**（Service
   Worker）でRENDER_MARKDOWNハンドラが呼出
2. `marked.lexer()` → **Content Script**（MarkdownViewer.tsx）でTOC生成時に呼出

Chrome拡張のService WorkerとContent Scriptは **別プロセス**
でメモリ空間を共有しない。
lexer結果をmessaging経由で送るとシリアライズ/デシリアライズのオーバーヘッドが発生し、
むしろパフォーマンス悪化する。markedのlexer/parseは十分高速で実用上問題なし。

**結論:** 現状維持（統合不要）。コメントで意図を明記。

#### 4-3: mathjax-full遅延読み込み

**問題:** AllPackagesは全TeX拡張を含む巨大パッケージ（content.jsの38.7%,
1730KB）。 トップレベルでRegisterHTMLHandler +
mathjax.document()を実行しており、 数式のないMarkdownでも初期化コストが発生。

**実施内容: 初期化遅延化**

- `RegisterHTMLHandler()` と `mathjax.document()` を遅延初期化に変更
- `mathDocument`をnullで初期化し、初回`renderMath()`呼び出し時のみ初期化
- `hasMathExpression()`がfalseの場合、初期化コストゼロ

**バンドルサイズ削減（動的import）は見送り:** esbuildでcode
splittingを有効にするには`splitting: true` + `outdir`が必要だが、 現在のContent
Scriptビルドは`outfile`（単一ファイル出力）を使用しているため、 dynamic
importしてもバンドルに含まれてしまう。ビルド構成の大幅変更が必要なため将来タスク。

**Files Changed:**

```
src/domain/math/renderer.ts - 遅延初期化（ensureInitialized()パターン）
```

---

### Phase 5: テスト強化 (Major)

| #   | タスク                                | 影響ファイル               | 重要度   | 推定工数 |
| --- | ------------------------------------- | -------------------------- | -------- | -------- |
| 5-1 | background-handler.tsのユニットテスト | `messaging/handlers/`      | 🔴 Major | medium   |
| 5-2 | export-service.tsのユニットテスト     | `services/`                | 🔴 Major | medium   |
| 5-3 | CIのE2E continue-on-error見直し       | `.github/workflows/ci.yml` | 🔴 Major | low      |

#### 5-1: background-handler.tsのユニットテスト

**問題:**
9種のメッセージルーティングにテストがない。ビジネスクリティカルなモジュール。

**修正方針:**

- StateManager・servicesをモックしてルーティングテストを追加
- 各メッセージタイプの正常系・異常系をカバー

**Files to Change:**

```
src/messaging/handlers/background-handler.test.ts - 新規作成
```

#### 5-2: export-service.tsのユニットテスト

**問題:** export-service.tsにテスト不在。

**Files to Change:**

```
src/services/export-service.test.ts - 新規作成
```

#### 5-3: CIのE2E continue-on-error見直し

**問題:** E2E失敗がcontinue-on-errorで無視されリグレッション混入リスク。

**修正方針:**

- continue-on-errorを削除
- または、セキュリティ関連E2E（xss.spec.ts等）は必須パスに設定

**Files to Change:**

```
.github/workflows/ci.yml - E2Eテスト設定見直し
```

---

### Phase 6: コード衛生 (Major/Minor)

| #   | タスク                         | 影響ファイル                          | 重要度   | 推定工数 |
| --- | ------------------------------ | ------------------------------------- | -------- | -------- |
| 6-1 | ThemeSelectorデータ共通化      | `settings/*/ThemeSelector.tsx`        | 🔴 Major | medium   |
| 6-2 | Export HTMLデッドコード整理    | `ui-components/DocumentHeaderMenu/`   | 🔴 Major | low      |
| 6-3 | content/index.tsモジュール分割 | `content/index.ts`                    | 🔴 Major | high     |
| 6-4 | Mermaid初期化の競合状態修正    | `domain/markdown/mermaid-renderer.ts` | 🔴 Major | medium   |

#### 6-1: ThemeSelectorデータ共通化

**問題:** popup/options両方で同一の6テーマデータを独立定義。DRY原則違反。

**注意:**
前回の調査ではUIが異なる（popup=ラベルのみ、options=説明+グリッド）ため
意図的な分離という見方もあるが、テーマメタデータ（ID、名前、説明）は共通化すべき。

**修正方針:**

- テーマメタデータをshared/constants/themes.tsに集約
- 各UIコンポーネントは共通データを参照してそれぞれの表示を実装

**Files to Change:**

```
src/shared/constants/themes.ts                       - テーマメタデータ追加
src/settings/popup/components/ThemeSelector.tsx       - 共通データ参照に変更
src/settings/options/components/ThemeSelector.tsx     - 共通データ参照に変更
```

#### 6-2: Export HTMLデッドコード整理

**問題:** DocumentHeaderMenu.tsx,
ExportMenuItem.tsxがどこからもimportされていない。

**修正方針:**

- 復活計画をADRに記録して期限設定
- デッドコードとして明示的にマーク（コメント追記）

**Files to Change:**

```
docs/ARCHITECTURE_DECISIONS.md - Export機能復活計画のADR記録
src/ui-components/markdown/DocumentHeaderMenu/ - 状態コメント追記
```

#### 6-3: content/index.tsモジュール分割

**問題:** 395行の巨大ファイル。テスタビリティ低下。

**修正方針:**

- 機能ごとにモジュール分割
  - content/hot-reload.ts - Hot Reload関連ロジック
  - content/relative-links.ts - 相対リンク処理
  - content/markdown-rendering.ts - Markdown描画制御
  - content/index.ts - エントリポイント（各モジュールの統合のみ）

**Files to Change:**

```
src/content/hot-reload.ts           - 新規: Hot Reload分割
src/content/relative-links.ts       - 新規: 相対リンク分割
src/content/markdown-rendering.ts   - 新規: 描画制御分割
src/content/index.ts                - エントリポイントのみに簡素化
```

#### 6-4: Mermaid初期化の競合状態修正

**問題:** initPromiseのwhileループによる並行初期化防止に、
複数呼び出しが同時にループを抜けた際の競合リスク。

**修正方針:**

- whileループ脱出後にinitPromiseの再チェックを追加
- または、Promiseベースのシングルトンパターンに完全移行

**Files to Change:**

```
src/domain/markdown/mermaid-renderer.ts - 競合状態修正
src/domain/markdown/mermaid-renderer.test.ts - 並行初期化テスト追加
```

---

### Phase 7: 長期検討事項 (Low)

| #   | タスク                                    | 推定工数 | 備考                          |
| --- | ----------------------------------------- | -------- | ----------------------------- |
| 7-1 | i18n対応（chrome.i18n API）               | high     | UIテキストハードコード解消    |
| 7-2 | WAI-ARIAタブパターン完全準拠              | medium   | アクセシビリティ改善          |
| 7-3 | CSPからunsafe-inline除去                  | high     | Manifest V3ベストプラクティス |
| 7-4 | MutationObserver導入でポーリング排除      | medium   | ToCの50msポーリング廃止       |
| 7-5 | ErrorBoundaryの本番スタックトレース非表示 | low      | 情報漏洩防止                  |

**注:** Phase
7は本サイクルでの実装は任意。優先度に応じて次サイクルに持ち越し可能。

---

## 📊 全体進行表

| Phase                       | タスク                                        | Status | 依存関係                       |
| --------------------------- | --------------------------------------------- | ------ | ------------------------------ |
| **Phase 1: セキュリティ**   |                                               |        |                                |
| 1-1                         | sanitizer属性値エスケープ                     | 🟢     |                                |
| 1-2                         | themeIdバリデーション                         | 🟢     |                                |
| 1-3                         | Mermaid SVGサニタイズ                         | 🟢     |                                |
| 1-4                         | ランタイムバリデーション                      | 🟢     |                                |
| 1-5                         | Exportサニタイズ（※無効化中）                 | 🟢     |                                |
| **Phase 2: メモリリーク**   |                                               |        |                                |
| 2-1                         | useCopyButtonsアンマウント                    | 🟢     |                                |
| 2-2                         | リスナー未解除修正                            | 🟢     |                                |
| 2-3                         | Mermaid一時SVGクリーンアップ                  | 🟢     |                                |
| **Phase 3: レイヤー/品質**  |                                               |        |                                |
| 3-1                         | MarkdownViewer→tocService解消                 | 🟢     |                                |
| 3-2                         | chrome.runtime.getURL()例外整理               | 🟢     |                                |
| 3-3                         | ExportMenuItem messaging解消（※無効化中）     | 🟢     |                                |
| 3-4                         | CHECK_FILE_CHANGEロジック確認                 | 🟢     |                                |
| 3-5                         | console.warn→logger.warn統一                  | 🟢     |                                |
| **Phase 4: パフォーマンス** |                                               |        |                                |
| 4-1                         | highlight.js バンドルサイズ監視（全言語維持） | 🟢     |                                |
| 4-2                         | Markdown二重パース統合                        | 🟢     | 統合不要（プロセス境界）       |
| 4-3                         | mathjax-full遅延読み込み                      | 🟢     | 初期化遅延化実施               |
| **Phase 5: テスト強化**     |                                               |        |                                |
| 5-1                         | background-handlerテスト                      | 🟢     | 23テスト追加                   |
| 5-2                         | export-serviceテスト                          | 🟢     | 6テスト追加                    |
| 5-3                         | CI E2E設定見直し                              | 🟢     | continue-on-error削除          |
| **Phase 6: コード衛生**     |                                               |        |                                |
| 6-1                         | ThemeSelectorデータ共通化                     | 🟢     | THEME_METADATA共通化           |
| 6-2                         | Exportデッドコード整理                        | 🟢     | ADR-008記録+NOTEコメント       |
| 6-3                         | content/index.tsモジュール分割                | 🟢     | 402行→189行（3モジュール分離） |
| 6-4                         | Mermaid初期化競合状態修正                     | 🟢     | Promiseシングルトンパターン    |
| **Phase 7: 長期検討**       |                                               |        |                                |
| 7-1                         | i18n対応                                      | ⚪     | 次サイクル持ち越し可           |
| 7-2                         | WAI-ARIAタブパターン準拠                      | ⚪     | 次サイクル持ち越し可           |
| 7-3                         | CSP unsafe-inline除去                         | ⚪     | 次サイクル持ち越し可           |
| 7-4                         | MutationObserver導入                          | ⚪     | 次サイクル持ち越し可           |
| 7-5                         | ErrorBoundary本番スタックトレース非表示       | ⚪     | 次サイクル持ち越し可           |

**Legend:** ⚪ Pending · 🟡 In Progress · 🟢 Done

---

## 🔒 Security Checklist

- [x] sanitizer.tsの属性値が全てエスケープされている
- [x] html-exporter.tsのthemeIdがバリデーション済み
- [x] Mermaid SVG出力がサニタイズされている
- [x] background-handlerの全ペイロードにランタイムバリデーションがある
- [x] CHECK_FILE_CHANGEのURLにisLocalUrl()チェックがある
- [x] Export HTMLにsanitizeHTML()が適用されている（復活時）→TODOコメント追加済み
- [x] console.warnが全てlogger.warn()経由になっている（domain層はDEBUG定数制約のため除外、理由コメント追記済み）
- [x] 全ユニットテスト通過（331テスト）
- [x] 全E2Eテスト通過（87テスト通過、14スキップ（Export無効化中のため）、0失敗）

---

## ⏱️ 推定工数

| Phase                   | 推定時間       | コミット数 | 備考                         |
| ----------------------- | -------------- | ---------- | ---------------------------- |
| Phase 1: セキュリティ   | 2時間          | 2-3        | XSS対策が最優先              |
| Phase 2: メモリリーク   | 1.5時間        | 1-2        | useCopyButtonsが最重要       |
| Phase 3: レイヤー       | 1.5時間        | 2          | ADR整理含む                  |
| Phase 4: パフォーマンス | 2.5時間        | 2-3        | mathjax-fullが高工数         |
| Phase 5: テスト         | 2時間          | 1-2        | モック設計が要               |
| Phase 6: コード衛生     | 3時間          | 2-3        | content/index.ts分割が高工数 |
| Phase 7: 長期検討       | 8時間+         | 3-5        | 次サイクル持ち越し可         |
| **合計（Phase1-6）**    | **約12.5時間** | **10-16**  |                              |
| **合計（全Phase）**     | **約20時間+**  | **13-21**  |                              |

---

## 📝 免責事項・注意点

### Export機能関連（Phase 1-5, 3-3, 6-2）

Export HTML機能は現在無効化中。以下のタスクは**復活決定時まで最小対応**とする：

- 1-5: TODOコメントで明記、実コード変更は復活時に実施
- 3-3: ExportMenuItemのmessaging直接importもTODOコメント対応
- 6-2: ADRに復活計画を記録、コードは保持

### Markdown二重パース（Phase 4-2）

前回サイクルで「除去済み」とされたが、レビューでは依然として指摘あり。
実装を再確認し、実際の状態に応じて対応を決定する。

### ThemeSelector重複（Phase 6-1）

popup/optionsでUIが異なるため、完全な統一ではなく**メタデータの共通化**に留める。
UIコンポーネント自体の統一は行わない。

---

**Next:** Phase 1から順番に着手 → テスト → 実装 → コミット 🚀
