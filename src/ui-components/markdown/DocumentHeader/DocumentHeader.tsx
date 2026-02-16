import { h as _h } from "preact";
import type { ComponentChildren } from "preact";
import type { ViewMode } from "../../../shared/types/view-mode.ts";

/**
 * DocumentHeaderコンポーネント
 *
 * View/Rawモード切り替えタブとアクションメニューを表示する固定ヘッダー。
 * 半透明背景 + Blur Effectのglassmorphismデザイン。
 */

interface Props {
  currentMode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
  style?: { left: string };
  themeId: string;
  children?: ComponentChildren; // アクションメニュー用
}

export const DocumentHeader = (
  { currentMode, onModeChange, style, themeId, children }: Props,
) => {
  const handleTabClick = (mode: ViewMode) => {
    onModeChange(mode);
  };

  const handleKeyDown = (event: KeyboardEvent, mode: ViewMode) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onModeChange(mode);
    }
  };

  return (
    <header
      class={`document-header document-header-theme-${themeId}`}
      style={style}
    >
      <div class="document-header-content">
        <div class="document-header-tabs">
          <button
            type="button"
            class={`tab ${currentMode === "view" ? "active" : ""}`}
            onClick={() => handleTabClick("view")}
            onKeyDown={(e) => handleKeyDown(e, "view")}
            role="tab"
            aria-selected={currentMode === "view"}
            aria-label="View mode"
          >
            View
          </button>
          <button
            type="button"
            class={`tab ${currentMode === "raw" ? "active" : ""}`}
            onClick={() => handleTabClick("raw")}
            onKeyDown={(e) => handleKeyDown(e, "raw")}
            role="tab"
            aria-selected={currentMode === "raw"}
            aria-label="Raw mode"
          >
            Raw
          </button>
        </div>
        {children && <div class="document-header-actions">{children}</div>}
      </div>
    </header>
  );
};
