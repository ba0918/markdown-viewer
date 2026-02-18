import { h as _h } from "preact";
import { useState } from "preact/hooks";
import { validateHotReloadInterval } from "../../../shared/utils/validators.ts";

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
 *
 * Controlled Component: 状態は親（Options App.tsx）が管理し、
 * propsを直接参照する。validationErrorのみローカル状態として保持。
 */
export const HotReloadSettings = ({
  enabled,
  interval,
  autoReload,
  onChange,
}: HotReloadSettingsProps) => {
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleToggle = () => {
    onChange(!enabled, interval, autoReload);
  };

  const handleIntervalChange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    const value = parseInt(target.value, 10);

    const result = validateHotReloadInterval(value);
    if (!result.valid) {
      setValidationError(result.error ?? null);
      return;
    }

    setValidationError(null);
    onChange(enabled, value, autoReload);
  };

  const handleAutoReloadToggle = () => {
    onChange(enabled, interval, !autoReload);
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
            class={`toggle-btn ${enabled ? "active" : ""}`}
            onClick={handleToggle}
            type="button"
            aria-label={enabled ? "Disable Hot Reload" : "Enable Hot Reload"}
          >
            <span class="toggle-slider"></span>
          </button>
        </div>
        <p class="description">
          Automatically detect file changes and reload Markdown
        </p>
      </div>

      {enabled && (
        <div class="advanced-settings">
          <div class="setting-group">
            <label class="label">
              Check Interval
              <span class="value">{interval}ms</span>
            </label>
            <input
              type="range"
              min="2000"
              max="20000"
              step="2000"
              value={interval}
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
                class={`toggle-btn small ${autoReload ? "active" : ""}`}
                onClick={handleAutoReloadToggle}
                type="button"
                aria-label={autoReload
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
        <p class="hot-reload-local-note">
          Hot Reload only works with local files (file://) and localhost. Remote
          URLs are not supported.
        </p>
      </div>
    </div>
  );
};
