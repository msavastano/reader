import { test, expect } from '@playwright/test';

const MOCK_STORY = {
  title: 'The Last Signal',
  author: 'Ada Lovelace',
  content: '<p>In the year 2150, humanity received its last signal from the stars.</p>',
  excerpt: 'In the year 2150, humanity received its last signal from the stars.',
  siteName: 'Clarkesworld',
  wordCount: 3200,
};

test.describe('URL import form', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(
      page.getByPlaceholder(/Paste a story URL from Clarkesworld/i)
    ).toBeVisible();
  });

  test('Import Story button is disabled when URL input is empty', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Import Story' })).toBeDisabled();
  });

  test('Import Story button enables once a URL is typed', async ({ page }) => {
    await page
      .getByPlaceholder(/Paste a story URL/i)
      .fill('https://clarkesworldmagazine.com/story/test');
    await expect(page.getByRole('button', { name: 'Import Story' })).toBeEnabled();
  });

  test('clears URL and re-disables button after clearing input', async ({ page }) => {
    const input = page.getByPlaceholder(/Paste a story URL/i);
    await input.fill('https://example.com/story');
    await expect(page.getByRole('button', { name: 'Import Story' })).toBeEnabled();
    await input.clear();
    await expect(page.getByRole('button', { name: 'Import Story' })).toBeDisabled();
  });

  test('shows loading state while scrape request is in-flight', async ({ page }) => {
    // Hold the scrape response so we can observe the loading UI
    let resolveRoute!: () => void;
    await page.route('**/api/scrape', async route => {
      await new Promise<void>(resolve => { resolveRoute = resolve; });
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_STORY),
      });
    });

    await page
      .getByPlaceholder(/Paste a story URL/i)
      .fill('https://clarkesworldmagazine.com/story/test');
    await page.getByRole('button', { name: 'Import Story' }).click();

    await expect(page.getByText('Importing...')).toBeVisible();
    await expect(
      page.getByText('Fetching and extracting story content...')
    ).toBeVisible();

    resolveRoute();
  });

  test('shows error when site blocks scraping (403)', async ({ page }) => {
    await page.route('**/api/scrape', route =>
      route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'This site blocks automated access.' }),
      })
    );

    await page
      .getByPlaceholder(/Paste a story URL/i)
      .fill('https://example.com/story');
    await page.getByRole('button', { name: 'Import Story' }).click();

    await expect(page.getByText('This site blocks automated access.')).toBeVisible();
    // 403 auto-opens the manual import form
    await expect(
      page.getByRole('heading', { name: 'Manual Import' })
    ).toBeVisible();
  });

  test('shows error and "Try Manual Import" button on 500', async ({ page }) => {
    await page.route('**/api/scrape', route =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Failed to scrape story. The site may block automated access.',
        }),
      })
    );

    await page
      .getByPlaceholder(/Paste a story URL/i)
      .fill('https://example.com/story');
    await page.getByRole('button', { name: 'Import Story' }).click();

    await expect(
      page.getByText(/Failed to scrape story/i)
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: /Try Manual Import/i })
    ).toBeVisible();
  });

  test('"Try Manual Import" button opens the manual import form', async ({ page }) => {
    await page.route('**/api/scrape', route =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Failed to scrape story. The site may block automated access.' }),
      })
    );

    await page
      .getByPlaceholder(/Paste a story URL/i)
      .fill('https://example.com/story');
    await page.getByRole('button', { name: 'Import Story' }).click();
    await page.getByRole('button', { name: /Try Manual Import/i }).click();

    await expect(
      page.getByRole('heading', { name: 'Manual Import' })
    ).toBeVisible();
  });

  test('shows "Unauthorized" error after scrape succeeds when not signed in', async ({ page }) => {
    // Scrape returns valid data, but saveStory() server action requires auth
    await page.route('**/api/scrape', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_STORY),
      })
    );

    await page
      .getByPlaceholder(/Paste a story URL/i)
      .fill('https://clarkesworldmagazine.com/story/test');
    await page.getByRole('button', { name: 'Import Story' }).click();

    await expect(page.getByText(/Unauthorized/i)).toBeVisible();
  });
});

test.describe('"Or paste text manually" link', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Or paste text manually')).toBeVisible();
  });

  test('switches to manual import form when clicked', async ({ page }) => {
    await page.getByText('Or paste text manually').click();
    await expect(
      page.getByRole('heading', { name: 'Manual Import' })
    ).toBeVisible();
  });
});

test.describe('Manual import form', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByText('Or paste text manually').click();
    await expect(
      page.getByRole('heading', { name: 'Manual Import' })
    ).toBeVisible();
  });

  test('renders title, author, and content fields', async ({ page }) => {
    await expect(page.getByPlaceholder('Story Title')).toBeVisible();
    await expect(page.getByPlaceholder('Author')).toBeVisible();
    await expect(page.getByPlaceholder('Paste story content here...')).toBeVisible();
  });

  test('Save Story button is disabled when required fields are empty', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Save Story' })).toBeDisabled();
  });

  test('Save Story button is disabled when only title is filled', async ({ page }) => {
    await page.getByPlaceholder('Story Title').fill('My Story');
    await expect(page.getByRole('button', { name: 'Save Story' })).toBeDisabled();
  });

  test('Save Story button enables when title and content are filled', async ({ page }) => {
    await page.getByPlaceholder('Story Title').fill('My Story');
    await page
      .getByPlaceholder('Paste story content here...')
      .fill('Once upon a time in a galaxy far away...');
    await expect(page.getByRole('button', { name: 'Save Story' })).toBeEnabled();
  });

  test('author field is optional', async ({ page }) => {
    await page.getByPlaceholder('Story Title').fill('My Story');
    await page
      .getByPlaceholder('Paste story content here...')
      .fill('Content without an author.');
    // Button should still be enabled without author
    await expect(page.getByRole('button', { name: 'Save Story' })).toBeEnabled();
  });

  test('Cancel button returns to URL import form', async ({ page }) => {
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(
      page.getByPlaceholder(/Paste a story URL/i)
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Manual Import' })
    ).not.toBeVisible();
  });

  test('shows error when saving while not signed in', async ({ page }) => {
    await page.getByPlaceholder('Story Title').fill('My Test Story');
    await page
      .getByPlaceholder('Paste story content here...')
      .fill('A short story content.');
    await page.getByRole('button', { name: 'Save Story' }).click();

    await expect(page.getByText(/Unauthorized/i)).toBeVisible();
  });
});
