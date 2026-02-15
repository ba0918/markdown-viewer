import { h as _h } from "preact";
import { useEffect, useState } from "preact/hooks";

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

  const validateOrigin = (origin: string): string | null => {
    // 基本的なバリデーション
    if (!origin.trim()) {
      return "Origin cannot be empty";
    }

    // httpsのみ許可（セキュリティ）
    if (!origin.startsWith("https://")) {
      return "Origin must start with https://";
    }

    // ワイルドカードパターンチェック
    if (!origin.endsWith("/*")) {
      return "Origin must end with /* (e.g., https://example.com/*)";
    }

    // 既に追加済みかチェック
    if (customOrigins.some((o) => o.origin === origin)) {
      return "This origin is already added";
    }

    return null;
  };

  const addOrigin = async () => {
    setError(null);
    setIsLoading(true);

    const trimmed = inputValue.trim();
    const validationError = validateOrigin(trimmed);

    if (validationError) {
      setError(validationError);
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

      // Content Scriptを動的に登録
      const scriptId = `custom-origin-${Date.now()}`;
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
      // 権限を削除
      await chrome.permissions.remove({
        origins: [origin],
      });

      // Content Scriptを解除（全てのカスタムスクリプトをクリア）
      // Note: 正確なIDを追跡するのは複雑なので、エラーは無視
      try {
        const scripts = await chrome.scripting.getRegisteredContentScripts();
        const customScriptIds = scripts
          .filter((s) => s.id.startsWith("custom-origin-"))
          .map((s) => s.id);

        if (customScriptIds.length > 0) {
          await chrome.scripting.unregisterContentScripts({
            ids: customScriptIds,
          });
        }
      } catch (e) {
        console.warn("Failed to unregister content scripts:", e);
      }

      // Storageから削除
      const updated = customOrigins.filter((o) => o.origin !== origin);
      setCustomOrigins(updated);
      await saveCustomOrigins(updated);
    } catch (err) {
      console.error("Failed to remove origin:", err);
    }
  };

  return (
    <div class="remote-url-settings">
      <h2>🌐 Remote URL Support (Advanced)</h2>
      <p class="description">
        Add custom domains to enable Markdown viewing from remote URLs.
        <br />
        <strong>Privacy First:</strong>{" "}
        Only domains you explicitly add will have access.
      </p>

      <div class="add-origin-form">
        <div class="input-group">
          <input
            type="text"
            class="origin-input"
            placeholder="https://example.com/*"
            value={inputValue}
            onInput={(e) => setInputValue((e.target as HTMLInputElement).value)}
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                addOrigin();
              }
            }}
            disabled={isLoading}
          />
          <button
            type="button"
            class="btn btn-add"
            onClick={addOrigin}
            disabled={isLoading || !inputValue.trim()}
          >
            {isLoading ? "Adding..." : "➕ Add Domain"}
          </button>
        </div>

        {error && <div class="error-message">{error}</div>}

        <div class="help-text">
          <strong>Format:</strong> <code>https://example.com/*</code>
          <br />
          Example: <code>https://raw.githubusercontent.com/*</code>
        </div>
      </div>

      {customOrigins.length > 0 && (
        <div class="origins-list">
          <h3>Added Domains ({customOrigins.length})</h3>
          <ul>
            {customOrigins.map((item) => (
              <li key={item.origin} class="origin-item">
                <div class="origin-info">
                  <code>{item.origin}</code>
                  <span class="origin-date">
                    Added: {new Date(item.addedAt).toLocaleDateString()}
                  </span>
                </div>
                <button
                  type="button"
                  class="btn btn-remove"
                  onClick={() =>
                    removeOrigin(item.origin)}
                >
                  ❌ Remove
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div class="info-box">
        <h4>🔒 Security & Privacy</h4>
        <ul>
          <li>
            ✅ <strong>HTTPS only</strong> - HTTP is not allowed for security
          </li>
          <li>✅ You can remove domains anytime</li>
          <li>✅ No tracking, no data collection</li>
          <li>
            ✅ Domains are stored locally in Chrome Sync Storage
          </li>
          <li>
            ⚠️ <strong>Only add domains you trust</strong>{" "}
            - this extension will run on those sites
          </li>
        </ul>
      </div>
    </div>
  );
};
