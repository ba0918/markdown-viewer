import { h as _h } from "preact";
import { ThemeSelector } from "./components/ThemeSelector.tsx";
import { useSettings } from "../shared/hooks/useSettings.ts";

/**
 * Popup メインコンポーネント
 *
 * ツールバーアイコンクリック時に表示されるPopup UI。
 * messaging経由でテーマ設定の読み込み・保存を行う。
 */
export const App = () => {
  const { settings, loading, error, handleThemeChange, loadSettings } =
    useSettings();

  if (loading) {
    return (
      <div class="popup">
        <div class="loading">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div class="popup">
        <div class="error">
          Error: {error}
          <button type="button" onClick={loadSettings} class="retry-btn">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div class="popup">
        <div class="error">Failed to load settings</div>
      </div>
    );
  }

  return (
    <div class="popup">
      <header class="header">
        <h1 class="title">🎨 Markdown Viewer</h1>
      </header>

      <main class="content">
        <ThemeSelector current={settings.theme} onChange={handleThemeChange} />
      </main>
    </div>
  );
};
