# コーディング原則

このドキュメントでは、**コード重複**、**レイヤー混同**、**原則違反**を徹底的に排除するためのルールを定めます。

**重要**: このプロジェクトは過去の失敗（DuckDB +
offscreen）から学んだ教訓を活かした設計になっています。各層の責務を厳格に守ってください。

---

## 🚫 絶対禁止事項

### 1. messaging層にビジネスロジックを書く

**これは過去に大失敗したパターンです！**

**NG例:**

```typescript
// ❌ ダメ！！！messaging層でビジネスロジック
// src/messaging/handlers/background-handler.ts
export const handleBackgroundMessage = async (message: Message) => {
  switch (message.type) {
    case "RENDER_MARKDOWN":
      // ❌ ここでMarkdown処理 → 死亡フラグ
      const parsed = marked.parse(message.payload.markdown);
      const sanitized = DOMPurify.sanitize(parsed);
      const theme = await chrome.storage.sync.get("theme");
      const styled = applyTheme(sanitized, theme);
      return { success: true, data: styled };
  }
};
```

**OK例:**

```typescript
// ✅ OK: serviceに委譲するだけ
// src/messaging/handlers/background-handler.ts
import { markdownService } from "../../services/markdown-service.ts";

export const handleBackgroundMessage = async (message: Message) => {
  switch (message.type) {
    case "RENDER_MARKDOWN":
      // ✅ serviceに委譲
      const html = await markdownService.render(
        message.payload.markdown,
        message.payload.themeId,
      );
      return { success: true, data: html };
  }
};
```

**理由:**

- offscreenが絡むとメッセージ経路が複雑怪奇になる
- テストが困難（messagingの仕組みごとテスト必要）
- 責務の混在で管理不能に

---

### 2. UI層（background/content/settings）にビジネスロジックを書く

**NG例:**

```typescript
// ❌ ダメ！content層でMarkdown処理
// src/content/index.ts
import { marked } from "marked";
import DOMPurify from "dompurify";

const init = async () => {
  const markdown = document.body.textContent || "";

  // ❌ ビジネスロジックを直接実装
  const rawHTML = marked.parse(markdown);
  const cleanHTML = DOMPurify.sanitize(rawHTML);

  document.body.innerHTML = cleanHTML;
};
```

**OK例:**

```typescript
// ✅ OK: messaging経由でserviceを利用
// src/content/index.ts
import { sendMessage } from "../messaging/client.ts";

const init = async () => {
  const markdown = document.body.textContent || "";

  // ✅ messaging経由
  const html = await sendMessage({
    type: "RENDER_MARKDOWN",
    payload: { markdown, themeId: "light" },
  });

  document.body.innerHTML = "";
  render(<MarkdownViewer html={html} />, document.body);
};
```

**理由:**

- UI層は messaging I/O のみに専念
- offscreen対応でも破綻しない
- テスト容易性

---

### 3. services層がdomain層を飛ばしてChrome APIを叩く

**NG例:**

```typescript
// ❌ ダメ！services層でChrome API直接使用
// src/services/theme-service.ts
export class ThemeService {
  async load(themeId: string): Promise<Theme> {
    // ❌ Chrome API直接使用
    const result = await chrome.storage.sync.get("theme");
    return result.theme || "light";
  }
}
```

**OK例:**

```typescript
// ✅ OK: domain層を使う
// src/domain/theme/loader.ts
export const loadTheme = async (themeId?: string): Promise<ThemeData> => {
  // テーマデータの読み込みロジック（純粋関数）
  const themes = {
    light: { id: "light", css: "..." },
    dark: { id: "dark", css: "..." },
  };
  return themes[themeId || "light"];
};

// src/services/theme-service.ts
import { loadTheme } from "../domain/theme/loader.ts";

export class ThemeService {
  async load(themeId: string): Promise<ThemeData> {
    // ✅ domain層を使う
    return await loadTheme(themeId);
  }
}
```

**理由:**

- services層はChrome API使用禁止
- Chrome API操作はbackground層の責務
- 状態管理はbackground/state-manager.tsで行う

---

### 4. domain層が他のdomainに依存する

**NG例:**

```typescript
// ❌ ダメ！domain間の依存
// src/domain/markdown/parser.ts
import { loadTheme } from "../theme/loader.ts"; // ← NG！

export const parseMarkdown = (markdown: string): string => {
  const theme = await loadTheme("light"); // ← NG！
  // ...
};
```

**OK例:**

