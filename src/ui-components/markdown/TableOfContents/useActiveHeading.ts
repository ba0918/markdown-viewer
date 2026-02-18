/**
 * useActiveHeading Hook
 *
 * IntersectionObserver/MutationObserver/scrollイベントを使用して、
 * 現在表示中の見出しを検出し、アクティブ状態を管理するカスタムフック。
 *
 * TableOfContents.tsxからスクロール追従ロジックを分離し、
 * 単一責務の原則に従って見出し検出に特化。
 */

import { useCallback, useEffect, useState } from "preact/hooks";
import type { TocItem } from "../../../shared/types/toc.ts";

/**
 * useActiveHeading Hook のオプション
 */
interface UseActiveHeadingOptions {
  /** TOCアイテムリスト（空の場合はObserverを設定しない） */
  items: TocItem[];
  /**
   * ユーザークリック中フラグ（Refで管理）
   *
   * クリック後は手動スクロールまでIntersectionObserverの更新を無視するために使用。
   * TableOfContentsコンポーネントが所有し、handleClick内でtrueに設定される。
   * 手動スクロール（wheel/touch/keydown）検出でfalseにリセットされる。
   */
  isUserClickRef: { current: boolean };
}

/**
 * useActiveHeading Hook の戻り値
 */
interface UseActiveHeadingReturn {
  /** 現在アクティブな見出しID */
  activeId: string;
  /** アクティブIDを直接設定（クリック時に使用） */
  setActiveId: (id: string) => void;
}

/**
 * 見出しのスクロール追従とアクティブ状態管理を提供するカスタムHook
 *
 * @param options - useActiveHeadingのオプション
 * @returns アクティブ見出し状態と制御関数
 *
 * @example
 * ```tsx
 * const isUserClickRef = useRef(false);
 * const { activeId, setActiveId } = useActiveHeading({
 *   items,
 *   isUserClickRef,
 * });
 * ```
 */
