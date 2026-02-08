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
 * 責務: Hot Reload設定UIのみ
 * レイヤー: ui-components層
 *
 * Phase 3-3で完全実装予定
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

    // バリデーション
    if (isNaN(value) || value === 0) {
      setValidationError("チェック間隔は1以上の数値を入力してください");
      return;
    }

    if (value < 1000) {
      setValidationError("チェック間隔は最小1000ms（1秒）以上にしてください");
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
            <span class="badge">開発者向け</span>
          </label>
          <button
            class={`toggle-btn ${localEnabled ? "active" : ""}`}
            onClick={handleToggle}
            type="button"
            aria-label={localEnabled ? "Hot Reload無効化" : "Hot Reload有効化"}
          >
            <span class="toggle-slider"></span>
          </button>
        </div>
        <p class="description">
          ファイルの変更を自動検知してMarkdownを再読み込みします
        </p>
      </div>

      {localEnabled && (
        <div class="advanced-settings">
          <div class="setting-group">
            <label class="label">
              チェック間隔
              <span class="value">{localInterval}ms</span>
            </label>
            <input
              type="range"
              min="1000"
              max="10000"
              step="1000"
              value={localInterval}
              onInput={handleIntervalChange}
              class="slider"
            />
            {validationError
              ? <p class="error-message">{validationError}</p>
              : <p class="hint">最小: 1000ms（1秒）</p>}
          </div>

          <div class="setting-group">
            <div class="setting-header">
              <label class="label">自動リロード</label>
              <button
                class={`toggle-btn small ${localAutoReload ? "active" : ""}`}
                onClick={handleAutoReloadToggle}
                type="button"
                aria-label={localAutoReload
                  ? "自動リロード無効化"
                  : "自動リロード有効化"}
              >
                <span class="toggle-slider"></span>
              </button>
            </div>
            <p class="description">
              ファイル変更を検知したら自動的にページをリロードします
            </p>
          </div>
        </div>
      )}

      <div class="info-box">
        <strong>⚠️ 注意</strong>
        <p>
          Hot
          Reload機能は開発時の利便性を向上させますが、バッテリーとパフォーマンスに影響を与える可能性があります。
          通常の閲覧時は無効にすることをおすすめします。
        </p>
      </div>
    </div>
  );
};
