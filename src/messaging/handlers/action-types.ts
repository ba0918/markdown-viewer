import type { MessageResponse } from "../types.ts";

/**
 * Action関数の共通型定義
 *
 * 各メッセージタイプに対応するaction関数はこのシグネチャに従う。
 * payloadはランタイムバリデーションで検証するためunknown型。
 */
export type ActionHandler = (
  payload: unknown,
) => Promise<MessageResponse> | MessageResponse;

/**
 * Chrome Downloads API型定義
 *
 * background-handler.tsから移動。EXPORT_AND_DOWNLOADアクションで使用。
 */
export declare const chrome: {
  downloads: {
    download: (options: {
      url: string;
      filename?: string;
      saveAs?: boolean;
    }) => Promise<number>;
    onDeterminingFilename: {
      addListener: (
        callback: (
          downloadItem: { id: number },
          suggest: (suggestion?: { filename: string }) => void,
        ) => void,
      ) => void;
      removeListener: (
        callback: (
          downloadItem: { id: number },
          suggest: (suggestion?: { filename: string }) => void,
        ) => void,
      ) => void;
    };
  };
};
