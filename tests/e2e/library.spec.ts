import { test, expect } from '@playwright/test';

test.describe('Library — unauthenticated', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(
      page.getByRole('button', { name: /Open story finder/i })
    ).toBeVisible();
  });

  test('shows empty-library placeholder when no stories are saved', async ({ page }) => {
    await expect(page.getByText('Your library is empty')).toBeVisible();
    await expect(
      page.getByText('Import a story from the URL bar above to get started')
    ).toBeVisible();
  });

  test('empty-library includes a book emoji', async ({ page }) => {
    await expect(page.getByText('📚')).toBeVisible();
  });

  test('"Your Library" section heading is absent when the library is empty', async ({
    page,
  }) => {
    // The "Your Library" section only renders when stories.length > 0
    await expect(page.getByRole('heading', { name: 'Your Library' })).not.toBeVisible();
  });
});

/**
 * Tests for an authenticated user with stories require a saved auth session.
 *
 * To run these, complete Google OAuth manually once and save the storage state:
 *
 *   npx playwright codegen http://localhost:3000 --save-storage=auth.json
 *
 * Then add to playwright.config.ts:
 *   use: { storageState: 'auth.json' }
 *
 * Authenticated library tests to add:
 *  - Story cards display title, author, word count, site name
 *  - "Start Reading" button opens the reader view
 *  - Delete button requires a second click to confirm
 *  - Pending-delete button shows "Delete?" label
 *  - Edit pencil icon switches card to edit mode
 *  - Edit mode has Title / Author / Magazine inputs
 *  - Saving edit updates the card title
 *  - Cancel edit restores the original values
 */
