import { expect, test } from '@playwright/test';

const committedRequest = {
  version: 'nightparcel.invoice.v1',
  network: 'undeployed',
  contractAddress: 'ab'.repeat(32),
  invoiceCommitment: 'cd'.repeat(32),
  tokenColor: 'ef'.repeat(32),
  amount: '125',
  recipient: `mn_shield-addr_undeployed1${'a'.repeat(72)}`,
  expiresAt: 4_102_444_800,
  memo: 'Product design milestone',
};

test('landing page explains the product and primary CTA opens the workspace', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Get paid privately/ })).toBeVisible();
  await expect(page.getByText('Custom test tokens only—no mainnet or real-value payments.')).toBeVisible();
  await page.getByRole('link', { name: /Open NightParcel/ }).click();
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByRole('heading', { name: 'Private payments, with evidence built in.' })).toBeVisible();
});

test('landing navigation reaches product sections', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'How it works' }).click();
  await expect(page).toHaveURL(/#how-it-works$/);
  await expect(page.getByRole('heading', { name: 'Three steps. Three independent truths.' })).toBeVisible();
});

test('responsive navigation works at 390px', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.locator('summary[aria-label="Open navigation"]').click();
  const mobileNav = page.getByRole('navigation', { name: 'Mobile navigation' });
  await expect(mobileNav).toBeVisible();
  await mobileNav.getByRole('link', { name: 'Security' }).click();
  await expect(page).toHaveURL(/#security$/);
});

test('wallet-disconnected overview gives one clear Lace action and honest failure', async ({ page }) => {
  await page.goto('/app');
  await expect(page.getByRole('heading', { name: 'Connect a disposable Lace wallet' })).toBeVisible();
  await page.getByRole('button', { name: 'Connect Lace' }).first().click();
  await expect(page.getByText('Lace is not available in this browser profile.')).toBeVisible();
  await expect(page.getByText(/never asks for a seed or wallet password/i)).toBeVisible();
});

test('wallet connection exposes a loading state while Lace approval is pending', async ({ page }) => {
  await page.addInitScript(() => {
    const pending = new Promise<never>(() => undefined);
    window.midnight = {
      'fixture-wallet': {
        apiVersion: '4.0.1',
        rdns: 'io.lace.fixture',
        name: 'Lace fixture',
        icon: '',
        connect: () => pending,
      },
    };
  });
  await page.goto('/app');
  await expect(page.getByRole('button', { name: 'Connect Lace' }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Connect Lace' }).first().click();
  await expect(page.getByRole('button', { name: 'Waiting for Lace…' }).first()).toBeDisabled();
  await expect(page.getByText('Check Lace and approve the NightParcel connection request.')).toBeVisible();
});

test('request form validates fields and produces an honest downloadable draft', async ({ page }) => {
  await page.goto('/app/request');
  await page.getByRole('button', { name: /Create private draft/ }).click();
  await expect(page.getByText('Enter a whole amount greater than zero.')).toBeVisible();
  await expect(page.getByText('Add a short private description.')).toBeVisible();
  await expect(page.getByText('Enter the intended recipient’s full shielded address.')).toBeVisible();

  await page.getByLabel('Amount').fill('125');
  await page.getByLabel('Private description').fill('Brand identity — final milestone');
  await page.getByLabel('Intended recipient').fill(`mn_shield-addr_undeployed1${'b'.repeat(72)}`);
  await page.getByLabel('Expires').fill('2099-01-01T12:00');
  await page.getByRole('button', { name: /Create private draft/ }).click();
  await expect(page.getByText(/Private draft created/)).toBeVisible();
  await expect(page.getByText('Draft files are not payable.')).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download file' }).click();
  expect((await downloadPromise).suggestedFilename()).toBe('nightparcel-private-request-draft.json');
});

test('payment import presents exact review terms but keeps authorization disabled without Lace', async ({ page }) => {
  await page.goto('/app/pay');
  await page.getByLabel('Select file').setInputFiles({
    name: 'committed-request.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(committedRequest)),
  });
  await expect(page.getByRole('heading', { name: 'Check every term' })).toBeVisible();
  await expect(page.getByText('125', { exact: true })).toBeVisible();
  await expect(page.getByText('undeployed', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /Authorize in Lace/ })).toBeDisabled();
  await expect(page.getByText(/valid request alone cannot start a payment/i)).toBeVisible();
});

test('uncommitted draft cannot enter the payment authorization flow', async ({ page }) => {
  await page.goto('/app/pay');
  await page.getByLabel('Select file').setInputFiles({
    name: 'draft.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ version: 'nightparcel.invoice.draft.v1', state: 'DRAFT_UNCOMMITTED' })),
  });
  await expect(page.getByText('NightParcel could not validate this payment request.')).toBeVisible();
  await page.getByText('Technical details').click();
  await expect(page.getByText(/This is an uncommitted draft/)).toBeVisible();
  await expect(page.getByRole('button', { name: /Authorize in Lace/ })).toBeDisabled();
});

test('live browser activity stays separate from recorded evidence', async ({ page }) => {
  await page.goto('/app/activity');
  await expect(page.getByText('No live browser payment yet')).toBeVisible();
  await expect(page.getByText('Recorded project evidence—not your activity.')).toBeVisible();
  await expect(page.getByText('PAID_VERIFIED')).toBeVisible();
});

test('keyboard users encounter the skip link first', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Skip to main content' });
  await expect(skip).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#main-content$/);
});

for (const viewport of [
  { width: 1440, height: 1000 },
  { width: 1024, height: 900 },
  { width: 768, height: 900 },
  { width: 390, height: 844 },
]) {
  test(`landing and workspace do not overflow at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    for (const path of ['/', '/app', '/app/request', '/app/pay', '/app/activity', '/app/settings']) {
      await page.goto(path);
      if (path === '/') {
        await expect(page.getByRole('heading', { name: /Get paid privately/ })).toBeVisible();
      } else {
        await expect(page.locator('.workspace-shell')).toBeVisible();
      }
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, `${path} overflow`).toBeLessThanOrEqual(0);
    }
  });
}

test('captures genuine disconnected product screenshots', async ({ page }) => {
  for (const width of [1440, 1024, 768, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Get paid privately/ })).toBeVisible();
    await page.screenshot({ path: `../../evidence/phase1d-landing-${width}.png`, fullPage: true });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/app');
  await expect(page.locator('.workspace-shell')).toBeVisible();
  await page.screenshot({ path: '../../evidence/phase1d-workspace-1440.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/app/request');
  await expect(page.getByRole('heading', { name: 'Prepare private payment terms.' })).toBeVisible();
  await page.screenshot({ path: '../../evidence/phase1d-request-390.png', fullPage: true });
});
