import { h as _h } from "preact";
import type { Theme } from "../../../shared/types/theme.ts";

interface ThemeSelectorProps {
  current: Theme;
  onChange: (theme: Theme) => void;
}

/**
 * テーマ選択コンポーネント (6テーマ対応版)
 *
 * 責務: テーマの表示と選択UIのみ
 * レイヤー: ui-components層
 */
export const ThemeSelector = ({ current, onChange }: ThemeSelectorProps) => {
  const themes: {
    id: Theme;
    label: string;
    emoji: string;
    description: string;
  }[] = [
    {
      id: "light",
      label: "Light",
      emoji: "☀️",
      description: "Simple light theme",
    },
    {
      id: "dark",
      label: "Dark",
      emoji: "🌙",
      description: "Simple dark theme",
    },
    {
      id: "github",
      label: "GitHub",
      emoji: "🐙",
      description: "GitHub-style theme",
    },
    {
      id: "minimal",
      label: "Minimal",
      emoji: "📝",
      description: "Minimalist design",
    },
    {
      id: "solarized-light",
      label: "Solarized Light",
      emoji: "🌅",
      description: "Solarized light theme",
    },
    {
      id: "solarized-dark",
      label: "Solarized Dark",
      emoji: "🌃",
      description: "Solarized dark theme",
    },
  ];

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
            <span class="theme-emoji">{theme.emoji}</span>
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
