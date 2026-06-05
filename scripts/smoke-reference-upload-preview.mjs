import { chromium } from 'playwright';
import { createServer } from 'vite';
import fs from 'node:fs/promises';
import path from 'node:path';

const screenshotDir = 'D:/wiki/image-sub2api-studio/output/playwright';
const screenshotPath = `${screenshotDir}/reference-upload-preview.png`;
const lightboxScreenshotPath = `${screenshotDir}/reference-upload-lightbox.png`;
const collapsedScreenshotPath = `${screenshotDir}/reference-upload-collapsed.png`;
const fixtureDir = `${screenshotDir}/fixtures`;
const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAQAAAAAYLlVAAAAWElEQVR42u3OQQ0AAAgDMMTrf2YKBhhoKrQydc1wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABgOwQ0AAEEp43RAAAAAElFTkSuQmCC';

function assert(condition, message, evidence) {
  if (!condition) {
    throw new Error(`${message}${evidence ? `\n${JSON.stringify(evidence, null, 2)}` : ''}`);
  }
}

async function writeFixtures() {
  await fs.mkdir(fixtureDir, { recursive: true });
  const files = [
    path.join(fixtureDir, 'reference-product-angle.png'),
    path.join(fixtureDir, 'reference-style-board.png')
  ];
  await Promise.all(files.map((file) => fs.writeFile(file, Buffer.from(pngBase64, 'base64'))));
  return files;
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
  const files = await writeFixtures();
  await server.listen();
  const baseUrl = server.resolvedUrls?.local?.[0];
  assert(baseUrl, 'Vite smoke server did not expose a local URL.');

  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 980 } });

  await page.route('**/studio-api/library**', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ ok: true, categories: [], styles: [], scenes: [], cases: [] })
  }));
  await page.route('**/studio-api/history**', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ ok: true, records: [], total: 0, nextOffset: null })
  }));
  await page.route('**/studio-api/session', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ ok: true, session: null })
  }));

  await page.addInitScript(() => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('image-sub2api-studio:current-session:v1');
  });

  await page.goto(new URL('studio.html', baseUrl).toString(), { waitUntil: 'networkidle' });
  await page.waitForSelector('.creationDesk', { timeout: 8000 });
  await page.locator('.referenceSidePanel input[type="file"]').first().setInputFiles(files);
  await page.waitForSelector('.referenceSideBody.hasReferenceItems .sideReferenceThumbs figure', { timeout: 8000 });
  await page.screenshot({ path: screenshotPath, fullPage: true });

  const sideResult = await page.evaluate(() => ({
    cardCount: document.querySelectorAll('.sideReferenceThumbs figure').length,
    visibleFileMetaCount: [...document.querySelectorAll('.referenceFileMeta')]
      .filter((node) => {
        const style = getComputedStyle(node);
        const rect = node.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
      }).length,
    visibleRoleControlCount: [...document.querySelectorAll('.sideReferenceThumbs figcaption')]
      .filter((node) => {
        const style = getComputedStyle(node);
        const rect = node.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
      }).length,
    imageObjectFits: [...document.querySelectorAll('.sideReferenceThumbs img')].map((node) => getComputedStyle(node).objectFit),
    panelRect: (() => {
      const panel = document.querySelector('.referenceSidePanel');
      const rect = panel?.getBoundingClientRect();
      return rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height, right: rect.right, bottom: rect.bottom } : null;
    })(),
    viewport: { width: window.innerWidth, height: window.innerHeight },
    panelText: document.querySelector('.referenceSidePanel')?.innerText || '',
    uploadText: document.querySelector('.referenceSidePanel .sideUploadDrop')?.innerText || '',
    body: document.body.innerText.slice(0, 1600)
  }));
  assert(sideResult.cardCount === 2, `Expected two uploaded reference cards, got ${sideResult.cardCount}.`, sideResult);
  assert(sideResult.visibleFileMetaCount === 0, 'Reference sidebar should not show filenames or file sizes.', sideResult);
  assert(sideResult.visibleRoleControlCount === 0, 'Reference sidebar should not show role selectors; it is only the uploaded image list.', sideResult);
  assert(sideResult.imageObjectFits.every((value) => value === 'cover'), 'Reference thumbnails should be compact visual thumbnails; full inspection happens in the lightbox.', sideResult);
  assert(sideResult.panelRect?.right >= sideResult.viewport.width - 1, 'Reference panel should be attached to the right edge.', sideResult);
  assert(sideResult.panelRect?.height >= sideResult.viewport.height - 1, 'Reference panel should run full height.', sideResult);
  assert(!sideResult.panelText.includes('reference-product-angle.png') && !sideResult.panelText.includes('reference-style-board.png'), 'Reference sidebar should not expose filenames as primary content.', sideResult);
  assert(sideResult.uploadText.includes('继续添加 / 拖入更多'), 'Reference upload drop zone should describe the next action after files are selected.', sideResult);

  await page.locator('.sideReferenceThumbs .referencePreviewButton').first().click();
  await page.waitForSelector('.lightboxOverlay .lightboxImageStage img', { timeout: 8000 });
  await page.screenshot({ path: lightboxScreenshotPath, fullPage: true });
  const lightboxResult = await page.evaluate(() => {
    const image = document.querySelector('.lightboxOverlay .lightboxImageStage img');
    const panel = document.querySelector('.lightboxOverlay .lightboxPanel');
    const imageRect = image?.getBoundingClientRect();
    const panelRect = panel?.getBoundingClientRect();
    return {
      hasLightbox: Boolean(image),
      alt: image?.getAttribute('alt') || '',
      imageRect: imageRect ? { width: imageRect.width, height: imageRect.height } : null,
      panelRect: panelRect ? { width: panelRect.width, height: panelRect.height } : null,
      text: document.querySelector('.lightboxOverlay')?.innerText || ''
    };
  });
  assert(lightboxResult.hasLightbox, 'Clicking a reference thumbnail did not open the full-image preview.', lightboxResult);
  assert(lightboxResult.imageRect?.width > 120 && lightboxResult.imageRect?.height > 120, 'Reference full preview image was too small to inspect.', lightboxResult);
  assert(lightboxResult.text.includes('查看参考图'), 'Reference lightbox did not identify itself as a reference preview.', lightboxResult);

  await page.locator('.lightboxOverlay .iconButton').first().click();
  await page.waitForSelector('.lightboxOverlay', { state: 'detached', timeout: 8000 });
  await page.locator('.referenceSideHead button').first().click();
  await page.waitForSelector('.referenceSidePanel.isCollapsed', { timeout: 8000 });
  await page.screenshot({ path: collapsedScreenshotPath, fullPage: true });
  const collapsedResult = await page.evaluate(() => {
    const panel = document.querySelector('.referenceSidePanel.isCollapsed');
    const button = document.querySelector('.referenceSideCollapsed');
    const label = button?.querySelector('span');
    const panelRect = panel?.getBoundingClientRect();
    const buttonRect = button?.getBoundingClientRect();
    const labelRect = label?.getBoundingClientRect();
    const labelStyle = label ? getComputedStyle(label) : null;
    return {
      panelRect: panelRect ? { width: panelRect.width, height: panelRect.height, right: panelRect.right } : null,
      buttonRect: buttonRect ? { width: buttonRect.width, height: buttonRect.height } : null,
      labelDisplay: labelStyle?.display || '',
      labelRect: labelRect ? { width: labelRect.width, height: labelRect.height } : null,
      text: panel?.innerText || '',
      viewport: { width: window.innerWidth, height: window.innerHeight }
    };
  });
  assert(collapsedResult.panelRect?.width <= 62, 'Collapsed reference entry should stay as a compact icon button.', collapsedResult);
  assert(collapsedResult.buttonRect?.width <= 52 && collapsedResult.buttonRect?.height <= 52, 'Collapsed reference button should be compact.', collapsedResult);
  assert(collapsedResult.labelDisplay === 'none' || collapsedResult.labelRect?.width === 0, 'Collapsed reference entry should not show vertical title text.', collapsedResult);
  assert(collapsedResult.panelRect?.right >= collapsedResult.viewport.width - 1, 'Collapsed reference entry should stay attached to the right edge.', collapsedResult);

  console.log(JSON.stringify({
    ok: true,
    screenshotPath,
    lightboxScreenshotPath,
    collapsedScreenshotPath,
    sideResult,
    lightboxResult,
    collapsedResult
  }, null, 2));
} finally {
  if (browser) await browser.close();
  await server.close();
}
