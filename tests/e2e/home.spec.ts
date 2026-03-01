import { test, expect } from '@playwright/test';

test.describe('Home page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // The app renders null until React mounts — wait for a stable landmark
    await expect(page.getByRole('heading', { name: 'StoryReader' })).toBeVisible();
  });

  test('shows navbar with brand name', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'StoryReader' })).toBeVisible();
  });

  test('shows Sign In button when unauthenticated', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Sign In/i })).toBeVisible();
  });

  test('shows hero headline', async ({ page }) => {
    await expect(page.getByText('Read stories,')).toBeVisible();
    await expect(page.getByText('not web pages')).toBeVisible();
  });

  test('shows hero subtitle mentioning supported sites', async ({ page }) => {
    await expect(page.getByText(/Clarkesworld/)).toBeVisible();
    await expect(page.getByText(/Lightspeed/)).toBeVisible();
  });

  test('shows URL import form', async ({ page }) => {
    await expect(
      page.getByPlaceholder(/Paste a story URL from Clarkesworld/i)
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Import Story' })).toBeVisible();
  });

  test('shows chatbot FAB', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: /Open story finder/i })
    ).toBeVisible();
  });

  test('shows empty library state when no stories are saved', async ({ page }) => {
    await expect(page.getByText('Your library is empty')).toBeVisible();
    await expect(
      page.getByText('Import a story from the URL bar above to get started')
    ).toBeVisible();
  });
});
