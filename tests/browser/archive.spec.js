import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const originalDigest = JSON.parse(readFileSync(new URL('../fixtures/2026-10-06.json', import.meta.url), 'utf8'));

async function archiveFixture(route) {
  const response = await route.fetch();
  const data = await response.json();
  // Stable fixtures also survive an explicitly regenerated historical digest.
  data.days = [structuredClone(originalDigest)];
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
  await expect(page.getByRole('heading', { name: 'No matching papers.' })).toBeVisible();
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
  await expect(page.getByRole('heading', { name: 'No saved papers.' })).toBeVisible();
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
  await expect(page.locator('#paper-total')).toHaveText('20 papers');
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

test('voice copying keeps full dated sections and TeX without rendered math duplication', async ({ page }) => {
  await page.addInitScript(() => { Object.defineProperty(navigator, 'clipboard', { value: { writeText: async (text) => { window.copiedText = text; } }, configurable: true }); });
  await page.route('**/data/archive.json', async (route) => {
    const { response, data } = await archiveFixture(route);
    data.days[0].papers[0].summary = 'Exact **claim**, with \\(x^2+1\\), $z=3/2$, and [a source](https://arxiv.org/abs/2610.03864).';
    await route.fulfill({ response, json: data });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Copy for voice', exact: true }).click();
  const full = await page.evaluate(() => window.copiedText);
  expect(full).toContain('BEGIN DIGEST: arXiv-2026-10-06');
  expect(full).toContain('arXiv-2026-10-06 — Item 10');
  expect(full).toContain('Exact claim, with \\(x^2+1\\), $z=3/2$, and a source.');
  expect(full).not.toContain('**');
  expect(full).not.toContain('DIGESTMATH');
  await page.getByRole('button', { name: 'Copy item 1', exact: true }).click();
  const item = await page.evaluate(() => window.copiedText);
  expect(item).toContain('arXiv-2026-10-06 — Item 1');
  expect(item).not.toContain('Item 2');
  expect(item).toContain('Authors:');
  expect(item).toContain('Background and motivation');
  expect(item).toContain('Why it matters for you');
  expect((item.match(/x\^2\+1/g) || []).length).toBe(1);
  await expect(page.locator('.katex-error')).toHaveCount(0);
});

test('clipboard rejection provides selectable text instead of losing the copy', async ({ page }) => {
  await page.addInitScript(() => { Object.defineProperty(navigator, 'clipboard', { value: { writeText: async () => { throw new Error('Denied'); } }, configurable: true }); });
  await page.goto('/');
  await page.getByRole('button', { name: 'Copy item 4', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Copy text', exact: true })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Text to copy' })).toHaveValue(/arXiv-2026-10-06 — Item 4/);
});

test('a delayed audio index does not block reading or copying', async ({ page }) => {
  let pending;
  await page.route('**/data/audio/index.json', (route) => { pending = route; });
  await page.goto('/');
  await expect(page.locator('.paper-card')).toHaveCount(10);
  await expect(page.getByRole('button', { name: 'Copy for voice', exact: true })).toBeEnabled();
  await pending.fulfill({ json: { days: {} } });
});

test('real audio play, pause, seeking, speed and media-key handlers work on mobile', async ({ page }) => {
  await page.addInitScript(() => {
    window.mediaActions = {};
    Object.defineProperty(navigator, 'mediaSession', { configurable: true, value: {
      setActionHandler: (name, fn) => { window.mediaActions[name] = fn; },
      setPositionState: (state) => { window.mediaPosition = state; }, playbackState: 'none', metadata: null,
    } });
  });
  const base = 'https://github.com/zhou-yang-quantum/daily-arXiv/releases/download/audio-fixture/';
  await page.route('**/data/audio/index.json', (route) => route.fulfill({ json: { days: { '2026-10-06': {
    day: { url: base + 'day.mp3', duration: 120 }, items: [{ rank: 1, id: '2610.03864', title: 'Exact paper', url: base + 'item-01.mp3', duration: 120 }],
  } } } }));
  // Actual decodable PCM exercises HTMLMediaElement, not a mocked play method.
  const frames = 120 * 8000;
  const wav = Buffer.alloc(44 + frames * 2);
  wav.write('RIFF', 0); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8);
  wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(8000, 24); wav.writeUInt32LE(16000, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34);
  wav.write('data', 36); wav.writeUInt32LE(frames * 2, 40);
  await page.route(base + '*.mp3', (route) => {
    const range = route.request().headers().range?.match(/bytes=(\d+)-(\d*)/);
    const start = range ? Number(range[1]) : 0;
    const end = range?.[2] ? Math.min(Number(range[2]), wav.length - 1) : wav.length - 1;
    return route.fulfill({ body: wav.subarray(start, end + 1), contentType: 'audio/wav', status: range ? 206 : 200,
      headers: { 'accept-ranges': 'bytes', ...(range ? { 'content-range': `bytes ${start}-${end}/${wav.length}` } : {}) } });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Play day', exact: true }).click();
  await expect.poll(() => page.locator('audio').evaluate((a) => a.paused)).toBe(false);
  await expect.poll(() => page.locator('audio').evaluate((a) => a.readyState >= 2 && Number.isFinite(a.duration))).toBe(true);
  await expect(page.locator('#audio-title')).toHaveText('arXiv-2026-10-06 — Full digest');
  await page.evaluate(() => { document.querySelector('audio').currentTime = 45; window.mediaActions.pause(); });
  await expect.poll(() => page.locator('audio').evaluate((a) => a.paused)).toBe(true);
  await expect.poll(() => page.locator('audio').evaluate((a) => a.seeking)).toBe(false);
  await expect.poll(() => page.locator('audio').evaluate((a) => a.currentTime)).toBe(45);
  await page.evaluate(() => window.mediaActions.seekbackward());
  expect(await page.locator('audio').evaluate((a) => a.currentTime)).toBeCloseTo(15, 0);
  await page.evaluate(() => window.mediaActions.nexttrack());
  expect(await page.locator('audio').evaluate((a) => a.currentTime)).toBeCloseTo(45, 0);
  await page.getByRole('combobox', { name: 'Playback speed' }).selectOption('1.5');
  expect(await page.locator('audio').evaluate((a) => a.playbackRate)).toBe(1.5);
  await page.evaluate(() => window.mediaActions.play());
  await expect.poll(() => page.locator('audio').evaluate((a) => a.paused)).toBe(false);
  await page.getByRole('button', { name: 'Play item 1', exact: true }).click();
  await expect(page.locator('#audio-title')).toHaveText('arXiv-2026-10-06 — Item 1');
  await expect.poll(() => page.locator('audio').evaluate((a) => a.paused)).toBe(false);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: '.cache/mobile-audio.png', fullPage: false });
  await page.getByRole('button', { name: 'Close audio player', exact: true }).click();
  await expect(page.locator('#audio-player')).toBeHidden();
  expect(await page.evaluate(() => navigator.mediaSession.playbackState)).toBe('none');
});
