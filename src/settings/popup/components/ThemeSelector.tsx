import { h as _h } from "preact";
import type { Theme } from "../../../shared/types/theme.ts";
import { THEME_METADATA } from "../../../shared/constants/themes.ts";

interface ThemeSelectorProps {
  current: Theme;
  onChange: (theme: Theme) => void;
}

/**
 * テーマ選択コンポーネント
 *
 * Popup用の簡易テーマ選択UI。テーマメタデータはshared/constants/themes.tsで一元管理。
 */
export const ThemeSelector = ({ current, onChange }: ThemeSelectorProps) => {
  const themes = THEME_METADATA;

  return (
    <div class="theme-selector">
      <label class="label">Theme</label>
      <div class="theme-options">
        {themes.map((theme) => (
          <button
            key={theme.id}
            class={`theme-option ${current === theme.id ? "active" : ""}`}
            onClick={() => onChange(theme.id)}
            type="button"
          >
            <span class="emoji">{theme.emoji}</span>
            <span class="text">{theme.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
