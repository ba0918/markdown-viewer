import { Component, h as _h } from "preact";
import type { ComponentChildren } from "preact";

/**
 * ErrorBoundary コンポーネント
 * エラー発生時のフォールバック表示
 */

interface Props {
  children: ComponentChildren;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static override getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, errorInfo: unknown) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          class="error-container"
          style={{
            padding: "2rem",
            background: "#fff5f5",
            border: "1px solid #fc8181",
            borderRadius: "4px",
            color: "#c53030",
          }}
        >
          <h1>⚠️ Error</h1>
          <p>{this.state.error.message}</p>
          <details style={{ marginTop: "1rem" }}>
            <summary>詳細</summary>
            <pre
              style={{
                background: "#f7fafc",
                padding: "1rem",
                borderRadius: "4px",
                overflow: "auto",
                fontSize: "0.875rem",
              }}
            >
              {this.state.error.stack}
            </pre>
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}
