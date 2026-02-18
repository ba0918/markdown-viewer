import { Fragment as _Fragment, h as _h } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { sendMessage } from "../../messaging/client.ts";
import { ThemeSelector } from "./components/ThemeSelector.tsx";
import { HotReloadSettings } from "./components/HotReloadSettings.tsx";
import { RemoteUrlSettings } from "./components/RemoteUrlSettings.tsx";
import { useSettings } from "../shared/hooks/useSettings.ts";
import { SettingsLayout } from "../shared/components/SettingsLayout.tsx";
import type { Theme } from "../../shared/types/theme.ts";

/**
 * Options メインコンポーネント
 *
 * フル機能の設定画面UI。テーマ選択、Hot Reload設定、カスタムURL設定を提供。
 * messaging経由で設定の読み込み・保存を行う。
 */
export const App = () => {
  const {
    settings,
    loading,
    error,
    setSettings,
    setError,
    handleThemeChange,
    loadSettings,
  } = useSettings();
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  // メモリリーク防止: saveMessageタイマーを管理
  const saveMessageTimerRef = useRef<
    ReturnType<typeof globalThis.setTimeout> | null
  >(null);

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

  /** テーマ変更ハンドラ（成功時にsaveMessage表示） */
  const onThemeChange = async (theme: Theme) => {
    setSaveMessage(null);
    await handleThemeChange(theme, () => {
      showSaveMessage("Theme saved ✓");
    });
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

      // ローカル状態を更新（関数型更新でstale closure回避）
      setSettings((prev) =>
        prev
          ? {
            ...prev,
            hotReload: {
              enabled,
              interval: interval ?? prev.hotReload.interval,
              autoReload: autoReload ?? prev.hotReload.autoReload,
            },
          }
          : prev
      );

      showSaveMessage("Settings saved ✓");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update hot reload settings",
      );
    }
  };

  return (
    <SettingsLayout
      className="options"
      settings={settings}
      loading={loading}
      error={error}
      onRetry={loadSettings}
    >
      {(settings) => (
        <>
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
                onChange={onThemeChange}
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
        </>
      )}
    </SettingsLayout>
  );
};
