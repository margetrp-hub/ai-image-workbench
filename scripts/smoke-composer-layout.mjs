import { chromium } from 'playwright';
import { createServer } from 'vite';
import fs from 'node:fs/promises';
import path from 'node:path';

const screenshotDir = 'D:/wiki/image-sub2api-studio/output/playwright';
const fixtureDir = `${screenshotDir}/fixtures`;
const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAQAAAAAYLlVAAAAWElEQVR42u3OQQ0AAAgDMMTrf2YKBhhoKrQydc1wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABgOwQ0AAEEp43RAAAAAElFTkSuQmCC';
const layoutKey = 'image-sub2api-studio:workbench-layout:v5';
const sessionKey = 'image-sub2api-studio:current-session:v1';

function assert(condition, message, evidence) {
  if (!condition) {
    throw new Error(`${message}${evidence ? `\n${JSON.stringify(evidence, null, 2)}` : ''}`);
  }
}

async function writeFixtures() {
  await fs.mkdir(fixtureDir, { recursive: true });
  const files = [
    path.join(fixtureDir, 'composer-reference-a.png'),
    path.join(fixtureDir, 'composer-reference-b.png')
  ];
  await Promise.all(files.map((file) => fs.writeFile(file, Buffer.from(pngBase64, 'base64'))));
  return files;
}

function seedSession() {
  return {
    sessionId: 'composer-layout-session',
    mode: 'image',
    status: 'idle',
    prompt: 'Continue the product image with cleaner reflections and a warmer background.',
    model: 'gpt-image-2',
    assistantMessages: [
      {
        id: 'composer-layout-user',
        role: 'user',
        content: 'I want to continue this image without returning to the old composition.',
        pending: false,
        failed: false
      },
      {
        id: 'composer-layout-assistant',
        role: 'assistant',
        content: 'Keep the main object, then refine local lighting, background depth, and product edges.',
        finalPrompt: 'Subject: refined product hero image\n\nChange: keep the object, simplify background, add warm reflection control.',
        pending: false,
        failed: false
      }
    ],
    promptSuggestion: {
      subject: 'Keep the original product shape and material surface.',
      scene: 'Move the scene toward a clean studio desk with warmer background depth.',
      composition: 'Keep the object centered, leave room for subtle reflection below.',
      style: 'Premium product photography, soft contrast, restrained highlights.',
      lighting: 'Warm side light, controlled rim highlight, no harsh glare.',
      details: 'Refine edges, remove noisy artifacts, keep the label readable.',
      finalPrompt: [
        'Subject: Keep the original product shape, material texture, and core silhouette.',
        'Scene: Place it in a clean studio desk environment with warmer background depth.',
        'Composition: Centered product hero image with subtle reflection below and enough breathing room.',
        'Style: Premium product photography, soft contrast, controlled highlights, no extra props.'
      ].join('\n')
    },
    generationQueue: [
      {
        id: 'composer-layout-queue',
        status: 'unknown',
        prompt: 'A recovered generation should remain visible without squeezing the composer.',
        summary: 'A recovered generation should remain visible without squeezing the composer.',
        model: 'gpt-image-2',
        size: '1024x1024',
        quality: 'high',
        count: 1,
        remote: true,
        restorable: false
      }
    ],
    canvasNodes: [
      {
        id: 'node-1',
        canvasIndex: 1,
        x: 220,
        y: 160,
        width: 220,
        height: 220,
        prompt: 'Subject: original product image',
        url: ''
      }
    ]
  };
}

async function installRoutes(page) {
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
}

