import { h as _h } from "preact";
import { CopyButton } from "../shared/CopyButton.tsx";

/**
 * CodeBlock コンポーネント
 *
 * 責務: コードブロックの表示 + コピーボタン
 * レイヤー: ui-components/markdown層
 *
 * ❌ 禁止: ビジネスロジック、messaging直接呼び出し
 * ✅ OK: 再利用可能なUI部品
 */

interface Props {
  /** コードの内容 */
  code: string;
  /** 言語（syntax highlighting用） */
  language?: string;
  /** カスタムクラス名 */
  className?: string;
}

export const CodeBlock = ({ code, language, className }: Props) => {
  const codeClassName = language ? `language-${language}` : "";
  const blockClassName = className || "code-block-wrapper";

  return (
    <div class={blockClassName}>
      <CopyButton
        text={code}
        className="code-block-copy-button"
        ariaLabel="Copy code to clipboard"
        title="Copy code"
      />
      <pre class={codeClassName}>
        <code class={codeClassName}>{code}</code>
      </pre>
    </div>
  );
};
