import { h as _h } from "preact";
import type { Theme } from "../../../shared/types/theme.ts";

interface ThemeSelectorProps {
  current: Theme;
  onChange: (theme: Theme) => void;
}

/**
 * テーマ選択コンポーネント
 *
 * 責務: テーマの表示と選択UIのみ
 * レイヤー: ui-components層
 */
export const ThemeSelector = ({ current, onChange }: ThemeSelectorProps) => {
  const themes: { id: Theme; label: string; emoji: string }[] = [
    { id: "light", label: "Light", emoji: "☀️" },
    { id: "dark", label: "Dark", emoji: "🌙" },
    { id: "github", label: "GitHub", emoji: "🐙" },
    { id: "minimal", label: "Minimal", emoji: "📝" },
    { id: "solarized-light", label: "Sol. Light", emoji: "🌅" },
    { id: "solarized-dark", label: "Sol. Dark", emoji: "🌃" },
  ];

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
