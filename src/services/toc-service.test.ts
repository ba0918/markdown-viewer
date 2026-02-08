/**
 * TOCサービスのテスト
 */

import { assertEquals } from '@std/assert';
import { TocService } from './toc-service.ts';

Deno.test('TocService.generate: 基本的なMarkdownからTOC生成', () => {
  const service = new TocService();
  const markdown = `
# Main Title
## Section 1
### Subsection 1.1
## Section 2
  `.trim();

  const result = service.generate(markdown);

  assertEquals(result.length, 4);
  assertEquals(result[0].text, 'Main Title');
  assertEquals(result[1].text, 'Section 1');
  assertEquals(result[2].text, 'Subsection 1.1');
  assertEquals(result[3].text, 'Section 2');
});

Deno.test('TocService.generate: 見出しなしの場合は空配列', () => {
  const service = new TocService();
  const markdown = 'Just a paragraph.';

  const result = service.generate(markdown);

  assertEquals(result.length, 0);
});

Deno.test('TocService.generate: 複雑なMarkdown', () => {
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

  assertEquals(result.length, 8);
  assertEquals(result[0].text, 'Introduction');
  assertEquals(result[1].text, 'Getting Started');
  assertEquals(result[2].text, 'Prerequisites');
  assertEquals(result[3].text, 'Installation');
  assertEquals(result[4].text, 'Usage');
  assertEquals(result[5].text, 'Basic Usage');
  assertEquals(result[6].text, 'Advanced Usage');
  assertEquals(result[7].text, 'API Reference');
});
