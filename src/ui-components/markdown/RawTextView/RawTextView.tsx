import { h as _h } from "preact";
import { CopyButton } from "../../shared/CopyButton.tsx";

/**
 * RawTextViewコンポーネント
 *
 * 責務: Rawモードで元のMarkdownテキストを表示、コピー機能
 * ❌ 禁止: ビジネスロジック、messaging直接呼び出し
 */

interface Props {
  rawMarkdown: string;
}

export const RawTextView = ({ rawMarkdown }: Props) => {
  return (
    <div class="raw-text-view">
      <CopyButton
        text={rawMarkdown}
        className="raw-text-copy-button"
        ariaLabel="Copy raw markdown to clipboard"
        title="Copy to clipboard"
      />
      <pre class="raw-text-content">
        <code>{rawMarkdown}</code>
      </pre>
    </div>
  );
};