```typescript
// ✅ OK: 純粋関数として実装
// src/domain/markdown/parser.ts
export const parseMarkdown = (markdown: string): string => {
  // 他のdomainに依存しない
  return marked.parse(markdown) as string;
};

// src/services/markdown-service.ts
import { parseMarkdown } from "../domain/markdown/parser.ts";
import { loadTheme } from "../domain/theme/loader.ts";
import { applyTheme } from "../domain/theme/applier.ts";

export class MarkdownService {
  async render(markdown: string, themeId?: string): Promise<string> {
    // ✅ services層でdomainを組み合わせる
    const theme = await loadTheme(themeId);
    const parsed = parseMarkdown(markdown);
    return applyTheme(parsed, theme);
  }
}
```

**理由:**

- domain層は純粋関数のみ
- domain間の組み合わせはservices層の責務
- テスト容易性

---

### 5. 同ドメイン内でのコード重複

**NG例:**

```typescript
// ❌ ダメ！重複コード
// src/domain/markdown/parser.ts
const escapeHtml = (text: string) => {
  return text.replace(/[&<>"']/g, (char) => {
    // エスケープ処理
  });
};

// src/services/markdown-service.ts
const escapeHtml = (text: string) => { // ← 重複！
  return text.replace(/[&<>"']/g, (char) => {
    // 同じエスケープ処理
  });
};
```

**OK例:**

```typescript
// ✅ OK: shared/に共通化
// src/shared/utils/html.ts
export const escapeHtml = (text: string): string => {
  return text.replace(/[&<>"']/g, (char) => {
    const escapeMap: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return escapeMap[char] || char;
  });
};

// 各層でimport
import { escapeHtml } from "../../shared/utils/html.ts";
```

**ルール:**

- 同じロジックは**一度だけ**実装
- 2回目に同じコードを書きたくなったら`shared/`に移動
- 「ほぼ同じ」でも許さない → 共通化してパラメータで分岐

---

## ✅ レイヤー分離の原則

### ディレクトリ構造と責務

```
src/
  background/          # Service Worker層
    責務: messaging I/O のみ、状態管理
    禁止: ビジネスロジック、ドメインロジック
    依存: messaging/, shared/

  content/             # Content Script層
    責務: messaging I/O のみ、UI描画
    禁止: ビジネスロジック、services/domain直接呼び出し
    依存: ui-components/, messaging/, shared/

  offscreen/           # Offscreen Document層
    責務: messaging I/O のみ
    禁止: ビジネスロジック、services/domain直接呼び出し
    依存: messaging/, shared/

  settings/            # 設定画面層
    責務: messaging I/O のみ、設定UI
    禁止: ビジネスロジック、services/domain直接呼び出し
    依存: ui-components/, messaging/, shared/

  ui-components/       # UI部品層
    責務: 再利用可能なUIコンポーネント
    禁止: ビジネスロジック、messaging直接呼び出し
    依存: shared/

  messaging/           # メッセージング層
    責務: ルーティングのみ、serviceへの委譲
    禁止: ビジネスロジック、domain直接呼び出し
    依存: services/, shared/

  services/            # サービス層
    責務: ドメイン組み合わせ、ビジネスフロー
    禁止: Chrome API直接使用、UI処理
    依存: domain/, shared/

  domain/              # ドメイン層
    責務: 純粋なビジネスロジック（単一責任）
    禁止: 他domainへの依存、副作用の隠蔽
    依存: shared/

  shared/              # 共通層
    責務: 汎用ユーティリティ（ドメイン非依存）
    禁止: Chrome API、特定レイヤーへの依存
    依存: なし
```

### 依存関係ルール

```
┌──────────────────────────────────────────────────────┐
│              UI Layer (実行コンテキスト)                │
│  background/ content/ offscreen/ settings/           │
│  ❗ messaging とのやり取り"のみ"                       │
└────────────────────┬─────────────────────────────────┘
                     │
                     ↓
         ┌───────────────────────┐
         │   ui-components/      │
         └───────────────────────┘
                     │
                     ↓
         ┌───────────────────────┐
         │    messaging/         │ ← ルーティングのみ
         └───────────┬───────────┘
                     │
                     ↓
         ┌───────────────────────┐
         │     services/         │ ← ドメイン組み合わせ
         └───────────┬───────────┘
                     │
                     ↓
         ┌───────────────────────┐
         │      domain/          │ ← 純粋関数
         └───────────┬───────────┘
                     │
                     ↓
         ┌───────────────────────┐
         │      shared/          │
         └───────────────────────┘
```

**絶対禁止:**

