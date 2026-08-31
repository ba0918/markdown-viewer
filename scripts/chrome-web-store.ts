import {
  ChromeWebStoreClient,
  decidePublish,
  decideUpload,
  parseChromeWebStoreConfig,
  waitForUpload,
} from "./lib/chrome-web-store.ts";

export interface ChromeWebStoreCommandDependencies {
  fetch: typeof fetch;
  readFile: (path: string) => Promise<Uint8Array>;
  sleep: (milliseconds: number) => Promise<void>;
  log: (message: string) => void;
}

const DEFAULT_DEPENDENCIES: ChromeWebStoreCommandDependencies = {
  fetch,
  readFile: Deno.readFile,
  sleep: (milliseconds) =>
    new Promise((resolve) => setTimeout(resolve, milliseconds)),
  log: console.log,
};

const POLLING_ATTEMPTS = 30;
const POLLING_INTERVAL_MS = 10_000;

function requireArguments(
  args: string[],
  expectedCount: number,
  usage: string,
): void {
  if (args.length !== expectedCount) {
    throw new Error(`Usage: ${usage}`);
  }
}

export async function runChromeWebStoreCommand(
  args: string[],
  environment: Record<string, string | undefined>,
  dependencies: ChromeWebStoreCommandDependencies = DEFAULT_DEPENDENCIES,
): Promise<void> {
  const [command] = args;
  const config = parseChromeWebStoreConfig(environment);
  const client = new ChromeWebStoreClient(config, dependencies.fetch);

  if (command === "status") {
    requireArguments(args, 1, "chrome-web-store.ts status");
    const response = await client.fetchStatus();
    dependencies.log(
      `Chrome Web Store status: upload=${
        response.lastAsyncUploadState ?? "missing"
      }, submitted=${
        response.submittedItemRevisionStatus?.state ?? "none"
      }, published=${response.publishedItemRevisionStatus?.state ?? "none"}`,
    );
    return;
  }

  if (command === "upload") {
    requireArguments(
      args,
      3,
      "chrome-web-store.ts upload <package.zip> <version>",
    );
    const [, packagePath, expectedVersion] = args;
    const currentStatus = await client.fetchStatus();
    const decision = decideUpload(currentStatus, expectedVersion);

    if (decision === "skip") {
      dependencies.log(
        `Chrome Web Store version ${expectedVersion} is already uploaded; skipping upload`,
      );
      return;
    }
    if (decision === "wait") {
      await waitForUpload({
        fetchStatus: () => client.fetchStatus(),
        sleep: dependencies.sleep,
        maxAttempts: POLLING_ATTEMPTS,
        intervalMs: POLLING_INTERVAL_MS,
      });
      throw new Error(
        "An existing Chrome Web Store upload completed, but the API cannot identify its version; retry only the downstream publish job after verifying the version",
      );
    }

    const uploadResponse = await client.upload(
      await dependencies.readFile(packagePath),
      expectedVersion,
    );
    if (uploadResponse.uploadState === "IN_PROGRESS") {
      await waitForUpload({
        fetchStatus: () => client.fetchStatus(),
        sleep: dependencies.sleep,
        maxAttempts: POLLING_ATTEMPTS,
        intervalMs: POLLING_INTERVAL_MS,
      });
    }
    dependencies.log(
      `Chrome Web Store accepted version ${expectedVersion}`,
    );
    return;
  }

  if (command === "publish") {
    requireArguments(args, 2, "chrome-web-store.ts publish <version>");
    const [, expectedVersion] = args;
    const currentStatus = await client.fetchStatus();
    if (decidePublish(currentStatus, expectedVersion) === "skip") {
      dependencies.log(
        `Chrome Web Store version ${expectedVersion} is already submitted or published; skipping publish`,
      );
      return;
    }

    await client.publish();
    dependencies.log(
      `Chrome Web Store version ${expectedVersion} was submitted for review`,
    );
    return;
  }

  throw new Error(
    "Usage: chrome-web-store.ts <status|upload|publish> [arguments]",
  );
}

if (import.meta.main) {
  try {
    await runChromeWebStoreCommand(Deno.args, {
      CWS_ACCESS_TOKEN: Deno.env.get("CWS_ACCESS_TOKEN"),
      CWS_PUBLISHER_ID: Deno.env.get("CWS_PUBLISHER_ID"),
      CWS_EXTENSION_ID: Deno.env.get("CWS_EXTENSION_ID"),
    });
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    Deno.exit(1);
  }
}
