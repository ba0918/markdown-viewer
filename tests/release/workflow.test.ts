import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { parse } from "@std/yaml";

interface WorkflowStep {
  name?: string;
  env?: Record<string, string>;
  run?: string;
  with?: Record<string, string | number>;
}

Deno.test("release workflowは手動入力をshellへ直接埋め込まず検証後に公開する", async () => {
  const workflow = parse(
    await Deno.readTextFile(".github/workflows/release.yml"),
  ) as {
    jobs: { release: { if?: string; steps: WorkflowStep[] } };
  };
  const releaseJob = workflow.jobs.release;
  const steps = releaseJob.steps;
  const checkoutStep = steps.find((step) =>
    step.name === "Checkout repository"
  );
  const verifyStep = steps.find((step) =>
    step.name === "Verify release metadata"
  );
  const ensureNewTagStep = steps.find((step) =>
    step.name === "Ensure release tag is new"
  );
  const releaseStep = steps.find((step) =>
    step.name === "Create GitHub Release"
  );
  const releaseIndex = steps.indexOf(releaseStep!);
  const testIndex = steps.findIndex((step) => step.name === "Run unit tests");

  assertEquals(releaseJob.if, "github.ref == 'refs/heads/main'");
  assertEquals(checkoutStep?.with?.["fetch-depth"], 0);
  assert(verifyStep?.run);
  assertEquals(verifyStep.env?.RELEASE_REF, "${{ inputs.tag_name }}");
  assertStringIncludes(verifyStep.run, 'release:verify "$RELEASE_REF"');
  assert(!verifyStep.run.includes("${{"));
  assertStringIncludes(ensureNewTagStep?.run ?? "", "refs/tags/$RELEASE_REF");
  assert(testIndex >= 0 && releaseIndex > testIndex);
  assertEquals(releaseStep?.with?.target_commitish, "${{ github.sha }}");
  assert(!steps.some((step) => step.run?.includes("writeTextFile")));
});