export const useActiveHeading = ({
  items,
  isUserClickRef,
}: UseActiveHeadingOptions): UseActiveHeadingReturn => {
  const [activeId, setActiveId] = useState<string>("");

  /**
   * Markdownコンテンツ内の見出し要素のみを取得（ToCヘッダー等のUI要素を除外）
   * IDが付与されている見出しのみ = addHeadingIds()で処理されたMarkdown由来の見出し
   */
  const getContentHeadings = useCallback((): Element[] => {
    const allHeadings = document.querySelectorAll("h1, h2, h3");
    return Array.from(allHeadings).filter((h) => h.id !== "");
  }, []);

  /**
   * スクロール位置から最も近い「既に通過した」見出しを検索
   * ビューポート上部（DocumentHeader下端）より上にある最後の見出しを返す
   */
  const findLastPassedHeading = useCallback((): string => {
    const HEADER_HEIGHT = 56; // DocumentHeaderの高さ(px) - base.cssの.document-headerと一致
    const headings = getContentHeadings();
    let lastPassedId = "";
    for (const heading of headings) {
      const rect = heading.getBoundingClientRect();
      if (rect.top < HEADER_HEIGHT) {
        lastPassedId = heading.id;
      }
    }
    return lastPassedId;
  }, [getContentHeadings]);

  /**
   * IntersectionObserverで現在表示中の見出しを検出
   *
   * 改善点:
   * 1. rootMarginを固定値ベースに変更（ビューポートサイズ依存を排除）
   * 2. フォールバックロジック追加（検出範囲内に見出しがない場合も対応）
   * 3. 初期アクティブ設定（DOMに見出しが存在するまで待機してから設定）
   * 4. isUserClickをuseRefで管理（useEffect再実行を防止）
   * 5. scrollイベントでIntersectionObserverのギャップをカバー
   *
   * クリック後は手動スクロールまでIntersectionObserverの更新を無視:
   * - ユーザーがクリック → クリックした見出しがアクティブ
   * - スクロール完了後もそのまま維持
   * - ユーザーが手動スクロール → 自動追従再開
   */
  useEffect(() => {
    if (items.length === 0) return;

    let observer: IntersectionObserver | null = null;
    let pollingTimer: ReturnType<typeof setTimeout> | null = null;
    let isCleanedUp = false;

    /**
     * 現在のスクロール位置に基づいてアクティブな見出しを決定
     * IntersectionObserverのギャップ（見出しが検出範囲外にある時）をカバー
     */
    const updateActiveFromScroll = () => {
      if (isUserClickRef.current) return;
      const lastPassedId = findLastPassedHeading();
      if (lastPassedId) {
        setActiveId(lastPassedId);
      } else {
        // ページ最上部（どの見出しも通過していない）→ 最初のコンテンツ見出しをアクティブに
        const contentHeadings = getContentHeadings();
        if (contentHeadings.length > 0) {
          setActiveId(contentHeadings[0].id);
        }
      }
    };

    /**
     * IntersectionObserverとscrollイベントリスナーをセットアップ
     * DOMに見出しが存在することが保証された状態で呼ばれる
     */
    const setupObserver = (headings: Element[]) => {
      if (isCleanedUp) return;

      observer = new IntersectionObserver(
        (entries) => {
          // クリック直後は手動スクロールまでIntersectionObserverの更新を無視
          if (isUserClickRef.current) {
            return;
          }

          // 現在画面内にある見出しを収集
          const visibleHeadings = entries
            .filter((entry) => entry.isIntersecting)
            .map((entry) => ({
              id: entry.target.id,
              top: entry.boundingClientRect.top,
            }))
            .sort((a, b) => a.top - b.top); // 画面上部に近い順にソート

          if (visibleHeadings.length > 0) {
            // 画面上部に最も近い見出しをアクティブにする
            setActiveId(visibleHeadings[0].id);
          } else {
            // フォールバック: スクロール位置ベースで判定
            updateActiveFromScroll();
          }
        },
        {
          // DocumentHeader高さ(56px)分を上部から除外、下部70%を除外
          // → ビューポート上部30%の領域で見出しを検出
          rootMargin: "-56px 0px -70% 0px",
        },
      );

      // 見出し要素を監視
      headings.forEach((h) => observer!.observe(h));

      // scrollイベントリスナーでIntersectionObserverのギャップをカバー
      // 特にページトップ/ボトムでの検出漏れを防止
      let scrollRAF: number | null = null;
      const handleScroll = () => {
        if (isUserClickRef.current) return;
        // requestAnimationFrameでスロットリング
        if (scrollRAF) return;
        scrollRAF = requestAnimationFrame(() => {
          scrollRAF = null;
          updateActiveFromScroll();
        });
      };
      globalThis.addEventListener("scroll", handleScroll, { passive: true });

      // 初期アクティブ設定: 見出しが確実にDOMにある状態で設定
      updateActiveFromScroll();

      // クリーンアップにscrollリスナー解除を追加
      const originalCleanup = () => {
        globalThis.removeEventListener("scroll", handleScroll);
        if (scrollRAF) cancelAnimationFrame(scrollRAF);
      };
      return originalCleanup;
    };

    /**
     * DOMに見出し要素が存在するまで待機
     * Chrome拡張環境では、dangerouslySetInnerHTMLによるDOM更新が
     * useEffect実行時にまだ完了していない場合がある
     *
     * MutationObserverを使用してDOM変更を効率的に検知する
     * （以前の50msポーリングより低CPU負荷）
     */
    let scrollCleanup: (() => void) | null = null;
    let mutationObserver: MutationObserver | null = null;
    const MAX_WAIT_TIME = 2000; // 最大2秒

    const trySetupObserver = () => {
      if (isCleanedUp) return;
      const headings = getContentHeadings();
      if (headings.length > 0) {
        scrollCleanup = setupObserver(headings) || null;
        // 見出しが見つかったらMutationObserverは不要
        if (mutationObserver) {
          mutationObserver.disconnect();
          mutationObserver = null;
        }
      }
    };

    // 即座に試行（DOMが既に準備できている場合のため）
    trySetupObserver();

    // まだ見出しが見つからない場合、MutationObserverでDOM変更を監視
    if (!scrollCleanup) {
      mutationObserver = new MutationObserver(() => {
        trySetupObserver();
      });
      mutationObserver.observe(document.body, {
        childList: true,
        subtree: true,
      });
      // タイムアウト: 一定時間後にMutationObserverを停止
      pollingTimer = setTimeout(() => {
        if (mutationObserver) {
          mutationObserver.disconnect();
          mutationObserver = null;
        }
      }, MAX_WAIT_TIME);
    }

    return () => {
      isCleanedUp = true;
      if (observer) observer.disconnect();
      if (pollingTimer) clearTimeout(pollingTimer);
      if (scrollCleanup) scrollCleanup();
      if (mutationObserver) {
        mutationObserver.disconnect();
        mutationObserver = null;
      }
    };
  }, [items, findLastPassedHeading, getContentHeadings]);

  /**
   * ユーザーの手動スクロールを検出
   * wheelイベント（マウスホイール/トラックパッド）やtouchイベント（スワイプ）で自動追従を再開
   */
  useEffect(() => {
    const handleManualScroll = () => {
      // 手動スクロール検出 → 自動追従再開
      // クリック状態でない場合は何もしない
      if (!isUserClickRef.current) return;
      isUserClickRef.current = false;
    };

    // マウスホイール、トラックパッド
    globalThis.addEventListener("wheel", handleManualScroll, { passive: true });
    // タッチスワイプ
    globalThis.addEventListener("touchmove", handleManualScroll, {
      passive: true,
    });
    // キーボードスクロール（↑↓, PageUp/Down, Space）
    globalThis.addEventListener("keydown", handleManualScroll);

    return () => {
      globalThis.removeEventListener("wheel", handleManualScroll);
      globalThis.removeEventListener("touchmove", handleManualScroll);
      globalThis.removeEventListener("keydown", handleManualScroll);
    };
  }, []);

  return { activeId, setActiveId };
};
