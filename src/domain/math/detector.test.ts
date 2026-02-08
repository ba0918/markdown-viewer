import { assertEquals } from "@std/assert";
import { hasMathExpression } from "./detector.ts";

Deno.test("hasMathExpression: detects inline math with $...$", () => {
  const text = "The equation $x^2 + y^2 = z^2$ is famous.";
  assertEquals(hasMathExpression(text), true);
});

Deno.test("hasMathExpression: detects display math with $$...$$", () => {
  const text = "The integral: $$\\int_0^\\infty e^{-x} dx = 1$$";
  assertEquals(hasMathExpression(text), true);
});

Deno.test("hasMathExpression: detects inline math with \\(...\\)", () => {
  const text = "Using LaTeX \\(\\alpha + \\beta\\) notation.";
  assertEquals(hasMathExpression(text), true);
});

Deno.test("hasMathExpression: detects display math with \\[...\\]", () => {
  const text = "The formula: \\[\\frac{a}{b} = c\\]";
  assertEquals(hasMathExpression(text), true);
});

Deno.test("hasMathExpression: returns false when no math expressions", () => {
  const text = "This is just plain text without any math.";
  assertEquals(hasMathExpression(text), false);
});

Deno.test("hasMathExpression: ignores escaped dollar signs", () => {
  const text = "The price is \\$100 and \\$200.";
  assertEquals(hasMathExpression(text), false);
});

Deno.test("hasMathExpression: detects multiple inline math expressions", () => {
  const text = "We have $a + b$ and $c - d$ in the same line.";
  assertEquals(hasMathExpression(text), true);
});

Deno.test("hasMathExpression: detects multiple display math expressions", () => {
  const text = "First: $$x = 1$$ Second: $$y = 2$$";
  assertEquals(hasMathExpression(text), true);
});

Deno.test("hasMathExpression: handles empty string", () => {
  assertEquals(hasMathExpression(""), false);
});

Deno.test("hasMathExpression: handles string with only spaces", () => {
  assertEquals(hasMathExpression("   "), false);
});
