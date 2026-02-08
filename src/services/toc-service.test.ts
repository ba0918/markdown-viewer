/**
 * TOCサービスのテスト
 */

import { assertEquals } from "@std/assert";
import { TocService } from "./toc-service.ts";

Deno.test("TocService.generate: 基本的なMarkdownからTOC生成", () => {
  const service = new TocService();
  const markdown = `
# Main Title
## Section 1
### Subsection 1.1
## Section 2
  `.trim();

  const result = service.generate(markdown);

  // ツリー構造: ルート要素が1つ
  assertEquals(result.length, 1);
  assertEquals(result[0].text, "Main Title");
  assertEquals(result[0].children.length, 2);
  assertEquals(result[0].children[0].text, "Section 1");
  assertEquals(result[0].children[0].children.length, 1);
  assertEquals(result[0].children[0].children[0].text, "Subsection 1.1");
  assertEquals(result[0].children[1].text, "Section 2");
});

Deno.test("TocService.generate: 見出しなしの場合は空配列", () => {
  const service = new TocService();
  const markdown = "Just a paragraph.";

  const result = service.generate(markdown);

  assertEquals(result.length, 0);
});

Deno.test("TocService.generate: 複雑なMarkdown", () => {
  const service = new TocService();
  const markdown = `
# Introduction

Some text here.

## Getting Started

More text.

### Prerequisites
### Installation

## Usage

### Basic Usage
### Advanced Usage

## API Reference
  `.trim();

  const result = service.generate(markdown);

  // ツリー構造: ルート要素が1つ（Introduction）
  assertEquals(result.length, 1);
  assertEquals(result[0].text, "Introduction");
  assertEquals(result[0].children.length, 3); // Getting Started, Usage, API Reference
  assertEquals(result[0].children[0].text, "Getting Started");
  assertEquals(result[0].children[0].children.length, 2); // Prerequisites, Installation
  assertEquals(result[0].children[0].children[0].text, "Prerequisites");
  assertEquals(result[0].children[0].children[1].text, "Installation");
  assertEquals(result[0].children[1].text, "Usage");
  assertEquals(result[0].children[1].children.length, 2); // Basic Usage, Advanced Usage
  assertEquals(result[0].children[1].children[0].text, "Basic Usage");
  assertEquals(result[0].children[1].children[1].text, "Advanced Usage");
  assertEquals(result[0].children[2].text, "API Reference");
});
