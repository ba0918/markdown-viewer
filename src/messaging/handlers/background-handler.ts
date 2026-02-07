import { markdownService } from '../../services/markdown-service.ts';
import { loadTheme } from '../../domain/theme/loader.ts';
import type { Message, MessageResponse } from '../types.ts';

/**
 * background層のメッセージハンドラ
 *
 * 責務: ルーティングのみ、serviceへの委譲
 *
 * ❌ 絶対禁止: ビジネスロジックの実装
 * ✅ OK: serviceに委譲するだけ
 *
 * これは過去の失敗（DuckDB + offscreen）から学んだ最大の教訓！
 * messaging層にビジネスロジックを書くと、offscreen対応で破綻する
 */
export const handleBackgroundMessage = async (
  message: Message
): Promise<MessageResponse> => {
  try {
    switch (message.type) {
      case 'RENDER_MARKDOWN': {
        // ✅ OK: serviceに委譲するだけ
        const theme = loadTheme(message.payload.themeId);
        const html = markdownService.render(
          message.payload.markdown,
          theme
        );
        return { success: true, data: html };
      }

      case 'LOAD_THEME': {
        // ✅ OK: domainに委譲するだけ（軽量な処理のため直接呼び出しOK）
        const theme = loadTheme(message.payload.themeId);
        return { success: true, data: theme };
      }

      case 'UPDATE_THEME': {
        // TODO: StateManagerで永続化する（Phase 3で実装）
        return { success: true, data: null };
      }

      default:
        return { success: false, error: 'Unknown message type' };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};
