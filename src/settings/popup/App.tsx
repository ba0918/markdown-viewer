import { Fragment as _Fragment, h as _h } from "preact";
import { ThemeSelector } from "./components/ThemeSelector.tsx";
import { useSettings } from "../shared/hooks/useSettings.ts";
import { SettingsLayout } from "../shared/components/SettingsLayout.tsx";

/**
 * Popup メインコンポーネント
 *
 * ツールバーアイコンクリック時に表示されるPopup UI。
 * messaging経由でテーマ設定の読み込み・保存を行う。
 */
export const App = () => {
  const { settings, loading, error, handleThemeChange, loadSettings } =
    useSettings();

  return (
    <SettingsLayout
      className="popup"
      settings={settings}
      loading={loading}
      error={error}
      onRetry={loadSettings}
    >
      {(settings) => (
        <>
          <header class="header">
            <h1 class="title">🎨 Markdown Viewer</h1>
          </header>

          <main class="content">
            <ThemeSelector
              current={settings.theme}
              onChange={handleThemeChange}
            />
          </main>
        </>
      )}
    </SettingsLayout>
  );
};
