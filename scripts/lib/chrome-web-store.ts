export interface ChromeWebStoreConfig {
  accessToken: string;
  publisherId: string;
  extensionId: string;
}

export interface ChromeWebStoreEndpoints {
  itemName: string;
  status: string;
  upload: string;
  publish: string;
}

export type UploadState =
  | "UPLOAD_STATE_UNSPECIFIED"
  | "SUCCEEDED"
  | "IN_PROGRESS"
  | "FAILED"
  | "NOT_FOUND";

export type ItemState =
  | "ITEM_STATE_UNSPECIFIED"
  | "PENDING_REVIEW"
  | "STAGED"
  | "PUBLISHED"
  | "PUBLISHED_TO_TESTERS"
  | "REJECTED"
  | "CANCELLED";

export interface DistributionChannel {
  deployPercentage?: number;
  crxVersion?: string;
}

export interface ItemRevisionStatus {
  state?: ItemState;
  distributionChannels?: DistributionChannel[];
}

export interface FetchStatusResponse {
  name?: string;
  itemId?: string;
  publishedItemRevisionStatus?: ItemRevisionStatus;
  submittedItemRevisionStatus?: ItemRevisionStatus;
  lastAsyncUploadState?: UploadState;
  takenDown?: boolean;
  warned?: boolean;
}

export interface UploadResponse {
  name?: string;
  itemId?: string;
  crxVersion?: string;
  uploadState?: UploadState;
}

export interface PublishResponse {
  name?: string;
  itemId?: string;
  state?: ItemState;
  warningInfo?: {
    warnings?: Array<{ reason?: string; description?: string }>;
  };
}

export type UploadDecision = "upload" | "wait" | "skip";
export type PublishDecision = "publish" | "skip";

const API_ORIGIN = "https://chromewebstore.googleapis.com";
const EXTENSION_ID_PATTERN = /^[a-p]{32}$/;
const PUBLISHER_ID_PATTERN = /^[A-Za-z0-9_-]+$/;
const VERSION_PATTERN = /^\d+(?:\.\d+){0,3}$/;

function requireEnvironmentValue(
  environment: Record<string, string | undefined>,
  name: string,
): string {
  const value = environment[name]?.trim();
  if (!value) {
    throw new Error(
      `Invalid Chrome Web Store configuration: ${name} is required`,
    );
  }
  return value;
}

export function parseChromeWebStoreConfig(
  environment: Record<string, string | undefined>,
): ChromeWebStoreConfig {
  const accessToken = requireEnvironmentValue(environment, "CWS_ACCESS_TOKEN");
  const publisherId = requireEnvironmentValue(environment, "CWS_PUBLISHER_ID");
  const extensionId = requireEnvironmentValue(environment, "CWS_EXTENSION_ID");

  if (!PUBLISHER_ID_PATTERN.test(publisherId)) {
    throw new Error(
      "Invalid Chrome Web Store configuration: CWS_PUBLISHER_ID has an invalid format",
    );
  }
  if (!EXTENSION_ID_PATTERN.test(extensionId)) {
    throw new Error(
      "Invalid Chrome Web Store configuration: CWS_EXTENSION_ID has an invalid format",
    );
  }

  return { accessToken, publisherId, extensionId };
}

export function buildEndpoints(
  config: Pick<ChromeWebStoreConfig, "publisherId" | "extensionId">,
): ChromeWebStoreEndpoints {
  const itemName =
    `publishers/${config.publisherId}/items/${config.extensionId}`;
  return {
    itemName,
    status: `${API_ORIGIN}/v2/${itemName}:fetchStatus`,
    upload: `${API_ORIGIN}/upload/v2/${itemName}:upload`,
    publish: `${API_ORIGIN}/v2/${itemName}:publish`,
  };
}

export function buildPublishRequest() {
  return {
    publishType: "DEFAULT_PUBLISH" as const,
    deployInfos: [{ deployPercentage: 100 }],
    skipReview: false,
    blockOnWarnings: true,
  };
}

