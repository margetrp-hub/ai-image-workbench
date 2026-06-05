import { chromium } from 'playwright';
import { createServer } from 'vite';

const screenshotDir = 'D:/wiki/image-sub2api-studio/output/playwright';
const screenshotPath = `${screenshotDir}/template-windowing.png`;
const INITIAL_VISIBLE = 12;
const TOTAL_ITEMS = 20;

function svgDataUrl(label, color) {
  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320"><rect width="320" height="320" fill="${color}"/><text x="160" y="176" fill="white" font-family="Arial" font-size="40" text-anchor="middle">${label}</text></svg>`)}`;
}

function templateCases() {
  return Array.from({ length: TOTAL_ITEMS }, (_, index) => ({
    id: `template-window-${index + 1}`,
    title: `Template window idea ${index + 1}`,
    category: 'Windowing Test',
    styles: ['Clean UI'],
    scenes: ['Workbench'],
    promptPreview: `Create a focused template scene ${index + 1}`,
    image: svgDataUrl(`#${index + 1}`, index % 2 ? '#f59e0b' : '#0f766e'),
    thumbnail: svgDataUrl(`#${index + 1}`, index % 2 ? '#f59e0b' : '#0f766e'),
    sourceName: 'smoke'
  }));
}

function assert(condition, message, evidence) {
  if (!condition) {
    throw new Error(`${message}${evidence ? `\n${JSON.stringify(evidence, null, 2)}` : ''}`);
  }
}

const server = await createServer({
  logLevel: 'silent',
  server: {
    host: '127.0.0.1',
    port: 0,
    strictPort: false
  }
});

let browser;

try {
  await server.listen();
  const baseUrl = server.resolvedUrls?.local?.[0];
  assert(baseUrl, 'Vite smoke server did not expose a local URL.');

  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 980 } });

  await page.addInitScript((items) => {
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input, init) => {
      const url = typeof input === 'string' ? input : input?.url || '';
      if (url.endsWith('/cases.json') || url.endsWith('cases.json')) {
        return new Response(JSON.stringify({
          categories: ['Windowing Test'],
          styles: ['Clean UI'],
          scenes: ['Workbench'],
          cases: items,
          videoInspirations: []
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      if (url.endsWith('/inspirations.json') || url.endsWith('inspirations.json')) {
        return new Response(JSON.stringify({
          sources: [],
          sourceCounts: [],
          categories: [],
          cases: [],
          errors: []
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      return originalFetch(input, init);
    };
  }, templateCases());

  await page.goto(new URL('studio.html', baseUrl).toString(), { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    document.querySelector('[data-workspace="inspiration"]')?.click();
  });
  await page.waitForTimeout(500);
  await page.locator('.categoryTile').first().click();
  await page.waitForTimeout(500);

  const initial = await page.evaluate(() => ({
    cards: document.querySelectorAll('.caseTile').length,
    categories: document.querySelectorAll('.categoryTile').length,
    hasLoadMore: Boolean(document.querySelector('.inspirationCanvasGrid .galleryLoadMore')),
    body: document.body.innerText.slice(0, 1000)
  }));
  assert(initial.cards === INITIAL_VISIBLE, `Expected ${INITIAL_VISIBLE} initial template cards, got ${initial.cards}.`, initial);
  assert(initial.hasLoadMore, 'Expected template load-more button to be visible.', initial);

  await page.locator('.inspirationCanvasGrid .galleryLoadMore').click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: screenshotPath, fullPage: true });

  const expanded = await page.evaluate((totalItems) => ({
    cards: document.querySelectorAll('.caseTile').length,
    hasLastItem: document.body.innerText.includes(`Template window idea ${totalItems}`)
  }), TOTAL_ITEMS);
  assert(expanded.cards === TOTAL_ITEMS, `Expected ${TOTAL_ITEMS} template cards after local expansion, got ${expanded.cards}.`, expanded);
  assert(expanded.hasLastItem, 'Expected the final template item to render after expansion.', expanded);

  console.log(JSON.stringify({
    ok: true,
    screenshotPath,
    initial,
    expanded
  }, null, 2));
} finally {
  if (browser) await browser.close();
  await server.close();
}
