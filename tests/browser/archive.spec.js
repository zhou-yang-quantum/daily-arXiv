import { test, expect } from '@playwright/test';

async function archiveFixture(route) {
  const response = await route.fetch();
  const data = await response.json();
  // Keep browser fixtures independent of newly published daily digests.
  data.days = data.days.filter((day) => day.date === '2026-10-06');
  return { response, data };
}

test.beforeEach(async ({ page }) => {
  await page.route('**/data/archive.json', async (route) => {
    const { response, data } = await archiveFixture(route);
    await route.fulfill({ response, json: data });
  });
});

test('dated digest, readable math, and complete paper sections', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'arXiv-2026-10-06', exact: true })).toBeVisible();
  await expect(page.locator('.paper-card')).toHaveCount(10);
  await expect(page.locator('.paper-background')).toHaveCount(10);
  await expect(page.locator('.paper-why')).toHaveCount(10);
  await expect(page.locator('.priority-tag')).toHaveCount(0);
  await expect(page.locator('.katex').first()).toBeVisible();
  expect(await page.locator('.katex-error').count()).toBe(0);
  expect(await page.locator('.paper-summary').first().textContent()).not.toContain('ARXIVMATHPLACEHOLDER');
  await page.screenshot({ path: '.cache/desktop.png', fullPage: false });
  expect(errors).toEqual([]);
});

test('search, topic filters, empty state, and reset', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.paper-card')).toHaveCount(10);
  await page.getByRole('searchbox').fill('Krylov');
  await expect(page.locator('.paper-card')).toHaveCount(1);
  await expect(page.locator('.paper-card h3')).toContainText('Krylov');
  await page.getByRole('searchbox').fill('nothing-matches-this-query');
  await expect(page.getByRole('heading', { name: 'No papers match just yet.' })).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(page.locator('.paper-card')).toHaveCount(10);
  await page.getByRole('button', { name: 'Quantum error correction', exact: true }).click();
  const count = await page.locator('.paper-card').count();
  expect(count).toBeGreaterThan(0); expect(count).toBeLessThan(10);
});

test('saved papers and read status survive a reload', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Save item 1', exact: true }).click();
  await page.locator('.read-button').first().click();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Unsave item 1', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.read-button').first()).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Saved 1' }).click();
  await expect(page.locator('.paper-card')).toHaveCount(1);
  await page.getByRole('button', { name: 'Unsave item 1', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Leave a bookmark for later.' })).toBeVisible();
});

test('mobile reading, deep links, preferences, and no horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#date=2026-10-06&paper=4');
  const card = page.locator('#paper-2026-10-06-4');
  await expect(card).toBeInViewport();
  await expect(page.getByRole('combobox', { name: 'Choose a digest date' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'View selection preferences' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog')).toContainText('Bilayer graphene');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.getByRole('button', { name: 'Latest', exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await page.screenshot({ path: '.cache/mobile.png', fullPage: false });
  await page.getByRole('button', { name: 'Compact view' }).click();
  expect(await page.locator('.paper-detail[open]').count()).toBe(0);
  await page.getByRole('button', { name: 'Reading view' }).click();
  await expect(page.locator('.paper-detail[open]')).toHaveCount(10);
  await page.setViewportSize({ width: 320, height: 700 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('additional dates navigate and search across the entire archive', async ({ page }) => {
  await page.route('**/data/archive.json', async (route) => {
    const { response, data } = await archiveFixture(route);
    const older = structuredClone(data.days[0]);
    older.date = '2026-10-02'; older.title = 'arXiv-2026-10-02';
    older.papers[0].title = 'An older unique research idea';
    data.days.push(older);
    await route.fulfill({ response, json: data });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Earlier selection' }).click();
  await expect(page.getByRole('heading', { name: 'arXiv-2026-10-02', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Later selection' }).click();
  await page.getByRole('searchbox').fill('older unique');
  await expect(page.locator('.paper-card')).toHaveCount(1);
  await expect(page.locator('.paper-label')).toContainText('arXiv-2026-10-02 — Item 1');
});

test('imported Markdown cannot run HTML or javascript links', async ({ page }) => {
  await page.route('**/data/archive.json', async (route) => {
    const { response, data } = await archiveFixture(route);
    data.days[0].papers[0].summary = '<img src=x onerror="window.badImport=true"><script>window.badImport=true</script>\n\n[Unsafe](javascript:alert(1))\n\nA safe summary.';
    await route.fulfill({ response, json: data });
  });
  await page.goto('/');
  await expect(page.locator('.paper-card')).toHaveCount(10);
  expect(await page.evaluate(() => Boolean(window.badImport))).toBe(false);
  await expect(page.locator('.paper-summary a').first()).not.toHaveAttribute('href', /javascript:/);
});

test('twenty-paper days support mobile reading order and direct links without verdicts', async ({ page }) => {
  await page.route('**/data/archive.json', async (route) => {
    const { response, data } = await archiveFixture(route);
    const day = data.days[0];
    const additional = structuredClone(day.papers).map((paper, index) => {
      paper.rank = index + 11;
      paper.id = `2610.${String(paper.rank).padStart(5, '0')}`;
      paper.title = `Additional paper ${paper.rank}`;
      paper.url = `https://arxiv.org/abs/${paper.id}`;
      delete paper.priority;
      return paper;
    });
    day.papers.push(...additional);
    day.reading_order = day.papers.map((paper) => paper.rank);
    await route.fulfill({ response, json: data });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#date=2026-10-06&paper=20');
  const card = page.locator('#paper-2026-10-06-20');
  await expect(card).toBeInViewport();
  await expect(page.locator('.paper-card')).toHaveCount(20);
  await expect(page.locator('.paper-detail[open]')).toHaveCount(20);
  await expect(page.locator('.priority-tag')).toHaveCount(0);
  await expect(page.locator('.hero-description')).toContainText('20 papers.');
  await expect(page.locator('.reading-order a')).toHaveCount(20);
  await page.getByRole('button', { name: 'Latest', exact: true }).click();
  await page.locator('.reading-order a').filter({ hasText: /^20$/ }).click();
  await expect(card).toBeInViewport();
  await page.getByRole('button', { name: 'Save item 20', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Unsave item 20', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Latest', exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await page.screenshot({ path: '.cache/mobile-20.png', fullPage: false });
  await page.setViewportSize({ width: 320, height: 700 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
