/**
 * ToC折りたたみ状態管理 - 後方互換re-export
 *
 * ロジックの実体は shared/utils/toggle-set-item.ts に移動済み。
 * domain内の既存テスト等のimportパスを変更不要にするためのre-export。
 */
import { toggleSetItem } from "../../shared/utils/toggle-set-item.ts";

export const toggleCollapsedItem = toggleSetItem;
