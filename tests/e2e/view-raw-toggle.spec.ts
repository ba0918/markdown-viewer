import { test, expect } from './fixtures.ts';
import { openMarkdownFile, expectMarkdownRendered } from './helpers/extension-helpers.ts';

/**
 * View/Raw モード切り替え機能のE2Eテスト
 */

test.describe('View/Raw Mode Toggle', () => {
  test('should display View mode by default', async ({ page, testServerUrl }) => {
    // Markdownファイルを開く
    await openMarkdownFile(page, `${testServerUrl}/tests/e2e/fixtures/test.md`);
    await expectMarkdownRendered(page);

    // DocumentHeaderが表示されていること
    const header = page.locator('.document-header');
    await expect(header).toBeVisible();

    // View タブがアクティブであること
    const viewTab = page.locator('.document-header .tab').filter({ hasText: 'View' });
    await expect(viewTab).toHaveClass(/active/);

    // Viewモード（レンダリング結果）が表示されていること
    const markdownBody = page.locator('.markdown-body').first();
    await expect(markdownBody).toBeVisible();

    // Rawモードは表示されていないこと
    const rawTextView = page.locator('.raw-text-view');
    await expect(rawTextView).not.toBeVisible();
  });

  test('should switch to Raw mode when Raw tab is clicked', async ({ page, testServerUrl }) => {
    await openMarkdownFile(page, `${testServerUrl}/tests/e2e/fixtures/test.md`);
    await expectMarkdownRendered(page);

    // Raw タブをクリック
    const rawTab = page.locator('.document-header .tab').filter({ hasText: 'Raw' });
    await rawTab.click();

    // Raw タブがアクティブになること
    await expect(rawTab).toHaveClass(/active/);

    // Rawモード（元のMarkdown）が表示されること
    const rawTextView = page.locator('.raw-text-view');
    await expect(rawTextView).toBeVisible();

    // 元のMarkdownテキストが表示されること
    const rawContent = page.locator('.raw-text-content');
    await expect(rawContent).toContainText('# E2E Test Markdown');

    // Viewモードは表示されていないこと
    const markdownBody = page.locator('.markdown-body').first();
    await expect(markdownBody).not.toBeVisible();
  });

  test('should switch back to View mode when View tab is clicked', async ({ page, testServerUrl }) => {
    await openMarkdownFile(page, `${testServerUrl}/tests/e2e/fixtures/test.md`);
    await expectMarkdownRendered(page);

    // Rawモードに切り替え
    const rawTab = page.locator('.document-header .tab').filter({ hasText: 'Raw' });
    await rawTab.click();
    await expect(page.locator('.raw-text-view')).toBeVisible();

    // Viewタブをクリック
    const viewTab = page.locator('.document-header .tab').filter({ hasText: 'View' });
    await viewTab.click();

    // Viewタブがアクティブになること
    await expect(viewTab).toHaveClass(/active/);

    // Viewモード（レンダリング結果）が表示されること
    const markdownBody = page.locator('.markdown-body').first();
    await expect(markdownBody).toBeVisible();

    // Rawモードは表示されていないこと
    const rawTextView = page.locator('.raw-text-view');
    await expect(rawTextView).not.toBeVisible();
  });

  test('should display Frontmatter in Raw mode', async ({ page, testServerUrl }) => {
    await openMarkdownFile(page, `${testServerUrl}/tests/e2e/fixtures/frontmatter.md`);
    await expectMarkdownRendered(page);

    // Rawモードに切り替え
    const rawTab = page.locator('.document-header .tab').filter({ hasText: 'Raw' });
    await rawTab.click();

    // Frontmatterが表示されること
    const rawContent = page.locator('.raw-text-content');
    await expect(rawContent).toContainText('---');
    await expect(rawContent).toContainText('title: Frontmatter Test');
    await expect(rawContent).toContainText('author: Test User');
  });

  test('should have proper ARIA attributes for accessibility', async ({ page, testServerUrl }) => {
    await openMarkdownFile(page, `${testServerUrl}/tests/e2e/fixtures/test.md`);
    await expectMarkdownRendered(page);

    const viewTab = page.locator('.document-header .tab').filter({ hasText: 'View' });
    const rawTab = page.locator('.document-header .tab').filter({ hasText: 'Raw' });

    // View タブがアクティブ状態の ARIA 属性
    await expect(viewTab).toHaveAttribute('role', 'tab');
    await expect(viewTab).toHaveAttribute('aria-selected', 'true');
    await expect(rawTab).toHaveAttribute('aria-selected', 'false');

    // Raw タブをクリック
    await rawTab.click();

    // Raw タブがアクティブ状態の ARIA 属性
    await expect(rawTab).toHaveAttribute('aria-selected', 'true');
    await expect(viewTab).toHaveAttribute('aria-selected', 'false');
  });
});
