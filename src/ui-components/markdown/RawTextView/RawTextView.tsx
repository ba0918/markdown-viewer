import { h as _h } from "preact";
import { CopyButton } from "../../shared/CopyButton.tsx";

/**
 * RawTextViewコンポーネント
 *
 * Rawモードで元のMarkdownテキスト（Frontmatter含む）をプレーンテキストとして表示する。
 * コピーボタン付き。
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
