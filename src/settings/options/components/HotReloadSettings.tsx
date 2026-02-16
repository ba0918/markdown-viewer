import { h as _h } from "preact";
import { useState } from "preact/hooks";

interface HotReloadSettingsProps {
  enabled: boolean;
  interval: number; // ミリ秒
  autoReload: boolean;
  onChange: (enabled: boolean, interval?: number, autoReload?: boolean) => void;
}

/**
 * Hot Reload設定コンポーネント
 *
 * Hot Reload機能の有効/無効、チェック間隔、自動リロード設定を管理するUI。
 * 間隔入力にはバリデーション（最小2000ms）を適用。
 */
export const HotReloadSettings = ({
  enabled,
  interval,
  autoReload,
  onChange,
}: HotReloadSettingsProps) => {
  const [localEnabled, setLocalEnabled] = useState(enabled);
  const [localInterval, setLocalInterval] = useState(interval);
  const [localAutoReload, setLocalAutoReload] = useState(autoReload);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleToggle = () => {
    const newEnabled = !localEnabled;
    setLocalEnabled(newEnabled);
    onChange(newEnabled, localInterval, localAutoReload);
  };

  const handleIntervalChange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    const value = parseInt(target.value, 10);

    // Validation
    if (isNaN(value) || value === 0) {
      setValidationError("Please enter a value of 1 or greater");
      return;
    }

    if (value < 2000) {
      setValidationError("Minimum interval is 2000ms (2 seconds)");
      return;
    }

    // バリデーションOK
    setValidationError(null);
    setLocalInterval(value);
    onChange(localEnabled, value, localAutoReload);
  };

  const handleAutoReloadToggle = () => {
    const newAutoReload = !localAutoReload;
    setLocalAutoReload(newAutoReload);
    onChange(localEnabled, localInterval, newAutoReload);
  };

  return (
    <div class="hot-reload-settings">
      <div class="setting-group">
        <div class="setting-header">
          <label class="label">
            Hot Reload
            <span class="badge">Developer</span>
          </label>
          <button
            class={`toggle-btn ${localEnabled ? "active" : ""}`}
            onClick={handleToggle}
            type="button"
            aria-label={localEnabled
              ? "Disable Hot Reload"
              : "Enable Hot Reload"}
          >
            <span class="toggle-slider"></span>
          </button>
        </div>
        <p class="description">
          Automatically detect file changes and reload Markdown
        </p>
      </div>

      {localEnabled && (
        <div class="advanced-settings">
          <div class="setting-group">
            <label class="label">
              Check Interval
              <span class="value">{localInterval}ms</span>
            </label>
            <input
              type="range"
              min="2000"
              max="20000"
              step="2000"
              value={localInterval}
              onInput={handleIntervalChange}
              class="slider"
            />
            {validationError
              ? <p class="error-message">{validationError}</p>
              : <p class="hint">Minimum: 2000ms (2 seconds)</p>}
          </div>

          <div class="setting-group">
            <div class="setting-header">
              <label class="label">Auto Reload</label>
              <button
                class={`toggle-btn small ${localAutoReload ? "active" : ""}`}
                onClick={handleAutoReloadToggle}
                type="button"
                aria-label={localAutoReload
                  ? "Disable Auto Reload"
                  : "Enable Auto Reload"}
              >
                <span class="toggle-slider"></span>
              </button>
            </div>
            <p class="description">
              Automatically reload page when file changes are detected
            </p>
          </div>
        </div>
      )}

      <div class="info-box">
        <strong>⚠️ Note</strong>
        <p>
          Hot Reload improves development convenience but may impact battery
          life and performance. It's recommended to disable it during normal
          browsing.
        </p>
      </div>
    </div>
  );
};