async function runScenario(browser, baseUrl, files, viewport, name) {
  const page = await browser.newPage({ viewport });
  const referencesOpen = name !== 'mobile';
  await installRoutes(page);
  await page.addInitScript(({ layoutKey, sessionKey, session, referencesOpen }) => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    localStorage.setItem(layoutKey, JSON.stringify({
      prompt: false,
      references: referencesOpen,
      parameters: true,
      parametersRail: false,
      bottomComposer: true,
      composerParameters: true
    }));
    localStorage.setItem(sessionKey, JSON.stringify(session));
  }, { layoutKey, sessionKey, session: seedSession(), referencesOpen });

  await page.goto(new URL('studio.html', baseUrl).toString(), { waitUntil: 'networkidle' });
  await page.waitForSelector('.creationDesk.composerOpen', { timeout: 15000 });
  if (referencesOpen) {
    await page.locator('.referenceSidePanel input[type="file"]').first().setInputFiles(files);
    await page.waitForSelector('.referenceSideBody.hasReferenceItems .sideReferenceThumbs figure', { timeout: 8000 });
  }
  await page.waitForTimeout(500);
  const screenshotPath = `${screenshotDir}/composer-layout-${name}.png`;
  await page.screenshot({ path: screenshotPath, fullPage: true });

  const result = await page.evaluate(() => {
    function rect(selector) {
      const node = document.querySelector(selector);
      if (!node) return null;
      const style = getComputedStyle(node);
      const box = node.getBoundingClientRect();
      if (style.display === 'none' || style.visibility === 'hidden' || box.width <= 0 || box.height <= 0) return null;
      return {
        selector,
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height,
        right: box.right,
        bottom: box.bottom
      };
    }
    function overlap(a, b) {
      if (!a || !b) return 0;
      const x = Math.max(0, Math.min(a.right, b.right) - Math.max(a.x, b.x));
      const y = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y));
      return x * y;
    }
    const keys = {
      composer: '.bottomComposerBar',
      head: '.composerPanelHead',
      thread: '.composerThread',
      referencePanel: '.referenceSidePanel',
      composerReferenceStrip: '.bottomComposerBar .composerReferenceStrip',
      userMessage: '.composerMessage.user',
      userMessageText: '.composerMessage.user p',
      prompt: '.composerPromptRow',
      params: '.composerParamShelf',
      input: '.bottomComposerInput textarea',
      actions: '.composerActionGroup',
      assistant: '.composerAssistantAction',
      generate: '.composerGenerateAction',
      suggestion: '.promptSuggestion.composerMessage',
      suggestionBody: '.promptSuggestionBody',
      suggestionLead: '.promptSuggestionLead',
      suggestionText: '.promptSuggestionText, .promptSuggestionPlain',
      suggestionActions: '.promptSuggestionActions'
    };
    const rects = Object.fromEntries(Object.entries(keys).map(([key, selector]) => [key, rect(selector)]));
    const visibleHeaderPills = Array.from(document.querySelectorAll('.composerHeaderPill')).filter((node) => {
      const style = getComputedStyle(node);
      const box = node.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && box.width > 0 && box.height > 0;
    }).length;
    const paramChildren = Array.from(document.querySelectorAll('.composerParamShelf.isExpanded > *')).map((node) => {
      const style = getComputedStyle(node);
      const box = node.getBoundingClientRect();
      if (style.display === 'none' || style.visibility === 'hidden' || box.width <= 0 || box.height <= 0) return null;
      return { top: box.top, height: box.height, width: box.width, text: node.textContent.trim().slice(0, 40) };
    }).filter(Boolean);
    const paramTopSpread = paramChildren.length
      ? Math.max(...paramChildren.map((item) => item.top)) - Math.min(...paramChildren.map((item) => item.top))
      : 0;
    const suggestionBodyStyle = document.querySelector('.promptSuggestionBody')
      ? getComputedStyle(document.querySelector('.promptSuggestionBody'))
      : null;
    const suggestionBodyBorderWidth = suggestionBodyStyle
      ? ['borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth']
        .reduce((total, key) => total + Number.parseFloat(suggestionBodyStyle[key] || '0'), 0)
      : null;
    const suggestionTextSamples = Array.from(document.querySelectorAll('.promptSuggestionText span, .promptSuggestionPlain')).map((node) => {
      const style = getComputedStyle(node);
      const box = node.getBoundingClientRect();
      if (style.display === 'none' || style.visibility === 'hidden' || box.width <= 0 || box.height <= 0) return null;
      return {
        width: box.width,
        height: box.height,
        text: node.textContent.trim().slice(0, 80),
        whiteSpace: style.whiteSpace,
        overflow: style.overflow,
        textOverflow: style.textOverflow
      };
    }).filter(Boolean);
    const suggestionActionOverlap = overlap(rects.suggestionText, rects.suggestionActions);
    const sections = ['head', 'thread', 'prompt', 'params'];
    const sectionOverlaps = [];
    for (let i = 0; i < sections.length; i += 1) {
      for (let j = i + 1; j < sections.length; j += 1) {
        const area = overlap(rects[sections[i]], rects[sections[j]]);
        if (area > 4) sectionOverlaps.push({ a: sections[i], b: sections[j], area });
      }
    }
    const outsideComposer = sections
      .filter((key) => rects[key])
      .filter((key) => {
        const box = rects[key];
        const parent = rects.composer;
        return box.x < parent.x - 1 || box.right > parent.right + 1 || box.y < parent.y - 1 || box.bottom > parent.bottom + 1;
      });
    return {
      rects,
      sectionOverlaps,
      outsideComposer,
      visibleHeaderPills,
      paramChildren,
      paramTopSpread,
      suggestionBodyBorderWidth,
      suggestionTextSamples,
      suggestionActionOverlap,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      body: document.body.innerText.slice(0, 2200)
    };
  });

  assert(result.rects.composer, `${name}: composer was not visible.`, result);
  assert(result.rects.composer.bottom <= result.viewport.height + 1, `${name}: composer bottom escaped the viewport.`, result);
  assert(result.rects.thread, `${name}: composer thread was not visible.`, result);
  if (referencesOpen) {
    assert(result.rects.referencePanel, `${name}: right reference panel was not visible after upload.`, result);
  }
  assert(!result.rects.composerReferenceStrip, `${name}: references should live in the right panel, not as a duplicated composer strip.`, result);
  assert(result.rects.userMessage, `${name}: seeded user message was not visible in the composer thread.`, result);
  assert(result.rects.userMessage.width >= Math.min(210, result.rects.thread.width - 16), `${name}: user message collapsed into a narrow vertical bubble.`, result);
  assert(result.rects.userMessageText.width >= Math.min(180, result.rects.thread.width - 54), `${name}: user message text became too narrow to read horizontally.`, result);
  assert(result.rects.prompt, `${name}: prompt row was not visible.`, result);
  assert(result.rects.params, `${name}: parameter shelf was not visible.`, result);
  assert(result.rects.params.height <= 54, `${name}: expanded parameter shelf became too tall.`, result);
  assert(result.paramTopSpread <= 6, `${name}: parameter shelf wrapped into multiple rows.`, result);
  assert(result.visibleHeaderPills === 0, `${name}: inactive composer header pills are still visible.`, result);
  assert(result.rects.suggestion, `${name}: prompt suggestion was not visible.`, result);
  assert(result.rects.suggestion.width >= Math.min(260, result.rects.thread.width - 16), `${name}: prompt suggestion collapsed into an unreadable narrow card.`, result);
  assert(
    result.rects.suggestion.y >= result.rects.thread.y - 1 && result.rects.suggestion.bottom <= result.rects.thread.bottom + 1,
    `${name}: current prompt suggestion escaped the visible composer thread area.`,
    result
  );
  assert(result.rects.suggestionLead, `${name}: prompt suggestion lead text was not visible.`, result);
  assert(result.rects.suggestionText, `${name}: prompt suggestion text was not visible.`, result);
  assert(result.rects.suggestionActions, `${name}: prompt suggestion actions were not visible.`, result);
  assert(result.suggestionActionOverlap <= 4, `${name}: prompt suggestion actions overlap the text.`, result);
  const minSuggestionTextWidth = name === 'mobile'
    ? Math.min(112, result.rects.suggestionBody.width - 36)
    : Math.min(240, result.rects.suggestionBody.width - 40);
  assert(
    result.suggestionTextSamples.length > 0 && result.suggestionTextSamples.every((item) => item.width >= minSuggestionTextWidth),
    `${name}: prompt suggestion text is clipped into tiny fragments.`,
    result
  );
  assert(result.suggestionBodyBorderWidth === 0, `${name}: prompt suggestion body still renders as a nested bordered box.`, result);
  assert(result.sectionOverlaps.length === 0, `${name}: composer sections overlap.`, result);
  assert(result.outsideComposer.length === 0, `${name}: composer sections escaped the composer container.`, result);
  assert(!result.sectionOverlaps.some((item) => item.a === 'referencePanel' || item.b === 'referencePanel'), `${name}: reference panel overlapped composer internals.`, result);
  assert(result.rects.input.width >= 160 && result.rects.input.height >= 44, `${name}: prompt input became too small.`, result);
  assert(result.rects.generate.width >= 34 && result.rects.generate.height >= 34, `${name}: generate button became too small.`, result);
  if (result.rects.assistant) {
    assert(result.rects.assistant.width >= 32 && result.rects.assistant.height >= 32, `${name}: assistant button became too small.`, result);
  }

  await page.close();
  return { name, screenshotPath, result };
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
  const scenarios = [
    await runScenario(browser, baseUrl, files, { width: 1360, height: 900 }, 'desktop'),
    await runScenario(browser, baseUrl, files, { width: 390, height: 844 }, 'mobile')
  ];

  console.log(JSON.stringify({ ok: true, scenarios }, null, 2));
} finally {
  if (browser) await browser.close();
  await server.close();
}
