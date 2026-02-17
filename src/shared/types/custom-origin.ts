/**
 * カスタムオリジン型定義
 *
 * Remote URL Supportで使用するカスタムドメインの型。
 * settings UI (RemoteUrlSettings) と background (service-worker) で共有。
 */
export interface CustomOrigin {
  /** 許可するオリジンURL（例: "https://example.com/*"） */
  origin: string;
  /** 追加日時（Unix timestamp） */
  addedAt: number;
}