export function assertSafeItemStatus(
  response: FetchStatusResponse,
  config: ChromeWebStoreConfig,
): void {
  const { itemName } = buildEndpoints(config);
  if (response.name !== itemName || response.itemId !== config.extensionId) {
    throw new Error("Unexpected Chrome Web Store item in status response");
  }
  if (response.takenDown) {
    throw new Error("Chrome Web Store item is taken down");
  }
  if (response.warned) {
    throw new Error("Chrome Web Store item has a policy warning");
  }
}

function revisionVersions(revision?: ItemRevisionStatus): string[] {
  return (revision?.distributionChannels ?? [])
    .map((channel) => channel.crxVersion)
    .filter((version): version is string => version !== undefined);
}

function includesVersion(
  revision: ItemRevisionStatus | undefined,
  expectedVersion: string,
): boolean {
  return revisionVersions(revision).includes(expectedVersion);
}

function validateExpectedVersion(expectedVersion: string): void {
  if (!VERSION_PATTERN.test(expectedVersion)) {
    throw new Error(`Invalid Chrome extension version: ${expectedVersion}`);
  }
}

export function decideUpload(
  response: FetchStatusResponse,
  expectedVersion: string,
): UploadDecision {
  validateExpectedVersion(expectedVersion);

  if (
    includesVersion(response.submittedItemRevisionStatus, expectedVersion) ||
    includesVersion(response.publishedItemRevisionStatus, expectedVersion)
  ) {
    return "skip";
  }

  const submittedVersions = revisionVersions(
    response.submittedItemRevisionStatus,
  );
  if (submittedVersions.length > 0) {
    throw new Error(
      `Chrome Web Store has a different submitted version: ${
        submittedVersions.join(", ")
      }`,
    );
  }

  switch (response.lastAsyncUploadState) {
    case undefined:
    case "NOT_FOUND":
    case "FAILED":
      return "upload";
    case "IN_PROGRESS":
      return "wait";
    case "SUCCEEDED":
      throw new Error(
        "The latest Chrome Web Store upload succeeded, but the API cannot identify its version",
      );
    default:
      throw new Error(
        `Unexpected Chrome Web Store upload state: ${response.lastAsyncUploadState}`,
      );
  }
}

function isFullyPublished(
  revision: ItemRevisionStatus | undefined,
  expectedVersion: string,
): boolean {
  return revision?.state === "PUBLISHED" &&
    (revision.distributionChannels ?? []).some((channel) =>
      channel.crxVersion === expectedVersion && channel.deployPercentage === 100
    );
}

export function decidePublish(
  response: FetchStatusResponse,
  expectedVersion: string,
): PublishDecision {
  validateExpectedVersion(expectedVersion);

  const submitted = response.submittedItemRevisionStatus;
  if (includesVersion(submitted, expectedVersion)) {
    if (submitted?.state === "PENDING_REVIEW") return "skip";
    throw new Error(
      `Chrome Web Store version ${expectedVersion} has unexpected submitted state: ${submitted?.state}`,
    );
  }

  const submittedVersions = revisionVersions(submitted);
  if (submittedVersions.length > 0) {
    throw new Error(
      `Chrome Web Store submitted version mismatch: expected ${expectedVersion}, got ${
        submittedVersions.join(", ")
      }`,
    );
  }

  if (isFullyPublished(response.publishedItemRevisionStatus, expectedVersion)) {
    return "skip";
  }

  if (response.lastAsyncUploadState === "SUCCEEDED") return "publish";

  throw new Error(
    `Chrome Web Store upload is not ready for publish: ${
      response.lastAsyncUploadState ?? "missing"
    }`,
  );
}

export interface UploadPollingOptions {
  fetchStatus: () => Promise<FetchStatusResponse>;
  sleep: (milliseconds: number) => Promise<void>;
  maxAttempts: number;
  intervalMs: number;
}

export async function waitForUpload(
  options: UploadPollingOptions,
): Promise<FetchStatusResponse> {
  for (let attempt = 1; attempt <= options.maxAttempts; attempt += 1) {
    const response = await options.fetchStatus();
    switch (response.lastAsyncUploadState) {
      case "SUCCEEDED":
        return response;
      case "IN_PROGRESS":
        if (attempt < options.maxAttempts) {
          await options.sleep(options.intervalMs);
        }
        break;
      case "FAILED":
        throw new Error("Upload failed in Chrome Web Store processing");
      default:
        throw new Error(
          `Unexpected Chrome Web Store upload state while polling: ${
            response.lastAsyncUploadState ?? "missing"
          }`,
        );
    }
  }

  throw new Error(
    `Chrome Web Store upload timed out after ${options.maxAttempts} attempts`,
  );
}

