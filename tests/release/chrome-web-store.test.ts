import {
  assert,
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import {
  assertSafeItemStatus,
  buildEndpoints,
  buildPublishRequest,
  ChromeWebStoreClient,
  decidePublish,
  decideUpload,
  type FetchStatusResponse,
  parseChromeWebStoreConfig,
  sanitizeForLog,
  waitForUpload,
} from "../../scripts/lib/chrome-web-store.ts";
import { runChromeWebStoreCommand } from "../../scripts/chrome-web-store.ts";

const CONFIG = {
  accessToken: "secret-access-token",
  publisherId: "publisher_123",
  extensionId: "abcdefghijklmnopabcdefghijklmnop",
};

const ITEM_NAME =
  "publishers/publisher_123/items/abcdefghijklmnopabcdefghijklmnop";

function status(
  overrides: Partial<FetchStatusResponse> = {},
): FetchStatusResponse {
  return {
    name: ITEM_NAME,
    itemId: CONFIG.extensionId,
    lastAsyncUploadState: "NOT_FOUND",
    takenDown: false,
    warned: false,
    ...overrides,
  };
}

Deno.test("CWS設定は必須値とID形式をネットワークアクセス前に検証する", () => {
  assertEquals(
    parseChromeWebStoreConfig({
      CWS_ACCESS_TOKEN: CONFIG.accessToken,
      CWS_PUBLISHER_ID: CONFIG.publisherId,
      CWS_EXTENSION_ID: CONFIG.extensionId,
    }),
    CONFIG,
  );

  for (
    const invalidEnvironment of [
      {},
      { CWS_ACCESS_TOKEN: CONFIG.accessToken },
      {
        CWS_ACCESS_TOKEN: CONFIG.accessToken,
        CWS_PUBLISHER_ID: "../publisher",
        CWS_EXTENSION_ID: CONFIG.extensionId,
      },
      {
        CWS_ACCESS_TOKEN: CONFIG.accessToken,
        CWS_PUBLISHER_ID: CONFIG.publisherId,
        CWS_EXTENSION_ID: "not-an-extension-id",
      },
    ]
  ) {
    assertThrows(
      () => parseChromeWebStoreConfig(invalidEnvironment),
      Error,
      "Invalid Chrome Web Store configuration",
    );
  }
});

Deno.test("CWS API URLは検証済みIDからv2 resourceを組み立てる", () => {
  assertEquals(buildEndpoints(CONFIG), {
    itemName: ITEM_NAME,
    status: `https://chromewebstore.googleapis.com/v2/${ITEM_NAME}:fetchStatus`,
    upload:
      `https://chromewebstore.googleapis.com/upload/v2/${ITEM_NAME}:upload`,
    publish: `https://chromewebstore.googleapis.com/v2/${ITEM_NAME}:publish`,
  });
});

Deno.test("publish要求は審査後の即時公開と100%配信を明示する", () => {
  assertEquals(buildPublishRequest(), {
    publishType: "DEFAULT_PUBLISH",
    deployInfos: [{ deployPercentage: 100 }],
    skipReview: false,
    blockOnWarnings: true,
  });
});

Deno.test("item名やIDが異なるstatus応答は拒否する", () => {
  assertThrows(
    () =>
      assertSafeItemStatus(
        status({ name: "publishers/other/items/other" }),
        CONFIG,
      ),
    Error,
    "Unexpected Chrome Web Store item",
  );
});

Deno.test("取り下げまたは警告中のitemは変更前に拒否する", () => {
  assertThrows(
    () => assertSafeItemStatus(status({ takenDown: true }), CONFIG),
    Error,
    "taken down",
  );
  assertThrows(
    () => assertSafeItemStatus(status({ warned: true }), CONFIG),
    Error,
    "policy warning",
  );
});

Deno.test("同じ版が提出済みならuploadを重複実行しない", () => {
  assertEquals(
    decideUpload(
      status({
        submittedItemRevisionStatus: {
          state: "PENDING_REVIEW",
          distributionChannels: [{
            crxVersion: "0.1.5",
            deployPercentage: 100,
          }],
        },
      }),
      "0.1.5",
    ),
    "skip",
  );
});

Deno.test("直近uploadが見つからない場合だけ新しいuploadを許可する", () => {
  assertEquals(decideUpload(status(), "0.1.5"), "upload");
  assertEquals(
    decideUpload(status({ lastAsyncUploadState: "FAILED" }), "0.1.5"),
    "upload",
  );
});

Deno.test("版を特定できないupload成功状態は再uploadせずfail closedする", () => {
  assertThrows(
    () => decideUpload(status({ lastAsyncUploadState: "SUCCEEDED" }), "0.1.5"),
    Error,
    "cannot identify its version",
  );
});

Deno.test("進行中uploadは待機対象として扱う", () => {
  assertEquals(
    decideUpload(status({ lastAsyncUploadState: "IN_PROGRESS" }), "0.1.5"),
    "wait",
  );
});

Deno.test("同じ版が審査待ちまたは公開済みならpublishを重複実行しない", () => {
  assertEquals(
    decidePublish(
      status({
        submittedItemRevisionStatus: {
          state: "PENDING_REVIEW",
          distributionChannels: [{
            crxVersion: "0.1.5",
            deployPercentage: 100,
          }],
        },
      }),
      "0.1.5",
    ),
    "skip",
  );
  assertEquals(
    decidePublish(
      status({
        publishedItemRevisionStatus: {
          state: "PUBLISHED",
          distributionChannels: [{
            crxVersion: "0.1.5",
            deployPercentage: 100,
          }],
        },
      }),
      "0.1.5",
    ),
    "skip",
  );
});

Deno.test("異なる版が審査中ならpublishしない", () => {
  assertThrows(
    () =>
      decidePublish(
        status({
          submittedItemRevisionStatus: {
            state: "PENDING_REVIEW",
            distributionChannels: [{
              crxVersion: "0.1.4",
              deployPercentage: 100,
            }],
          },
        }),
        "0.1.5",
      ),
    Error,
    "version mismatch",
  );
});

Deno.test("完了したuploadだけがpublishへ進める", () => {
  assertEquals(
    decidePublish(status({ lastAsyncUploadState: "SUCCEEDED" }), "0.1.5"),
    "publish",
  );
  assertThrows(
    () =>
      decidePublish(status({ lastAsyncUploadState: "IN_PROGRESS" }), "0.1.5"),
    Error,
    "not ready",
  );
});

Deno.test("upload pollingは成功状態でのみ完了する", async () => {
  const states: FetchStatusResponse[] = [
    status({ lastAsyncUploadState: "IN_PROGRESS" }),
    status({ lastAsyncUploadState: "SUCCEEDED" }),
  ];
  let sleeps = 0;

  const result = await waitForUpload({
    fetchStatus: () => Promise.resolve(states.shift()!),
    sleep: () => {
      sleeps += 1;
      return Promise.resolve();
    },
    maxAttempts: 3,
    intervalMs: 1,
  });

  assertEquals(result.lastAsyncUploadState, "SUCCEEDED");
  assertEquals(sleeps, 1);
});

Deno.test("upload pollingは失敗とtimeoutを決定的に報告する", async () => {
  await assertRejects(
    () =>
      waitForUpload({
        fetchStatus: () =>
          Promise.resolve(status({ lastAsyncUploadState: "FAILED" })),
        sleep: () => Promise.resolve(),
        maxAttempts: 3,
        intervalMs: 1,
      }),
    Error,
    "Upload failed",
  );

  await assertRejects(
    () =>
      waitForUpload({
        fetchStatus: () =>
          Promise.resolve(status({ lastAsyncUploadState: "IN_PROGRESS" })),
        sleep: () => Promise.resolve(),
        maxAttempts: 2,
        intervalMs: 1,
      }),
    Error,
    "timed out after 2 attempts",
  );
});

Deno.test("API clientは認証headerを付けてstatus endpointを呼ぶ", async () => {
  let request: Request | undefined;
  const client = new ChromeWebStoreClient(CONFIG, (input, init) => {
    request = new Request(input, init);
    return Promise.resolve(
      new Response(JSON.stringify(status()), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
  });

  assertEquals(await client.fetchStatus(), status());
  assertEquals(request?.method, "GET");
  assertEquals(
    request?.headers.get("authorization"),
    `Bearer ${CONFIG.accessToken}`,
  );
});

Deno.test("API clientはZIPをmedia uploadし応答版を検証する", async () => {
  let request: Request | undefined;
  const client = new ChromeWebStoreClient(CONFIG, (input, init) => {
    request = new Request(input, init);
    return Promise.resolve(
      new Response(
        JSON.stringify({
          name: ITEM_NAME,
          itemId: CONFIG.extensionId,
          crxVersion: "0.1.5",
          uploadState: "SUCCEEDED",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
  });

  const response = await client.upload(new Uint8Array([1, 2, 3]), "0.1.5");
  assertEquals(response.uploadState, "SUCCEEDED");
  assertEquals(request?.method, "POST");
  assertEquals(request?.headers.get("content-type"), "application/zip");
  assertEquals(
    new Uint8Array(await request!.arrayBuffer()),
    new Uint8Array([1, 2, 3]),
  );
});

Deno.test("publish APIが成功してもwarningを安全に拒否する", async () => {
  const client = new ChromeWebStoreClient(CONFIG, () =>
    Promise.resolve(
      new Response(
        JSON.stringify({
          name: ITEM_NAME,
          itemId: CONFIG.extensionId,
          state: "PENDING_REVIEW",
          warningInfo: {
            warnings: [{
              reason: "RISK",
              description: `Manual check required: ${CONFIG.accessToken}`,
            }],
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    ));

  const error = await assertRejects(
    () => client.publish(),
    Error,
    "Chrome Web Store publish returned warnings",
  );
  assert(!error.message.includes(CONFIG.accessToken));
});

Deno.test("非2xx応答はstatusと安全化したAPI詳細だけを報告する", async () => {
  const client = new ChromeWebStoreClient(CONFIG, () =>
    Promise.resolve(
      new Response(
        JSON.stringify({
          error: {
            code: 403,
            message: `denied ${CONFIG.accessToken}`,
            details: [{ reason: "PERMISSION_DENIED" }],
          },
        }),
        { status: 403, headers: { "content-type": "application/json" } },
      ),
    ));

  const error = await assertRejects(
    () => client.fetchStatus(),
    Error,
    "Chrome Web Store API request failed (403)",
  );
  assertStringIncludes(error.message, "PERMISSION_DENIED");
  assert(!error.message.includes(CONFIG.accessToken));
});

Deno.test("ログ用整形はtokenとauthorization headerを除去する", () => {
  const safe = sanitizeForLog(
    {
      authorization: `Bearer ${CONFIG.accessToken}`,
      nested: { message: `failed for ${CONFIG.accessToken}` },
    },
    [CONFIG.accessToken],
  );

  assertEquals(safe, {
    authorization: "[REDACTED]",
    nested: { message: "failed for [REDACTED]" },
  });
});

Deno.test("upload commandは同じ版が提出済みならZIPを読まない", async () => {
  let reads = 0;
  let requests = 0;
  const logs: string[] = [];

  await runChromeWebStoreCommand(
    ["upload", "package.zip", "0.1.5"],
    {
      CWS_ACCESS_TOKEN: CONFIG.accessToken,
      CWS_PUBLISHER_ID: CONFIG.publisherId,
      CWS_EXTENSION_ID: CONFIG.extensionId,
    },
    {
      fetch: () => {
        requests += 1;
        return Promise.resolve(
          new Response(
            JSON.stringify(
              status({
                submittedItemRevisionStatus: {
                  state: "PENDING_REVIEW",
                  distributionChannels: [{ crxVersion: "0.1.5" }],
                },
              }),
            ),
            { status: 200 },
          ),
        );
      },
      readFile: () => {
        reads += 1;
        return Promise.resolve(new Uint8Array());
      },
      sleep: () => Promise.resolve(),
      log: (message) => logs.push(message),
    },
  );

  assertEquals(requests, 1);
  assertEquals(reads, 0);
  assert(logs.some((message) => message.includes("already uploaded")));
});

Deno.test("publish commandはstatus確認後に審査提出する", async () => {
  const requests: Request[] = [];

  await runChromeWebStoreCommand(
    ["publish", "0.1.5"],
    {
      CWS_ACCESS_TOKEN: CONFIG.accessToken,
      CWS_PUBLISHER_ID: CONFIG.publisherId,
      CWS_EXTENSION_ID: CONFIG.extensionId,
    },
    {
      fetch: (input, init) => {
        const request = new Request(input, init);
        requests.push(request);
        if (request.method === "GET") {
          return Promise.resolve(
            new Response(
              JSON.stringify(
                status({ lastAsyncUploadState: "SUCCEEDED" }),
              ),
              { status: 200 },
            ),
          );
        }
        return Promise.resolve(
          new Response(
            JSON.stringify({
              name: ITEM_NAME,
              itemId: CONFIG.extensionId,
              state: "PENDING_REVIEW",
            }),
            { status: 200 },
          ),
        );
      },
      readFile: () => Promise.resolve(new Uint8Array()),
      sleep: () => Promise.resolve(),
      log: () => undefined,
    },
  );

  assertEquals(requests.map((request) => request.method), ["GET", "POST"]);
  assertEquals(await requests[1].json(), buildPublishRequest());
});
