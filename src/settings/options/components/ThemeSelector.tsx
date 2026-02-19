import { h as _h } from "preact";
import type { Theme } from "../../../shared/types/theme.ts";
import { THEME_METADATA } from "../../../shared/constants/themes.ts";

interface ThemeSelectorProps {
  current: Theme;
  onChange: (theme: Theme) => void;
}

/**
 * テーマ選択コンポーネント (Options版)
 *
 * 6種類のテーマをグリッド表示で選択。説明文とチェックマーク付き。
 * テーマメタデータはshared/constants/themes.tsで一元管理。
 */
export const ThemeSelector = ({ current, onChange }: ThemeSelectorProps) => {
  const themes = THEME_METADATA;

  return (
    <div class="theme-selector">
      <label class="label">Select Theme</label>
      <p class="description">Choose the display theme for Markdown files</p>
      <div class="theme-grid">
        {themes.map((theme) => (
          <button
            key={theme.id}
            class={`theme-card ${current === theme.id ? "active" : ""}`}
            onClick={() => onChange(theme.id)}
            type="button"
            title={theme.description}
          >
            <span class="theme-label">{theme.label}</span>
            <span class="theme-description">{theme.description}</span>
            {current === theme.id && (
              <span class="theme-check" aria-label="Selected">
                ✓
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};
