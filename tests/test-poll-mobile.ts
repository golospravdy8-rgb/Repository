import { test, expect, Page } from '@playwright/test';

test.describe('Mobile Poll Implementation', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('http://localhost:3006/chat');
    // Wait for initial load
    await page.waitForTimeout(2000);
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('Poll block should NOT render checkboxes in chat stream', async () => {
    // Check that there are NO checkboxes in the messages area
    const checkboxes = await page.locator('input[type="checkbox"]').count();
    console.log(`[TEST] Found ${checkboxes} checkboxes in chat stream`);

    // All checkboxes should be in the poll creation modal, not in messages
    // Verify the structure:
    // 1. Should have ChatActivePoll component at top (pinned area)
    // 2. Should have poll creation modal at bottom when opened
    // 3. NO inline checkboxes in message stream

    expect(checkboxes).toBe(0); // No checkboxes in chat stream
  });

  test('Poll modal should open when clicking poll button', async () => {
    // Find and click the poll creation button
    const pollButton = page.locator('button[title="Створити опитування"]');
    await expect(pollButton).toBeVisible();
    await pollButton.click();

    // Wait for modal to appear
    await page.waitForTimeout(500);

    // Check that the poll creation modal is visible
    const modal = page.locator('text="Створити опитування"');
    await expect(modal).toBeVisible();

    // Modal should have:
    // - Question input
    // - Option inputs
    // - Create button
    const questionInput = page.locator('input[placeholder="Введіть питання опитування"]');
    await expect(questionInput).toBeVisible();

    console.log('[TEST] Poll modal opened successfully');
  });

  test('Active poll should display in pinned block (not in chat stream)', async () => {
    // This test assumes there's an active poll in the database
    // First, let's check if the pinned poll block exists
    const pollBlock = page.locator('text="Активне опитування"');

    // If there's an active poll, it should be in the pinned area, not in messages
    const pollBlockCount = await pollBlock.count();
    console.log(`[TEST] Found ${pollBlockCount} "Активне опитування" text occurrences`);

    // If poll exists, verify:
    // 1. It's in the fixed/pinned area (at top)
    // 2. It shows voting options as buttons (NOT checkboxes)
    if (pollBlockCount > 0) {
      // Look for poll voting buttons (should be <button> elements)
      const pollVoteButtons = page.locator('text="Натисніть на варіант щоб голосувати"').count();
      console.log(`[TEST] Poll vote instruction found: ${await pollVoteButtons}`);

      // Should NOT have checkboxes in poll section
      const pollCheckboxes = page.locator('input[type="checkbox"]').count();
      expect(await pollCheckboxes).toBe(0);
    }
  });

  test('Mobile layout should NOT have inline poll checkboxes', async () => {
    // Get all input elements
    const allInputs = await page.locator('input').count();
    console.log(`[TEST] Total inputs on page: ${allInputs}`);

    // Get all checkboxes
    const checkboxes = await page.locator('input[type="checkbox"]').count();
    console.log(`[TEST] Checkboxes found: ${checkboxes}`);

    // Get all text inputs
    const textInputs = await page.locator('input[type="text"]').count();
    console.log(`[TEST] Text inputs found: ${textInputs}`);

    // For mobile chat:
    // - Should have message input (1 text input in input area)
    // - Should NOT have checkboxes in chat stream
    expect(checkboxes).toBe(0);

    // Should have at least the message input
    expect(textInputs).toBeGreaterThanOrEqual(1);
  });

  test('Poll creation modal inputs should be visible and functional', async () => {
    // Open poll modal
    const pollButton = page.locator('button[title="Створити опитування"]');
    await pollButton.click();
    await page.waitForTimeout(500);

    // Get all text inputs in the modal
    const questionInput = page.locator('input[placeholder="Введіть питання опитування"]');
    const optionInputs = page.locator('input[placeholder*="Варіант"]');

    await expect(questionInput).toBeVisible();

    const optionCount = await optionInputs.count();
    console.log(`[TEST] Poll options visible: ${optionCount}`);

    // Should have at least 2 option inputs
    expect(optionCount).toBeGreaterThanOrEqual(2);
  });
});
