/**
 * useResizable Hook
 *
 * ToC横幅のドラッグリサイズ機能を提供するカスタムフック。
 * マウスドラッグによる横幅変更、最小/最大幅の制限、変更完了時のコールバックをサポート。
 */

import { useCallback, useEffect, useRef, useState } from "preact/hooks";

/**
 * useResizable Hook のオプション
 */
interface UseResizableOptions {
  /** 初期横幅（px） */
  initialWidth: number;
  /** 最小横幅（px） */
  minWidth: number;
  /** 最大横幅（px） */
  maxWidth: number;
  /** 横幅変更時のコールバック */
  onWidthChange?: (width: number) => void;
}

/**
 * useResizable Hook の戻り値
 */
interface UseResizableReturn {
  /** 現在の横幅（px） */
  width: number;
  /** リサイズ中かどうか */
  isResizing: boolean;
  /** リサイズ開始ハンドラ */
  startResize: () => void;
}

/**
 * ToC横幅のリサイズ機能を提供するカスタムHook
 *
 * @param options - useResizableのオプション
 * @returns リサイズ状態と制御関数
 *
 * @example
 * ```tsx
 * const { width, isResizing, startResize } = useResizable({
 *   initialWidth: 250,
 *   minWidth: 150,
 *   maxWidth: 500,
 *   onWidthChange: (w) => saveToStorage(w),
 * });
 * ```
 */
export const useResizable = ({
  initialWidth,
  minWidth,
  maxWidth,
  onWidthChange,
}: UseResizableOptions): UseResizableReturn => {
  const [width, setWidth] = useState(initialWidth);
  const [isResizing, setIsResizing] = useState(false);

  // widthの最新値をRefで保持（依存配列から除外するため）
  const widthRef = useRef(initialWidth);

  /**
   * initialWidthが変更されたら、リサイズ中でない時のみwidthを更新
   * （chrome.storageから読み込んだ値を反映するため）
   */
  useEffect(() => {
    if (!isResizing) {
      setWidth(initialWidth);
      widthRef.current = initialWidth;
    }
  }, [initialWidth, isResizing]);

  /**
   * width変更時にRefを更新
   */
  useEffect(() => {
    widthRef.current = width;
  }, [width]);

  /**
   * リサイズ開始ハンドラ
   */
  const startResize = useCallback(() => {
    setIsResizing(true);
  }, []);

  /**
   * リサイズ中のイベントリスナーを登録
   */
  useEffect(() => {
    if (!isResizing) return;

    // リサイズ中はbody全体でテキスト選択を無効化
    document.body.style.userSelect = "none";
    document.body.style.cursor = "ew-resize"; // カーソルもリサイズ用に変更

    /**
     * マウス移動ハンドラ
     */
    const handleMouseMove = (e: MouseEvent) => {
      // マウスX座標を横幅として使用、最小・最大幅で制約
      const newWidth = Math.min(Math.max(e.clientX, minWidth), maxWidth);
      widthRef.current = newWidth; // Refで最新の横幅を保持
      setWidth(newWidth);
    };

    /**
     * マウスアップハンドラ
     */
    const handleMouseUp = () => {
      setIsResizing(false);
      // リサイズ終了時にテキスト選択とカーソルを元に戻す
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
      // リサイズ終了時にコールバックを実行（Refから最新の横幅を取得）
      onWidthChange?.(widthRef.current);
    };

    // グローバルイベントリスナーを登録
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    // クリーンアップ
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      // クリーンアップ時もスタイルを元に戻す
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, [isResizing, minWidth, maxWidth, onWidthChange]);

  return { width, isResizing, startResize };
};
