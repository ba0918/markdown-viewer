import { h as _h } from "preact";
import { useEffect, useState } from "preact/hooks";
import { sendMessage } from "../../messaging/client.ts";
import { ThemeSelector } from "./components/ThemeSelector.tsx";
import { HotReloadSettings } from "./components/HotReloadSettings.tsx";
import type { AppState } from "../../shared/types/state.ts";
import type { Theme } from "../../shared/types/theme.ts";

/**
 * Options メインコンポーネント
 *
 * 責務: messaging I/O のみ、UI状態管理
 * レイヤー: settings/options層
 *
 * ❌ 絶対禁止: services/domain直接呼び出し
 * ✅ OK: messaging経由でのみ通信
 */
export const App = () => {
  const [settings, setSettings] = useState<AppState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // 初期設定の読み込み
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await sendMessage<AppState>({
        type: "GET_SETTINGS",
        payload: {},
      });
      setSettings(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const handleThemeChange = async (theme: Theme) => {
    try {
      setError(null);
      setSaveMessage(null);
      await sendMessage({
        type: "UPDATE_THEME",
        payload: { themeId: theme },
      });
      setSettings({ ...settings!, theme });
      setSaveMessage("テーマを保存しました ✓");
      setTimeout(() => setSaveMessage(null), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update theme");
    }
  };

  const handleHotReloadChange = async (
    enabled: boolean,
    interval?: number,
    autoReload?: boolean,
  ) => {
    try {
      setError(null);
      setSaveMessage(null);

      // Hot Reload設定の更新
      await sendMessage({
        type: "UPDATE_HOT_RELOAD",
        payload: {
          enabled,
          interval: interval ?? settings!.hotReload.interval,
          autoReload: autoReload ?? settings!.hotReload.autoReload,
        },
      });

      // ローカル状態を更新
      setSettings({
        ...settings!,
        hotReload: {
          enabled,
          interval: interval ?? settings!.hotReload.interval,
          autoReload: autoReload ?? settings!.hotReload.autoReload,
        },
      });

      setSaveMessage("設定を保存しました ✓");
      setTimeout(() => setSaveMessage(null), 2000);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update hot reload settings",
      );
    }
  };

  if (loading) {
    return (
      <div class="options">
        <div class="loading">読み込み中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div class="options">
        <div class="error">
          エラー: {error}
          <button type="button" onClick={loadSettings} class="retry-btn">
            再試行
          </button>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div class="options">
        <div class="error">設定を読み込めませんでした</div>
      </div>
    );
  }

  return (
    <div class="options">
      <header class="header">
        <h1 class="title">⚙️ Markdown Viewer 設定</h1>
        <p class="subtitle">詳細な設定を行えます</p>
      </header>

      <main class="content">
        {saveMessage && <div class="save-message">{saveMessage}</div>}

        <section class="section">
          <h2 class="section-title">外観</h2>
          <ThemeSelector
            current={settings.theme}
            onChange={handleThemeChange}
          />
        </section>

        <section class="section">
          <h2 class="section-title">開発者向け機能</h2>
          <HotReloadSettings
            enabled={settings.hotReload.enabled}
            interval={settings.hotReload.interval}
            autoReload={settings.hotReload.autoReload}
            onChange={handleHotReloadChange}
          />
        </section>
      </main>

      <footer class="footer">
        <div class="links">
          <a
            href="https://github.com/ba0918/markdown-viewer"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
        </div>
      </footer>
    </div>
  );
};
