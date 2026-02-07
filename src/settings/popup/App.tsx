import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { sendMessage } from '../../messaging/client.ts';
import { ThemeSelector } from './components/ThemeSelector.tsx';
import type { AppState } from '../../shared/types/state.ts';
import type { Theme } from '../../shared/types/theme.ts';

/**
 * Popup メインコンポーネント
 *
 * 責務: messaging I/O のみ、UI状態管理
 * レイヤー: settings/popup層
 *
 * ❌ 絶対禁止: services/domain直接呼び出し
 * ✅ OK: messaging経由でのみ通信
 */
export const App = () => {
  const [settings, setSettings] = useState<AppState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 初期設定の読み込み
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await sendMessage<AppState>({
        type: 'GET_SETTINGS',
        payload: {},
      });
      setSettings(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleThemeChange = async (theme: Theme) => {
    try {
      setError(null);
      await sendMessage({
        type: 'UPDATE_THEME',
        payload: { themeId: theme },
      });
      setSettings({ ...settings!, theme });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update theme');
    }
  };

  if (loading) {
    return (
      <div class="popup">
        <div class="loading">読み込み中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div class="popup">
        <div class="error">
          エラー: {error}
          <button onClick={loadSettings} class="retry-btn">
            再試行
          </button>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div class="popup">
        <div class="error">設定を読み込めませんでした</div>
      </div>
    );
  }

  return (
    <div class="popup">
      <header class="header">
        <h1 class="title">🎨 Markdown Viewer</h1>
        <p class="subtitle">クイック設定</p>
      </header>

      <main class="content">
        <ThemeSelector current={settings.theme} onChange={handleThemeChange} />
      </main>

      <footer class="footer">
        <div class="version">v0.2.0 (Phase 2)</div>
      </footer>
    </div>
  );
};
