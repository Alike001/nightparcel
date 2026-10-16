import { expect, test } from '@playwright/test';

test('documentation home explains current scope and is linked from the landing page', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Documentation' }).click();
  await expect(page).toHaveURL(/\/docs$/);
  await expect(page.getByRole('heading', { name: 'Understand NightParcel' })).toBeVisible();
  await expect(page.getByText('Mainnet / real-value payments')).toBeVisible();
});

test('landing mobile navigation links directly to documentation', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.locator('summary[aria-label="Open navigation"]').click();
  await page.getByRole('navigation', { name: 'Mobile navigation' }).getByRole('link', { name: 'Documentation' }).click();
  await expect(page).toHaveURL(/\/docs$/);
  await expect(page.getByRole('heading', { name: 'Understand NightParcel' })).toBeVisible();
});

test('workspace help and privacy links open the appropriate first-party guides', async ({ page }) => {
  await page.goto('/app/settings');
  await page.getByRole('link', { name: 'Help' }).click();
  await expect(page).toHaveURL(/\/docs\/getting-started$/);
  await expect(page.getByRole('heading', { name: 'Run NightParcel locally' })).toBeVisible();

  await page.goto('/app/settings');
  await page.getByRole('link', { name: /Read the privacy guide/ }).click();
  await expect(page).toHaveURL(/\/docs\/privacy$/);
});

test('desktop sidebar navigates and exposes the active page', async ({ page }) => {
  await page.goto('/docs');
  const sidebar = page.getByRole('navigation', { name: 'Documentation navigation' });
  await expect(sidebar.getByRole('link', { name: 'Introduction' })).toHaveAttribute('aria-current', 'page');
  await sidebar.getByRole('link', { name: 'Privacy' }).click();
  await expect(page).toHaveURL(/\/docs\/privacy$/);
  await expect(sidebar.getByRole('link', { name: 'Privacy' })).toHaveAttribute('aria-current', 'page');
});

test('nested documentation deep links survive browser refresh', async ({ page }) => {
  await page.goto('/docs/architecture');
  await expect(page.getByRole('heading', { name: 'Self-custodial by construction' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Self-custodial by construction' })).toBeVisible();
  await expect(page.getByText('acknowledgeReceipt', { exact: true })).toBeVisible();
});

test('mobile documentation navigation opens and changes page', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/docs');
  await page.getByRole('button', { name: 'Open documentation navigation' }).click();
  const navigation = page.getByRole('navigation', { name: 'Mobile documentation navigation' });
  await expect(navigation).toBeVisible();
  await navigation.getByRole('link', { name: 'Troubleshooting' }).click();
  await expect(page).toHaveURL(/\/docs\/troubleshooting$/);
  await expect(page.getByRole('heading', { name: 'Resolve readiness and evidence problems' })).toBeVisible();
});

test('on-page table of contents uses stable heading anchors', async ({ page }) => {
  await page.goto('/docs/verification');
  await page.getByRole('navigation', { name: 'On this page' }).getByRole('link', { name: 'Six settlement checks' }).click();
  await expect(page).toHaveURL(/#six-checks$/);
  await expect(page.getByRole('heading', { name: 'The six settlement checks' })).toBeVisible();
});

test('code blocks copy verified commands', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://127.0.0.1:4175' });
  await page.goto('/docs/getting-started');
  await page.getByRole('button', { name: 'Copy Terminal code' }).first().click();
  await expect(page.getByRole('button', { name: 'Copy Terminal code' }).first()).toContainText('Copied');
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain('yarn install --immutable');
  expect(copied).toContain('yarn compile:fast');
});

test('documentation navigation is keyboard operable', async ({ page }) => {
  await page.goto('/docs');
  const payments = page.getByRole('navigation', { name: 'Documentation navigation' }).getByRole('link', { name: 'Payments' });
  await payments.focus();
  await expect(payments).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/docs\/payments$/);
  await expect(page.getByRole('heading', { name: 'Request, review, and pay' })).toBeVisible();
});

test('missing documentation pages have a useful local 404', async ({ page }) => {
  await page.goto('/docs/not-a-real-guide');
  await expect(page.getByRole('heading', { name: 'That guide does not exist.' })).toBeVisible();
  await page.getByRole('link', { name: 'Documentation home' }).click();
  await expect(page).toHaveURL(/\/docs$/);
});

for (const viewport of [
  { width: 1440, height: 1000 },
  { width: 1024, height: 900 },
  { width: 768, height: 900 },
  { width: 390, height: 844 },
]) {
  test(`documentation has no page overflow at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    for (const path of ['/docs', '/docs/developers', '/docs/troubleshooting', '/docs/not-a-real-guide']) {
      await page.goto(path);
      await expect(page.locator('.docs-shell')).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, `${path} overflow`).toBeLessThanOrEqual(0);
    }
  });
}

test('captures genuine documentation screenshots', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/docs');
  await expect(page.getByRole('heading', { name: 'Understand NightParcel' })).toBeVisible();
  await page.screenshot({ path: '../../evidence/phase1f-docs-1440.png', fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/docs/verification');
  await expect(page.getByRole('heading', { name: 'Prove settlement with six checks' })).toBeVisible();
  await page.screenshot({ path: '../../evidence/phase1f-docs-verification-390.png', fullPage: true });
});
