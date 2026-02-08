import { h as _h } from "preact";
import type { ViewMode } from "../../../shared/types/view-mode.ts";

/**
 * DocumentHeaderコンポーネント
 *
 * 責務: View/Rawモード切り替えタブUI
 * ❌ 禁止: ビジネスロジック、messaging直接呼び出し
 *
 * デザイン:
 * - 固定ヘッダー（position: fixed, top: 0）
 * - 半透明背景 + Blur Effect
 * - 右端にView/Rawタブ
 * - ホバー・アクティブアニメーション
 */

interface Props {
  currentMode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
  style?: { left: string };
  themeId: string;
}

export const DocumentHeader = (
  { currentMode, onModeChange, style, themeId }: Props,
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
      </div>
    </header>
  );
};
