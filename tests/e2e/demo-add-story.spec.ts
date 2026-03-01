/**
 * Demo: Adding a story to the library
 *
 * This test is intentionally slow (slowMo is set in the project below) so you
 * can watch every step in the headed browser window.
 *
 * Run with:
 *   npx playwright test demo-add-story.spec.ts --project=demo --headed
 */

import { test, expect } from '@playwright/test';

const MOCK_STORY = {
  title: 'The Last Signal',
  author: 'Ada Lovelace',
  content: `
    <p>In the year 2150, humanity received its last signal from the stars.
    It came not as a grand announcement, but as a whisper — a single line
    of prime numbers encoded in the background radiation of the cosmos.</p>
    <p>Dr. Yuki Tanaka was the first to notice the pattern. She had been
    running the overnight shift at the Atacama Array when the anomaly
    appeared on her screen, so faint it would have been dismissed as
    instrument noise by anyone less obsessive.</p>
    <p>"This isn't noise," she told herself, pulling her coffee closer
    as the southern hemisphere night deepened around her. "This is
    someone saying hello."</p>
  `,
  excerpt:
    'In the year 2150, humanity received its last signal from the stars. It came not as a grand announcement, but as a whisper...',
  siteName: 'Clarkesworld',
  wordCount: 4800,
};

test.use({
  // Slow everything down so the demo is watchable
  launchOptions: { slowMo: 600 },
  viewport: { width: 1280, height: 800 },
});

test('Demo: import a story via URL and switch to manual import', async ({ page }) => {
  // ── Step 1: Open the app ──────────────────────────────────────────────────
  await test.step('Open StoryReader', async () => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'StoryReader' })).toBeVisible();
  });

  // ── Step 2: Paste a URL ───────────────────────────────────────────────────
  await test.step('Paste a Clarkesworld story URL', async () => {
    await page
      .getByPlaceholder(/Paste a story URL from Clarkesworld/i)
      .fill('https://clarkesworldmagazine.com/larson_02_26/');
  });

  // ── Step 3: Mock the scrape API to return a real-looking story ────────────
  await page.route('**/api/scrape', async route => {
    // Simulate a brief network delay so the loading UI is visible
    await new Promise(resolve => setTimeout(resolve, 1200));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_STORY),
    });
  });

  // ── Step 4: Click Import Story and watch the loading state ────────────────
  await test.step('Click Import Story — observe loading indicator', async () => {
    await page.getByRole('button', { name: 'Import Story' }).click();
    await expect(page.getByText('Importing...')).toBeVisible();
    await expect(
      page.getByText('Fetching and extracting story content...')
    ).toBeVisible();
  });

  // ── Step 5: Scrape succeeds; saving requires auth ─────────────────────────
  await test.step('Scrape succeeds — saveStory requires sign-in', async () => {
    // The server action throws "Unauthorized" for unauthenticated users.
    // In a real session this would show the success toast.
    await expect(page.getByText(/Unauthorized/i)).toBeVisible();
  });

  // ── Step 6: Show the manual import path instead ───────────────────────────
  await test.step('Switch to manual import form', async () => {
    // Remove the route mock so we start fresh
    await page.unrouteAll();

    // Navigate back to the URL form state by reloading
    await page.reload();
    await expect(
      page.getByPlaceholder(/Paste a story URL from Clarkesworld/i)
    ).toBeVisible();

    await page.getByText('Or paste text manually').click();
    await expect(page.getByRole('heading', { name: 'Manual Import' })).toBeVisible();
  });

  // ── Step 7: Fill in the manual import form ────────────────────────────────
  await test.step('Fill in the manual import form', async () => {
    await page.getByPlaceholder('Story Title').fill('The Last Signal');
    await page.getByPlaceholder('Author').fill('Ada Lovelace');
    await page.getByPlaceholder('Paste story content here...').fill(
      'In the year 2150, humanity received its last signal from the stars. ' +
        'It came not as a grand announcement, but as a whisper — a single line ' +
        'of prime numbers encoded in the background radiation of the cosmos.\n\n' +
        'Dr. Yuki Tanaka was the first to notice the pattern. She had been ' +
        'running the overnight shift at the Atacama Array when the anomaly ' +
        'appeared on her screen, so faint it would have been dismissed as ' +
        'instrument noise by anyone less obsessive.'
    );
  });

  // ── Step 8: Confirm Save Story is enabled ────────────────────────────────
  await test.step('Save Story button is enabled', async () => {
    await expect(page.getByRole('button', { name: 'Save Story' })).toBeEnabled();
  });

  // ── Step 9: Submit — auth error expected (not signed in) ──────────────────
  await test.step('Submit — server requires sign-in to persist', async () => {
    await page.getByRole('button', { name: 'Save Story' }).click();
    await expect(page.getByText(/Unauthorized/i)).toBeVisible();
  });

  // ── Step 10: Show what Sign In looks like ────────────────────────────────
  await test.step('Sign In button is available in the navbar', async () => {
    await page.reload();
    await expect(page.getByRole('button', { name: /Sign In/i })).toBeVisible();
  });
});
