/**
 * DocumentHeaderMenuコンポーネント
 *
 * 責務: DocumentHeader右側のメニューUI、ドロップダウン管理
 * ❌ 禁止: ビジネスロジック、機能特化した実装
 *
 * 設計思想:
 * - 汎用的なメニューコンテナ（Export専用ではない）
 * - 子コンポーネント（MenuItem）を受け取って表示
 * - 将来的にPDF Export、Copy HTML等の追加が容易
 */

import { type ComponentChildren, h as _h } from "preact";
import { useCallback, useState } from "preact/hooks";

interface Props {
  /** メニュー項目（ExportMenuItem等） */
  children: ComponentChildren;
}

export const DocumentHeaderMenu = ({ children }: Props) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = useCallback(() => {
    setIsOpen(!isOpen);
  }, [isOpen]);

  // メニュー外クリックで閉じる
  const handleBlur = useCallback(() => {
    // 少し遅延させてメニュー項目のクリックを許可
    setTimeout(() => setIsOpen(false), 200);
  }, []);

  return (
    <div class="document-header-menu">
      <button
        type="button"
        class="document-header-menu-button"
        onClick={toggleMenu}
        onBlur={handleBlur}
        title="Actions menu"
        aria-label="Actions menu"
        aria-expanded={isOpen}
      >
        ⋮
      </button>
      {isOpen && (
        <div class="document-header-menu-dropdown">
          {children}
        </div>
      )}
    </div>
  );
};
