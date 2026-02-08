/**
 * Mermaid Renderer Tests
 *
 * ⚠️ mermaid requires a real browser environment (document, window).
 *
 * These tests are SKIPPED in Deno environment because:
 * - mermaid.initialize() requires window object
 * - mermaid.render() requires DOM
 *
 * Full rendering tests are performed in E2E tests:
 * - tests/e2e/mermaid-rendering.spec.ts (Playwright with real browser)
 *
 * If you need unit tests for mermaid rendering logic:
 * 1. Use JSDOM or similar browser environment simulator
 * 2. Or mock the mermaid dependencies
 * 3. Or keep E2E tests as the primary testing method
 */

import { assertEquals } from "@std/assert";

Deno.test("renderer: placeholder test (actual tests in E2E)", () => {
  // This is a placeholder to prevent "no tests found" error
  // Actual mermaid rendering tests are in tests/e2e/mermaid-rendering.spec.ts
  assertEquals(1 + 1, 2);
});

// Note: Race condition tests are covered by E2E tests
// The initializeMermaid() function now uses a Promise-based approach to prevent:
// 1. Multiple concurrent initializations
// 2. Rendering before initialization completes
//
// E2E tests verify:
// - Multiple Mermaid diagrams render correctly
// - Theme switching works without race conditions
// - Concurrent rendering of different diagram types

/**
 * Test coverage by E2E tests (tests/e2e/mermaid-rendering.spec.ts):
 * - Flowchart rendering to SVG
 * - Sequence diagram rendering to SVG
 * - Class diagram rendering to SVG
 * - Multiple diagram types handling
 * - Theme integration (light/dark themes)
 * - Error handling for invalid Mermaid syntax
 * - Dynamic Import verification (library not loaded when no diagrams)
 */
