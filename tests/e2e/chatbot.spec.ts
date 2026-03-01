import { test, expect } from '@playwright/test';

const MOCK_CHAT_RESPONSE = {
  content: 'I recommend **"Story of Your Life"** by Ted Chiang.',
};

test.describe('ChatBot FAB', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(
      page.getByRole('button', { name: /Open story finder/i })
    ).toBeVisible();
  });

  test('FAB is visible on home page', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: /Open story finder/i })
    ).toBeVisible();
  });

  test('clicking the FAB opens the chat panel', async ({ page }) => {
    await page.getByRole('button', { name: /Open story finder/i }).click();
    await expect(page.getByText('Story Finder')).toBeVisible();
  });

  test('FAB is not visible while the panel is open', async ({ page }) => {
    await page.getByRole('button', { name: /Open story finder/i }).click();
    await expect(
      page.getByRole('button', { name: /Open story finder/i })
    ).not.toBeVisible();
  });
});

test.describe('Chat panel — no API key', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Open story finder/i }).click();
    await expect(page.getByText('Story Finder')).toBeVisible();
  });

  test('shows Gemini API key setup when no key is stored', async ({ page }) => {
    await expect(page.getByText('Gemini API Key')).toBeVisible();
    await expect(
      page.getByPlaceholder('Enter your API key')
    ).toBeVisible();
  });

  test('close button dismisses the panel', async ({ page }) => {
    await page.getByRole('button', { name: 'Close' }).click();
    await expect(page.getByText('Story Finder')).not.toBeVisible();
    await expect(
      page.getByRole('button', { name: /Open story finder/i })
    ).toBeVisible();
  });

  test('saves API key and reveals chat interface', async ({ page }) => {
    await page.getByPlaceholder('Enter your API key').fill('test-gemini-key-123');
    await page.getByRole('button', { name: 'Save Key' }).click();

    await expect(page.getByText('Hi! I can help you find stories.')).toBeVisible();
    await expect(
      page.getByPlaceholder('Ask me for story recommendations...')
    ).toBeVisible();
  });

  test('saved key shows suggestion chips', async ({ page }) => {
    await page.getByPlaceholder('Enter your API key').fill('test-key');
    await page.getByRole('button', { name: 'Save Key' }).click();

    await expect(
      page.getByRole('button', { name: 'Recommend a mind-bending sci-fi story' })
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: "What's good on Clarkesworld right now?" })
    ).toBeVisible();
  });
});

test.describe('Chat panel — with API key', () => {
  test.beforeEach(async ({ page }) => {
    // Inject API key into localStorage before the page loads
    await page.addInitScript(() => {
      localStorage.setItem('reader_gemini_api_key', 'test-key-123');
    });
    await page.goto('/');
    await page.getByRole('button', { name: /Open story finder/i }).click();
    await expect(page.getByText('Story Finder')).toBeVisible();
  });

  test('shows suggestion chips when API key is already set', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: 'Recommend a mind-bending sci-fi story' })
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: "What's good on Clarkesworld right now?" })
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'I want something like Ted Chiang' })
    ).toBeVisible();
  });

  test('shows message input field', async ({ page }) => {
    await expect(
      page.getByPlaceholder('Ask me for story recommendations...')
    ).toBeVisible();
  });

  test('send button is disabled when input is empty', async ({ page }) => {
    // The send button has no text label — locate by role within the form
    const sendButton = page.locator('form.chat-input-area button[type="submit"]');
    await expect(sendButton).toBeDisabled();
  });

  test('clicking a suggestion sends the message and shows response', async ({ page }) => {
    await page.route('**/api/chat', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_CHAT_RESPONSE),
      })
    );

    await page
      .getByRole('button', { name: 'Recommend a mind-bending sci-fi story' })
      .click();

    // User message appears
    await expect(
      page.getByText('Recommend a mind-bending sci-fi story')
    ).toBeVisible();
    // Assistant response appears (markdown rendered)
    await expect(
      page.getByText('"Story of Your Life"', { exact: false })
    ).toBeVisible();
  });

  test('typing and pressing Enter sends a message', async ({ page }) => {
    await page.route('**/api/chat', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_CHAT_RESPONSE),
      })
    );

    const input = page.getByPlaceholder('Ask me for story recommendations...');
    await input.fill('What is a good short story?');
    await input.press('Enter');

    await expect(page.getByText('What is a good short story?')).toBeVisible();
    await expect(
      page.getByText('"Story of Your Life"', { exact: false })
    ).toBeVisible();
  });

  test('shows typing indicator while awaiting response', async ({ page }) => {
    let resolveRoute!: () => void;
    await page.route('**/api/chat', async route => {
      await new Promise<void>(resolve => { resolveRoute = resolve; });
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_CHAT_RESPONSE),
      });
    });

    const input = page.getByPlaceholder('Ask me for story recommendations...');
    await input.fill('Recommend something');
    await input.press('Enter');

    await expect(page.locator('.chat-typing')).toBeVisible();
    resolveRoute();
    await expect(page.locator('.chat-typing')).not.toBeVisible();
  });

  test('input is cleared after sending a message', async ({ page }) => {
    await page.route('**/api/chat', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_CHAT_RESPONSE),
      })
    );

    const input = page.getByPlaceholder('Ask me for story recommendations...');
    await input.fill('Tell me a story');
    await input.press('Enter');
    await expect(input).toHaveValue('');
  });

  test('shows error message when chat API returns an error', async ({ page }) => {
    await page.route('**/api/chat', route =>
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Invalid API key.' }),
      })
    );

    const input = page.getByPlaceholder('Ask me for story recommendations...');
    await input.fill('Hello');
    await input.press('Enter');

    await expect(
      page.getByText(/Sorry, I encountered an error/i)
    ).toBeVisible();
  });

  test('clear chat button appears after messages and resets to suggestions', async ({
    page,
  }) => {
    await page.route('**/api/chat', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_CHAT_RESPONSE),
      })
    );

    // Send a message
    const input = page.getByPlaceholder('Ask me for story recommendations...');
    await input.fill('Hello');
    await input.press('Enter');
    await expect(
      page.getByText('"Story of Your Life"', { exact: false })
    ).toBeVisible();

    // Clear button should now be visible
    const clearBtn = page.getByTitle('Clear chat');
    await expect(clearBtn).toBeVisible();
    await clearBtn.click();

    // Suggestions should reappear
    await expect(
      page.getByRole('button', { name: 'Recommend a mind-bending sci-fi story' })
    ).toBeVisible();
  });

  test('API key settings button toggles the key management view', async ({ page }) => {
    await page.getByTitle('API Key Settings').click();
    await expect(page.getByText('Gemini API Key')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Remove Saved Key' })).toBeVisible();
  });

  test('removing the API key returns to key entry form', async ({ page }) => {
    await page.getByTitle('API Key Settings').click();
    await page.getByRole('button', { name: 'Remove Saved Key' }).click();

    await expect(
      page.getByPlaceholder('Enter your API key')
    ).toBeVisible();
    // Confirm key was removed from localStorage
    const storedKey = await page.evaluate(() =>
      localStorage.getItem('reader_gemini_api_key')
    );
    expect(storedKey).toBeNull();
  });
});