- `shared/` → 他レイヤーへの依存
- `messaging/` → `domain/` 直接呼び出し（必ず `services/` 経由）
- `content/settings` → `services/domain` 直接呼び出し（必ず `messaging` 経由）
- 循環依存

---

## 📋 実装時のチェックリスト

### 新しいコードを書く前に

#### 1. このコードはどのレイヤーか？

- [ ] UI層（background/content/offscreen/settings）
- [ ] UI部品層（ui-components）
- [ ] メッセージング層（messaging）
- [ ] サービス層（services）
- [ ] ドメイン層（domain）
- [ ] 共通層（shared）

#### 2. 責務は適切か？

- [ ] UI層 → messaging I/O のみ？
- [ ] messaging層 → ルーティングのみ？
- [ ] services層 → ドメイン組み合わせ？
- [ ] domain層 → 純粋関数？
- [ ] shared層 → ドメイン非依存？

#### 3. 既存コード確認

- [ ] 同じ処理が既に存在しないか？
- [ ] 似た処理が他のファイルにないか？
- [ ] `shared/`に汎用化できないか？

#### 4. 依存関係は正しいか？

- [ ] import文の方向を確認
- [ ] 逆方向の依存がないか
- [ ] 循環依存がないか

---

## 📋 コードレビュー時のチェックリスト

### 必須チェック項目

#### 1. レイヤー違反チェック

- [ ] background/content/offscreen/settings に ビジネスロジックがないか
- [ ] messaging層 に ビジネスロジックがないか
- [ ] services層 が Chrome API を直接使っていないか
- [ ] domain層 が 他domainに依存していないか
- [ ] UI層 が services/domain を直接呼んでいないか

#### 2. コード重複チェック

- [ ] `git grep "同じパターン"` で検索
- [ ] 類似コードが3箇所以上 → 即リファクタリング

#### 3. 型安全性チェック

- [ ] `any`型の使用箇所
- [ ] 型アサーションの妥当性
- [ ] 全関数に型注釈があるか

#### 4. テスト可能性チェック

- [ ] 純粋関数か？
- [ ] 依存が注入可能か？
- [ ] テストが書かれているか？

---

## 🛠️ 実装パターン

### パターン1: 新しいMarkdown機能の追加

```typescript
// Step 1: domain層に純粋関数を追加
// src/domain/markdown/table-formatter.ts
export const formatTable = (html: string): string => {
  // 純粋関数として実装
  return html; // テーブル整形ロジック
};

// src/domain/markdown/table-formatter.test.ts
Deno.test("formatTable: 基本的な整形", () => {
  const input = "<table>...</table>";
  const output = formatTable(input);
  assertEquals(output.includes("formatted"), true);
});

// Step 2: services層でdomain組み合わせ
// src/services/markdown-service.ts
import { formatTable } from "../domain/markdown/table-formatter.ts";

export class MarkdownService {
  async render(markdown: string, themeId?: string): Promise<string> {
    const theme = await loadTheme(themeId);
    const parsed = parseMarkdown(markdown);
    const sanitized = sanitizeHTML(parsed);
    const formatted = formatTable(sanitized); // ← 追加
    return applyTheme(formatted, theme);
  }
}

// Step 3: messaging層は変更不要（すでにserviceに委譲している）

// Step 4: UI層も変更不要（messagingを使っている）
```

### パターン2: 新しいメッセージタイプの追加

```typescript
// Step 1: 型定義を追加
// src/shared/types/message.ts
export type Message =
  | { type: "RENDER_MARKDOWN"; payload: { markdown: string; themeId?: string } }
  | { type: "EXPORT_PDF"; payload: { markdown: string } }; // ← 追加

// Step 2: services層に実装
// src/services/pdf-service.ts
export class PdfService {
  async generate(markdown: string): Promise<Blob> {
    // PDF生成ロジック
  }
}

// Step 3: messaging層にルーティング追加
// src/messaging/handlers/background-handler.ts
import { pdfService } from "../../services/pdf-service.ts";

export const handleBackgroundMessage = async (message: Message) => {
  switch (message.type) {
    // ...
    case "EXPORT_PDF":
      const pdf = await pdfService.generate(message.payload.markdown);
      return { success: true, data: pdf };
  }
};

// Step 4: UI層から呼び出し
// src/settings/options/components/ExportButton.tsx
const handleExport = async () => {
  const pdf = await sendMessage({
    type: "EXPORT_PDF",
    payload: { markdown },
  });
  // PDFダウンロード処理
};
```

### パターン3: offscreen を使う場合

