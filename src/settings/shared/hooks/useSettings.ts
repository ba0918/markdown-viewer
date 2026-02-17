import { useEffect, useState } from "preact/hooks";
import { sendMessage } from "../../../messaging/client.ts";
import type { AppState } from "../../../shared/types/state.ts";
import type { Theme } from "../../../shared/types/theme.ts";

/**
 * useSettings フックの戻り値型
 */
export interface UseSettingsReturn {
  /** 現在の設定状態（未取得時はnull） */
  settings: AppState | null;
  /** 設定読み込み中フラグ */
  loading: boolean;
  /** エラーメッセージ（なければnull） */
  error: string | null;
  /** 設定状態を直接更新する（Options固有ロジックで使用） */
  setSettings: (
    settings: AppState | ((prev: AppState | null) => AppState | null),
  ) => void;
  /** エラー状態を更新する */
  setError: (error: string | null) => void;
  /** 設定を再読み込みする */
  loadSettings: () => Promise<void>;
  /** テーマを変更する。onSuccessで成功時のコールバックを受け取る */
  handleThemeChange: (theme: Theme, onSuccess?: () => void) => Promise<void>;
}

/**
 * Settings共通フック
 *
 * Popup/Optionsで共通の設定読み込み・テーマ変更ロジックを提供する。
 * DRY原則に基づき、両App.tsxの重複コードを一元化。
 *
 * - 初期化時にGET_SETTINGSメッセージで設定を取得
 * - handleThemeChangeでUPDATE_THEMEメッセージを送信
 * - エラーハンドリングを統一
 *
 * @returns 設定状態と操作関数
 */
export const useSettings = (): UseSettingsReturn => {
  const [settings, setSettings] = useState<AppState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 初期設定の読み込み（マウント時に1回のみ実行）
  // loadSettingsを依存配列に含めないのは意図的：初回マウント時のみ実行するため
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

  const handleThemeChange = async (
    theme: Theme,
    onSuccess?: () => void,
  ) => {
    if (!settings) return; // nullガード
    try {
      setError(null);
      await sendMessage({
        type: "UPDATE_THEME",
        payload: { themeId: theme },
      });
      setSettings((prev) => prev ? { ...prev, theme } : prev);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update theme");
    }
  };

  return {
    settings,
    loading,
    error,
    setSettings,
    setError,
    loadSettings,
    handleThemeChange,
  };
};
