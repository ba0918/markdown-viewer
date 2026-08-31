import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { parse } from "@std/yaml";

interface WorkflowStep {
  id?: string;
  name?: string;
  uses?: string;
  env?: Record<string, string>;
  run?: string;
  with?: Record<string, string | number | boolean>;
}

interface WorkflowJob {
  if?: string;
  needs?: string | string[];
  environment?: string;
  permissions?: Record<string, string>;
  outputs?: Record<string, string>;
  steps: WorkflowStep[];
}

interface ReleaseWorkflow {
  on: Record<string, unknown>;
  jobs: Record<string, WorkflowJob>;
}

async function loadWorkflow(): Promise<ReleaseWorkflow> {
  return parse(
    await Deno.readTextFile(".github/workflows/release.yml"),
  ) as ReleaseWorkflow;
}

function step(job: WorkflowJob, name: string): WorkflowStep {
  const found = job.steps.find((candidate) => candidate.name === name);
  assert(found, `Missing workflow step: ${name}`);
  return found;
}

Deno.test("release workflowは手動main実行だけを受け付ける", async () => {
  const workflow = await loadWorkflow();
  assertEquals(Object.keys(workflow.on), ["workflow_dispatch"]);

  for (const job of Object.values(workflow.jobs)) {
    assertStringIncludes(
      job.if ?? "",
      "github.event_name == 'workflow_dispatch'",
    );
    assertStringIncludes(job.if ?? "", "github.ref == 'refs/heads/main'");
  }
});

Deno.test("release job graphはprepareからpublishまで直列に分離される", async () => {
  const { jobs } = await loadWorkflow();
  assertEquals(Object.keys(jobs), [
    "prepare",
    "github-release",
    "cws-upload",
    "cws-publish",
  ]);
  assertEquals(jobs.prepare.needs, undefined);
  assertEquals(jobs["github-release"].needs, "prepare");
  assertEquals(jobs["cws-upload"].needs, "github-release");
  assertEquals(jobs["cws-publish"].needs, "cws-upload");
  assertEquals(
    jobs.prepare.outputs?.version,
    "${{ steps.version.outputs.version }}",
  );
});

Deno.test("prepareは品質確認後に一つのZIPとchecksumを共有する", async () => {
  const { prepare } = (await loadWorkflow()).jobs;
  const steps = prepare.steps;
  const verify = step(prepare, "Verify release metadata");
  const packageStep = step(prepare, "Create extension package and checksum");
  const upload = step(prepare, "Upload release package");

  assertEquals(prepare.permissions, { contents: "read" });
  assertEquals(verify.env?.RELEASE_REF, "${{ inputs.tag_name }}");
  assertStringIncludes(verify.run ?? "", 'release:verify "$RELEASE_REF"');
  assert(!(verify.run ?? "").includes("${{"));
  assert(
    steps.indexOf(packageStep) >
      steps.findIndex((candidate) => candidate.name === "Run unit tests"),
  );
  assertStringIncludes(packageStep.run ?? "", "sha256sum");
  assertEquals(upload.uses, "actions/upload-artifact@v7");
  assertEquals(upload.with?.name, "release-package");
  assertStringIncludes(String(upload.with?.path), "*.zip");
  assertStringIncludes(String(upload.with?.path), "*.sha256");
});

Deno.test("成果物を使う各jobは同じchecksumを検証する", async () => {
  const { jobs } = await loadWorkflow();
  for (const jobName of ["github-release", "cws-upload"]) {
    const job = jobs[jobName];
    assertEquals(
      step(job, "Download release package").with?.name,
      "release-package",
    );
    assertStringIncludes(
      step(job, "Verify package checksum").run ?? "",
      "sha256sum --check",
    );
  }
});

Deno.test("store jobはEnvironmentとjob単位の最小権限を使う", async () => {
  const { jobs } = await loadWorkflow();
  for (const jobName of ["cws-upload", "cws-publish"]) {
    const job = jobs[jobName];
    assertEquals(job.environment, "chrome-web-store");
    assertEquals(job.permissions, { contents: "read", "id-token": "write" });
  }
  assertEquals(jobs["github-release"].permissions, { contents: "write" });
});

Deno.test("store jobはWIFでChrome Web Store専用access tokenを取得する", async () => {
  const { jobs } = await loadWorkflow();
  for (const jobName of ["cws-upload", "cws-publish"]) {
    const auth = step(jobs[jobName], "Authenticate to Google Cloud");
    assertEquals(auth.uses, "google-github-actions/auth@v3");
    assertEquals(
      auth.with?.workload_identity_provider,
      "${{ vars.GCP_WORKLOAD_IDENTITY_PROVIDER }}",
    );
    assertEquals(
      auth.with?.service_account,
      "${{ vars.GCP_SERVICE_ACCOUNT }}",
    );
    assertEquals(auth.with?.token_format, "access_token");
    assertEquals(
      auth.with?.access_token_scopes,
      "https://www.googleapis.com/auth/chromewebstore",
    );
    assertEquals(auth.with?.create_credentials_file, false);
    assertEquals(auth.with?.export_environment_variables, false);
    assertEquals(auth.with?.credentials_json, undefined);
  }
});

Deno.test("uploadとpublishはtokenを成果物やoutputへ渡さず専用CLIを呼ぶ", async () => {
  const { jobs } = await loadWorkflow();
  const upload = step(
    jobs["cws-upload"],
    "Upload package to Chrome Web Store",
  );
  const publish = step(
    jobs["cws-publish"],
    "Submit Chrome Web Store review",
  );

  for (const command of [upload, publish]) {
    assertEquals(
      command.env?.CWS_ACCESS_TOKEN,
      "${{ steps.auth.outputs.access_token }}",
    );
    assertEquals(
      command.env?.CWS_PUBLISHER_ID,
      "${{ vars.CWS_PUBLISHER_ID }}",
    );
    assertEquals(
      command.env?.CWS_EXTENSION_ID,
      "${{ vars.CWS_EXTENSION_ID }}",
    );
  }
  assertStringIncludes(upload.run ?? "", "deno task cws:upload");
  assertStringIncludes(publish.run ?? "", "deno task cws:publish");
  assertEquals(jobs["cws-upload"].outputs, undefined);
  assertEquals(jobs["cws-publish"].outputs, undefined);
});

Deno.test("workflow sourceに固定IDや長期credentialを置かない", async () => {
  const source = await Deno.readTextFile(".github/workflows/release.yml");
  for (
    const forbidden of [
      "747816770434",
      "1152844640",
      "932834",
      "client_secret",
      "refresh_token",
      "private_key",
      "credentials_json",
      "CHROME_WEB_STORE_CLIENT",
    ]
  ) {
    assert(
      !source.includes(forbidden),
      `workflow contains forbidden value: ${forbidden}`,
    );
  }
});
