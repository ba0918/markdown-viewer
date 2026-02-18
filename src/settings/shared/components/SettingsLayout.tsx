import { h as _h } from "preact";
import type { ComponentChildren } from "preact";
import type { AppState } from "../../../shared/types/state.ts";

interface SettingsLayoutProps {
  /** ラッパーdivのCSSクラス名（"popup" | "options"） */
  className: string;
  /** 設定状態（null = 未読み込み） */
  settings: AppState | null;
  /** 読み込み中フラグ */
  loading: boolean;
  /** エラーメッセージ */
  error: string | null;
  /** 再読み込みコールバック */
  onRetry: () => void;
  /**
   * 設定読み込み完了時のコンテンツ（Render Props）
   *
   * settingsがnon-nullであることが型レベルで保証される。
   * JSXのchildren式は親レンダリング時に即時評価されるため、
   * 通常のComponentChildrenパターンではsettings!アクセスが
   * loading中にnullアクセスエラーを起こす。
   * Render Propsパターンにより遅延評価を実現。
   */
  children: (settings: AppState) => ComponentChildren;
}

/**
 * Settings画面の共通レイアウト
 *
 * Popup/Optionsで共通のloading/error/null settingsの3状態ガードを一元化。
 * children（Render Props）にはnon-nullなsettingsが渡されるため、
 * 呼び出し側で安全にsettingsのプロパティにアクセスできる。
 *
 * @example
 * ```tsx
 * <SettingsLayout
 *   className="popup"
 *   settings={settings}
 *   loading={loading}
 *   error={error}
 *   onRetry={loadSettings}
 * >
 *   {(settings) => (
 *     <>
 *       <header class="header">...</header>
 *       <main class="content">
 *         <ThemeSelector current={settings.theme} onChange={handleThemeChange} />
 *       </main>
 *     </>
 *   )}
 * </SettingsLayout>
 * ```
 */
export const SettingsLayout = ({
  className,
  settings,
  loading,
  error,
  onRetry,
  children,
}: SettingsLayoutProps) => {
  if (loading) {
    return (
      <div class={className}>
        <div class="loading">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div class={className}>
        <div class="error">
          Error: {error}
          <button type="button" onClick={onRetry} class="retry-btn">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div class={className}>
        <div class="error">Failed to load settings</div>
      </div>
    );
  }

  return <div class={className}>{children(settings)}</div>;
};