```typescript
// Step 1: services層に実装（offscreen非依存）
// src/services/database-service.ts
export class DatabaseService {
  async query(sql: string): Promise<QueryResult> {
    // DuckDB を使ったクエリ実行
  }
}

// Step 2: messaging/handlers/offscreen-handler.ts
import { databaseService } from "../../services/database-service.ts";

export const handleOffscreenMessage = async (message: Message) => {
  switch (message.type) {
    case "EXECUTE_QUERY":
      const result = await databaseService.query(message.payload.sql);
      return { success: true, data: result };
  }
};

// Step 3: offscreen層（messaging I/O のみ）
// src/offscreen/index.ts
import { handleOffscreenMessage } from "../messaging/handlers/offscreen-handler.ts";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleOffscreenMessage(message)
    .then(sendResponse)
    .catch((error) => sendResponse({ success: false, error: error.message }));
  return true;
});

// Step 4: content層から利用
// src/content/index.ts
const result = await sendMessage({
  type: "EXECUTE_QUERY",
  payload: { sql: "SELECT * FROM users" },
});
```

---

## 📖 参考原則

このプロジェクトで遵守する設計原則：

1. **DRY (Don't Repeat Yourself)**
   - コードは一度だけ書く
   - 重複は即座に共通化

2. **単一責任の原則 (SRP)**
   - 各レイヤーは一つの責務のみ
   - 変更理由は一つだけ

3. **依存性逆転の原則 (DIP)**
   - 上位層は下位層に依存
   - 逆方向の依存は禁止

4. **責務分離の原則（過去の失敗から）**
   - messaging層にビジネスロジックを持たせない
   - UI層にビジネスロジックを持たせない
   - offscreen対応でも破綻しない設計

5. **型安全性の原則**
   - 型で制約を表現
   - ランタイムエラーを型で防ぐ

6. **テスト容易性の原則**
   - 純粋関数優先
   - 依存は注入可能に

---

## ❌ Bad Examples集

### Bad Example 1: messaging層にビジネスロジック（最悪）

```typescript
// ❌ NG: 過去に失敗したパターン
// src/messaging/handlers/background-handler.ts
export const handleBackgroundMessage = async (message: Message) => {
  switch (message.type) {
    case "RENDER_MARKDOWN":
      // ❌ messagingでMarkdown処理 → 死亡フラグ
      const parsed = marked.parse(message.payload.markdown);
      const sanitized = DOMPurify.sanitize(parsed);
      const theme = await loadTheme(message.payload.themeId);
      const styled = applyTheme(sanitized, theme);
      return { success: true, data: styled };
  }
};

// ✅ OK: serviceに委譲
export const handleBackgroundMessage = async (message: Message) => {
  switch (message.type) {
    case "RENDER_MARKDOWN":
      const html = await markdownService.render(
        message.payload.markdown,
        message.payload.themeId,
      );
      return { success: true, data: html };
  }
};
```

### Bad Example 2: UI層がservices/domainを直接呼ぶ

```typescript
// ❌ NG: content層でdomainを直接呼び出し
// src/content/index.ts
import { parseMarkdown } from "../domain/markdown/parser.ts"; // ← ダメ！
const html = parseMarkdown(markdown); // ← ダメ！

// ✅ OK: messaging経由
import { sendMessage } from "../messaging/client.ts";
const html = await sendMessage({
  type: "RENDER_MARKDOWN",
  payload: { markdown },
});
```

### Bad Example 3: services層がChrome APIを叩く

```typescript
// ❌ NG: services層でChrome API
// src/services/theme-service.ts
export class ThemeService {
  async load(): Promise<Theme> {
    const result = await chrome.storage.sync.get("theme"); // ← ダメ！
    return result.theme;
  }
}

// ✅ OK: domain層を使う
// src/domain/theme/loader.ts
export const loadTheme = async (themeId?: string): Promise<ThemeData> => {
  // テーマデータの読み込みロジック（純粋関数）
};
```

---

## ✅ 実装時の心構え

1. **レイヤーを意識**
   - 今書こうとしているコードはどのレイヤーか
   - 依存方向は正しいか

2. **過去の失敗を繰り返さない**
   - messaging層にビジネスロジックを書かない
   - offscreen対応を考慮した設計

3. **型を先に定義**
   - 実装前に型定義
   - 型で設計を表現

4. **テストを書く**
   - TDDサイクル遵守
   - テストできない設計は悪い設計

5. **迷ったら分離**
   - 「これは共通化すべきか？」→ Yes
   - 「これはレイヤー違反か？」→ 分離

**原則を守れば、offscreen
を含む複雑なChrome拡張でも保守性の高いコードベースが実現できます。**