export function sanitizeForLog(
  value: unknown,
  sensitiveValues: string[],
): unknown {
  if (typeof value === "string") {
    return sensitiveValues.reduce(
      (safe, sensitive) =>
        sensitive ? safe.replaceAll(sensitive, "[REDACTED]") : safe,
      value,
    );
  }
  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeForLog(entry, sensitiveValues));
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        /authorization/i.test(key)
          ? "[REDACTED]"
          : sanitizeForLog(entry, sensitiveValues),
      ]),
    );
  }
  return value;
}

async function parseResponseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export class ChromeWebStoreClient {
  readonly #config: ChromeWebStoreConfig;
  readonly #endpoints: ChromeWebStoreEndpoints;
  readonly #fetch: typeof fetch;

  constructor(config: ChromeWebStoreConfig, fetchImplementation = fetch) {
    this.#config = config;
    this.#endpoints = buildEndpoints(config);
    this.#fetch = fetchImplementation;
  }

  async #request<T>(url: string, init: RequestInit): Promise<T> {
    const headers = new Headers(init.headers);
    headers.set("authorization", `Bearer ${this.#config.accessToken}`);
    const response = await this.#fetch(url, { ...init, headers });
    const body = await parseResponseBody(response);

    if (!response.ok) {
      const safeBody = sanitizeForLog(body, [this.#config.accessToken]);
      throw new Error(
        `Chrome Web Store API request failed (${response.status}): ${
          JSON.stringify(safeBody)
        }`,
      );
    }
    return body as T;
  }

  async fetchStatus(): Promise<FetchStatusResponse> {
    const response = await this.#request<FetchStatusResponse>(
      this.#endpoints.status,
      { method: "GET" },
    );
    assertSafeItemStatus(response, this.#config);
    return response;
  }

  async upload(
    packageBytes: Uint8Array,
    expectedVersion: string,
  ): Promise<UploadResponse> {
    validateExpectedVersion(expectedVersion);
    const response = await this.#request<UploadResponse>(
      this.#endpoints.upload,
      {
        method: "POST",
        headers: { "content-type": "application/zip" },
        body: packageBytes as BodyInit,
      },
    );
    if (
      response.name !== this.#endpoints.itemName ||
      response.itemId !== this.#config.extensionId
    ) {
      throw new Error("Unexpected Chrome Web Store item in upload response");
    }
    if (response.uploadState === "FAILED") {
      throw new Error("Chrome Web Store rejected the uploaded package");
    }
    if (response.uploadState === "SUCCEEDED") {
      if (response.crxVersion !== expectedVersion) {
        throw new Error(
          `Chrome Web Store uploaded version mismatch: expected ${expectedVersion}, got ${
            response.crxVersion ?? "missing"
          }`,
        );
      }
      return response;
    }
    if (response.uploadState === "IN_PROGRESS") return response;
    throw new Error(
      `Unexpected Chrome Web Store upload response state: ${
        response.uploadState ?? "missing"
      }`,
    );
  }

  async publish(): Promise<PublishResponse> {
    const response = await this.#request<PublishResponse>(
      this.#endpoints.publish,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(buildPublishRequest()),
      },
    );
    if (
      response.name !== this.#endpoints.itemName ||
      response.itemId !== this.#config.extensionId
    ) {
      throw new Error("Unexpected Chrome Web Store item in publish response");
    }
    if ((response.warningInfo?.warnings?.length ?? 0) > 0) {
      const safeWarnings = sanitizeForLog(
        response.warningInfo?.warnings,
        [this.#config.accessToken],
      );
      throw new Error(
        `Chrome Web Store publish returned warnings: ${
          JSON.stringify(safeWarnings)
        }`,
      );
    }
    if (response.state !== "PENDING_REVIEW") {
      throw new Error(
        `Unexpected Chrome Web Store publish state: ${
          response.state ?? "missing"
        }`,
      );
    }
    return response;
  }
}
