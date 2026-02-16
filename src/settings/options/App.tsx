import { h as _h } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { sendMessage } from "../../messaging/client.ts";
import { ThemeSelector } from "./components/ThemeSelector.tsx";
import { HotReloadSettings } from "./components/HotReloadSettings.tsx";
import { RemoteUrlSettings } from "./components/RemoteUrlSettings.tsx";
import type { AppState } from "../../shared/types/state.ts";
import type { Theme } from "../../shared/types/theme.ts";

/**
 * Options メインコンポーネント
 *
 * フル機能の設定画面UI。テーマ選択、Hot Reload設定、カスタムURL設定を提供。
 * messaging経由で設定の読み込み・保存を行う。
 */
export const App = () => {
  const [settings, setSettings] = useState<AppState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  // メモリリーク防止: saveMessageタイマーを管理
  const saveMessageTimerRef = useRef<
    ReturnType<typeof globalThis.setTimeout> | null
  >(null);

  // 初期設定の読み込み
  useEffect(() => {
    loadSettings();
  }, []);

  // メモリリーク防止: アンマウント時にタイマーをクリア
  useEffect(() => {
    return () => {
      if (saveMessageTimerRef.current !== null) {
        globalThis.clearTimeout(saveMessageTimerRef.current);
      }
    };
  }, []);

  // saveMessage表示用のヘルパー関数（タイマー管理付き）
  const showSaveMessage = (message: string) => {
    // 既存のタイマーをクリア
    if (saveMessageTimerRef.current !== null) {
      globalThis.clearTimeout(saveMessageTimerRef.current);
    }
    setSaveMessage(message);
    saveMessageTimerRef.current = globalThis.setTimeout(
      () => setSaveMessage(null),
      2000,
    );
  };

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
    if (!settings) return; // nullガード追加
    try {
      setError(null);
      setSaveMessage(null);
      await sendMessage({
        type: "UPDATE_THEME",
        payload: { themeId: theme },
      });
      setSettings({ ...settings, theme });
      showSaveMessage("Theme saved ✓");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update theme");
    }
  };

  const handleHotReloadChange = async (
    enabled: boolean,
    interval?: number,
    autoReload?: boolean,
  ) => {
    if (!settings) return; // nullガード追加
    try {
      setError(null);
      setSaveMessage(null);

      // Hot Reload設定の更新
      await sendMessage({
        type: "UPDATE_HOT_RELOAD",
        payload: {
          enabled,
          interval: interval ?? settings.hotReload.interval,
          autoReload: autoReload ?? settings.hotReload.autoReload,
        },
      });

      // ローカル状態を更新
      setSettings({
        ...settings,
        hotReload: {
          enabled,
          interval: interval ?? settings.hotReload.interval,
          autoReload: autoReload ?? settings.hotReload.autoReload,
        },
      });

      showSaveMessage("Settings saved ✓");
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
        <div class="loading">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div class="options">
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
      <div class="options">
        <div class="error">Failed to load settings</div>
      </div>
    );
  }

  return (
    <div class="options">
      <header class="header">
        <h1 class="title">⚙️ Markdown Viewer Settings</h1>
        <p class="subtitle">Configure your preferences</p>
      </header>

      <main class="content">
        {saveMessage && <div class="save-message">{saveMessage}</div>}

        <section class="section">
          <h2 class="section-title">Appearance</h2>
          <ThemeSelector
            current={settings.theme}
            onChange={handleThemeChange}
          />
        </section>

        <section class="section">
          <h2 class="section-title">Developer Tools</h2>
          <HotReloadSettings
            enabled={settings.hotReload.enabled}
            interval={settings.hotReload.interval}
            autoReload={settings.hotReload.autoReload}
            onChange={handleHotReloadChange}
          />
        </section>

        <section class="section">
          <RemoteUrlSettings />
        </section>
      </main>
    </div>
  );
};
