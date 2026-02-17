import { Fragment as _Fragment, h as _h } from "preact";
import { useEffect, useState } from "preact/hooks";
import { getContentScriptId } from "../../../shared/utils/encode.ts";
import { validateOrigin } from "../../../shared/utils/origin-validator.ts";
import { logger } from "../../../shared/utils/logger.ts";

interface CustomOrigin {
  origin: string;
  addedAt: number; // timestamp
}

export const RemoteUrlSettings = () => {
  const [customOrigins, setCustomOrigins] = useState<CustomOrigin[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 初期化: Chrome Storageから保存済みのカスタムドメインを読み込む
  useEffect(() => {
    loadCustomOrigins();
  }, []);

  const loadCustomOrigins = async () => {
    try {
      const result = await chrome.storage.sync.get(["customOrigins"]);
      if (result.customOrigins) {
        setCustomOrigins(result.customOrigins as CustomOrigin[]);
      }
    } catch (err) {
      console.error("Failed to load custom origins:", err);
    }
  };

  const saveCustomOrigins = async (origins: CustomOrigin[]) => {
    try {
      await chrome.storage.sync.set({ customOrigins: origins });
    } catch (err) {
      console.error("Failed to save custom origins:", err);
    }
  };

  const addOrigin = async () => {
    setError(null);
    setIsLoading(true);

    const trimmed = inputValue.trim();
    const result = validateOrigin(
      trimmed,
      customOrigins.map((o) => o.origin),
    );

    if (!result.valid) {
      setError(result.error ?? null);
      setIsLoading(false);
      return;
    }

    try {
      // Chrome Permissions APIで権限をリクエスト
      const granted = await chrome.permissions.request({
        origins: [trimmed],
      });

      if (!granted) {
        setError("Permission denied by user");
        setIsLoading(false);
        return;
      }

      // Content Scriptを動的に登録（共通関数で一意のID生成）
      const scriptId = getContentScriptId(trimmed);
      await chrome.scripting.registerContentScripts([{
        id: scriptId,
        matches: [trimmed],
        js: ["content.js"],
        runAt: "document_start",
      }]);

      // 保存
      const newOrigin: CustomOrigin = {
        origin: trimmed,
        addedAt: Date.now(),
      };
      const updated = [...customOrigins, newOrigin];
      setCustomOrigins(updated);
      await saveCustomOrigins(updated);

      // 入力欄をクリア
      setInputValue("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to add origin",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const removeOrigin = async (origin: string) => {
    try {
      // 1. 対象のContent Scriptを特定して解除（共通関数でID生成）
      const scriptId = getContentScriptId(origin);
      try {
        await chrome.scripting.unregisterContentScripts({
          ids: [scriptId],
        });
      } catch (e) {
        // スクリプトが存在しない場合はエラーを無視（既に解除済み等）
        logger.warn(`Failed to unregister content script ${scriptId}:`, e);
      }

      // 2. 権限を削除
      await chrome.permissions.remove({
        origins: [origin],
      });

      // 3. Storageから削除
      const updated = customOrigins.filter((o) => o.origin !== origin);
      setCustomOrigins(updated);
      await saveCustomOrigins(updated);
    } catch (err) {
      console.error("Failed to remove origin:", err);
      setError(err instanceof Error ? err.message : "Failed to remove origin");
    }
  };

  return (
    <div class="remote-url-settings">
      <div class="settings-header">
        <div class="header-content">
          <h3 class="settings-title">Remote URL Support</h3>
          <span class="settings-badge">Advanced</span>
        </div>
        <p class="settings-description">
          Enable Markdown viewing from remote URLs by adding custom domains.
          <strong class="privacy-emphasis">Privacy First:</strong>{" "}
          Only domains you explicitly authorize will have access.
        </p>
      </div>

      <div class="add-origin-section">
        <label class="input-label">Add Custom Domain</label>
        <div class="input-container">
          <div class="input-wrapper">
            <span class="input-icon" aria-hidden="true"></span>
            <input
              type="text"
              class={`origin-input ${error ? "has-error" : ""}`}
              placeholder="https://example.com/*"
              value={inputValue}
              onInput={(e: Event) =>
                setInputValue((e.target as HTMLInputElement).value)}
              onKeyDown={(e: KeyboardEvent) => {
                if (e.key === "Enter") {
                  addOrigin();
                }
              }}
              disabled={isLoading}
              aria-label="Custom domain URL"
              aria-invalid={error ? "true" : "false"}
            />
          </div>
          <button
            type="button"
            class="btn-primary"
            onClick={addOrigin}
            disabled={isLoading || !inputValue.trim()}
            aria-label="Add domain"
          >
            {isLoading
              ? (
                <>
                  <span class="btn-spinner"></span>
                  Adding...
                </>
              )
              : (
                "Add Domain"
              )}
          </button>
        </div>

        {error && (
          <div class="validation-error" role="alert">
            <span class="error-icon" aria-hidden="true"></span>
            {error}
          </div>
        )}

        <div class="format-hint">
          <div class="hint-row">
            <span class="hint-label">Format:</span>
            <code class="hint-code">https://example.com/*</code>
          </div>
          <div class="hint-row">
            <span class="hint-label">Example:</span>
            <code class="hint-code">https://raw.githubusercontent.com/*</code>
          </div>
        </div>
      </div>

      {customOrigins.length > 0 && (
        <div class="origins-section">
          <div class="section-header">
            <h4 class="section-title">Authorized Domains</h4>
            <span class="domain-count">{customOrigins.length}</span>
          </div>
          <ul class="origins-list" role="list">
            {customOrigins.map((item, index) => (
              <li
                key={item.origin}
                class="origin-item"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div class="origin-content">
                  <div class="origin-url-wrapper">
                    <span class="origin-icon" aria-hidden="true"></span>
                    <code class="origin-url">{item.origin}</code>
                  </div>
                  <time
                    class="origin-timestamp"
                    dateTime={new Date(item.addedAt).toISOString()}
                  >
                    Added {new Date(item.addedAt).toLocaleDateString()}
                  </time>
                </div>
                <button
                  type="button"
                  class="btn-remove"
                  onClick={() => removeOrigin(item.origin)}
                  aria-label={`Remove ${item.origin}`}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div class="security-notice">
        <div class="notice-header">
          <span class="security-icon" aria-hidden="true"></span>
          <h4 class="notice-title">Security & Privacy</h4>
        </div>
        <ul class="security-list" role="list">
          <li class="security-item security-highlight">
            <span class="item-icon icon-lock" aria-hidden="true"></span>
            <span>
              <strong>HTTPS Only:</strong>{" "}
              Secure connections required for all domains
            </span>
          </li>
          <li class="security-item">
            <span class="item-icon icon-check" aria-hidden="true"></span>
            <span>Remove domains anytime without restrictions</span>
          </li>
          <li class="security-item">
            <span class="item-icon icon-check" aria-hidden="true"></span>
            <span>Zero tracking, zero data collection</span>
          </li>
          <li class="security-item">
            <span class="item-icon icon-check" aria-hidden="true"></span>
            <span>Domains stored locally via Chrome Sync Storage</span>
          </li>
          <li class="security-item security-warning">
            <span class="item-icon icon-warning" aria-hidden="true"></span>
            <span>
              <strong>Trust Carefully:</strong>{" "}
              This extension will execute on authorized domains
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
};
