import { createHash, randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || process.env.STUDIO_HISTORY_PORT || 8787);
const HOST = process.env.HOST || process.env.STUDIO_HISTORY_HOST || '127.0.0.1';
const DATA_DIR = path.resolve(process.env.STUDIO_DATA_DIR || path.join(__dirname, '..', '.image-sub2api-studio-data'));
const LIBRARY_DIR = path.resolve(process.env.STUDIO_LIBRARY_DIR || path.join(__dirname, '..', 'data'));
const LIBRARY_ASSET_DIR = path.resolve(process.env.STUDIO_LIBRARY_ASSET_DIR || path.join(LIBRARY_DIR, 'images'));
const SUB2API_BASE_URL = String(process.env.SUB2API_BASE_URL || 'http://127.0.0.1:8080').replace(/\/+$/, '');
const HISTORY_LIMIT = Number(process.env.STUDIO_HISTORY_LIMIT || 200);
const MAX_BODY_BYTES = Number(process.env.STUDIO_MAX_BODY_BYTES || 96 * 1024 * 1024);
const MAX_IMAGE_BYTES = Number(process.env.STUDIO_MAX_IMAGE_BYTES || 32 * 1024 * 1024);
const ALLOWED_ORIGINS = String(process.env.STUDIO_ALLOWED_ORIGINS || 'http://127.0.0.1:5173,http://localhost:5173')
  .split(',')
  .map((item) => item.trim().replace(/\/+$/, ''))
  .filter(Boolean);
const LIBRARY_LICENSE = {
  name: '社区提示词模板 · CC BY 4.0',
  spdx: 'CC-BY-4.0',
  url: 'https://creativecommons.org/licenses/by/4.0/',
  notice: '提示词模板内容来自公开社区，遵循 CC BY 4.0 许可证；使用和改编时请保留原作者或来源归属。'
};
const PROMPT_PRESETS = [
  {
    id: 'image-product-poster',
    mode: 'image',
    title: '产品海报',
    prompt: '生成一张高级产品海报：主体清晰居中，保留产品真实结构和材质，使用精致棚拍光线，背景干净，有足够标题留白，整体适合商业投放。',
    tag: 'product'
  },
  {
    id: 'image-social-cover',
    mode: 'image',
    title: '社媒封面',
    prompt: '生成一张社媒封面图：画面有强焦点，版式现代，颜色鲜明但不过度，预留短标题空间，光影精致，适合内容平台、短视频或活动封面。',
    tag: 'social'
  },
  {
    id: 'image-portrait',
    mode: 'image',
    title: '头像写真',
    prompt: '生成一张精修头像写真：保留自然肤质和真实五官，眼神有表达力，背景干净，柔和侧光，气质自信，成片接近高端编辑写真。',
    tag: 'portrait'
  },
  {
    id: 'image-commerce-main',
    mode: 'image',
    title: '电商主图',
    prompt: '生成一张电商主图：保持产品身份不变，提升光线和质感，去除杂乱元素，主体居中清楚，画面适合商城首图展示。',
    tag: 'commerce'
  },
  {
    id: 'video-product-spot',
    mode: 'video',
    title: '产品短片',
    prompt: '生成一段 5 秒产品广告视频：产品保持真实结构和材质，镜头缓慢推进，精致棚拍光线，背景干净，有高级商业感，运动稳定，不要文字水印。'
  },
  {
    id: 'video-cinematic-shot',
    mode: 'video',
    title: '电影镜头',
    prompt: '生成一段电影感视频：主体清晰，浅景深，柔和逆光，镜头缓慢横移，环境有真实空间层次，动作自然，画面稳定。'
  },
  {
    id: 'video-architecture-tour',
    mode: 'video',
    title: '建筑漫游',
    prompt: '生成一段建筑空间漫游视频：镜头沿空间轴线缓慢前进，保持垂直线稳定，展示材质、光线和空间尺度，真实摄影风格。'
  },
  {
    id: 'video-social-motion',
    mode: 'video',
    title: '社媒动态',
    prompt: '生成一段适合短视频封面的动态视频：主体有轻微动作，镜头节奏清晰，色彩干净，第一秒抓人，画面不要出现字幕或水印。'
  }
];
const VIDEO_INSPIRATIONS = [
  {
    id: 'video-product-launch',
    kind: 'video-inspiration',
    title: '产品发布短片',
    intent: '商业广告',
    summary: '棚拍质感，镜头推近，突出材质和卖点。',
    prompt: '生成一段 5 秒产品发布短片：产品保持真实结构和材质，镜头从中景缓慢推近到细节特写，背景干净，灯光有高级棚拍质感，画面稳定，不出现字幕、水印或变形。',
    videoAspect: '16:9',
    videoDuration: 5,
    videoFps: 24,
    videoMotion: 'push_in',
    videoStyle: 'product_ad',
    videoQuality: 'high',
    negativePrompt: '文字、水印、畸变、产品结构变化、手指遮挡'
  },
  {
    id: 'video-social-hook',
    kind: 'video-inspiration',
    title: '社媒开场钩子',
    intent: '短视频封面',
    summary: '第一秒有动作，竖屏抓人，适合社媒投放。',
    prompt: '生成一段适合社媒开场的 5 秒竖屏视频：主体在第一秒有清晰动作，镜头轻微前推，色彩干净，节奏明确，画面有封面感，不出现字幕或平台水印。',
    videoAspect: '9:16',
    videoDuration: 5,
    videoFps: 24,
    videoMotion: 'push_in',
    videoStyle: 'realistic',
    videoQuality: 'standard',
    negativePrompt: '字幕、水印、过度闪烁、脸部变形、背景穿帮'
  },
  {
    id: 'video-architecture-walkthrough',
    kind: 'video-inspiration',
    title: '建筑空间漫游',
    intent: '空间展示',
    summary: '沿空间轴线前进，展示材质、光线和尺度。',
    prompt: '生成一段建筑空间漫游视频：镜头沿空间轴线缓慢前进，保持垂直线稳定，展示墙面材质、自然光线和空间尺度，真实摄影风格，运动顺滑。',
    videoAspect: '16:9',
    videoDuration: 10,
    videoFps: 24,
    videoMotion: 'push_in',
    videoStyle: 'realistic',
    videoQuality: 'high',
    negativePrompt: '透视扭曲、墙体变形、漂浮家具、文字水印'
  },
  {
    id: 'video-cinematic-portrait',
    kind: 'video-inspiration',
    title: '电影感人物镜头',
    intent: '人物氛围',
    summary: '浅景深、逆光、轻微横移，突出情绪。',
    prompt: '生成一段电影感人物视频：主体表情自然，浅景深，柔和逆光，镜头缓慢横移，背景有真实空间层次，动作克制，画面稳定，有胶片质感。',
    videoAspect: '16:9',
    videoDuration: 5,
    videoFps: 24,
    videoMotion: 'pan',
    videoStyle: 'cinematic',
    videoQuality: 'high',
    negativePrompt: '脸部变形、多余手指、眼神漂移、字幕、水印'
  },
  {
    id: 'video-ui-flow',
    kind: 'video-inspiration',
    title: '界面操作演示',
    intent: '产品功能',
    summary: '干净界面，模拟点击和状态切换。',
    prompt: '生成一段产品界面操作演示视频：界面清晰，镜头固定，按钮和面板状态自然切换，动效克制，像真实软件录屏的高级演示，不出现多余文字或水印。',
    videoAspect: '16:9',
    videoDuration: 5,
    videoFps: 30,
    videoMotion: 'static',
    videoStyle: 'product_ad',
    videoQuality: 'standard',
    negativePrompt: '乱码文字、错位界面、闪烁、鼠标变形、水印'
  },
  {
    id: 'video-food-closeup',
    kind: 'video-inspiration',
    title: '美食细节特写',
    intent: '餐饮内容',
    summary: '微距、热气、材质流动，适合菜单宣传。',
    prompt: '生成一段美食微距特写视频：镜头缓慢推近，能看到食物表面质感、热气和轻微流动，光线温暖自然，背景简洁，画面真实诱人。',
    videoAspect: '9:16',
    videoDuration: 5,
    videoFps: 24,
    videoMotion: 'push_in',
    videoStyle: 'realistic',
    videoQuality: 'high',
    negativePrompt: '过度油腻、食物变形、文字、水印、餐具穿模'
  },
  {
    id: 'video-fashion-turntable',
    kind: 'video-inspiration',
    title: '服饰环绕展示',
    intent: '电商种草',
    summary: '人物或单品环绕，展示轮廓和材质。',
    prompt: '生成一段服饰环绕展示视频：主体保持稳定，镜头轻微环绕，展示衣料质感、廓形和细节，光线干净，动作自然，适合电商和种草短片。',
    videoAspect: '9:16',
    videoDuration: 5,
    videoFps: 24,
    videoMotion: 'orbit',
    videoStyle: 'realistic',
    videoQuality: 'standard',
    negativePrompt: '肢体变形、衣服融化、图案漂移、文字水印'
  },
  {
    id: 'video-animation-mascot',
    kind: 'video-inspiration',
    title: '角色动画循环',
    intent: 'IP角色',
    summary: '轻动作循环，适合品牌角色和表情包。',
    prompt: '生成一段角色动画循环视频：角色保持一致，做一个轻微挥手或点头动作，动作可循环，背景简洁，表情友好，画面干净，不出现字幕或水印。',
    videoAspect: '1:1',
    videoDuration: 5,
    videoFps: 24,
    videoMotion: 'static',
    videoStyle: 'animation',
    videoQuality: 'standard',
    negativePrompt: '角色漂移、五官变化、肢体断裂、文字、水印'
  },
  {
    id: 'video-event-kv-motion',
    kind: 'video-inspiration',
    title: '活动主视觉动态化',
    intent: '营销物料',
    summary: '把主视觉做成轻动态，适合投屏和社媒。',
    prompt: '生成一段活动主视觉动态视频：保留主视觉主体，背景元素轻微漂移，光影有层次，镜头缓慢拉远，适合大屏和社媒投放，不出现额外文字或水印。',
    videoAspect: '16:9',
    videoDuration: 5,
    videoFps: 24,
    videoMotion: 'pull_out',
    videoStyle: 'cinematic',
    videoQuality: 'standard',
    negativePrompt: '文字错乱、主体变形、过度粒子、水印'
  },
  {
    id: 'video-scene-establishing',
    kind: 'video-inspiration',
    title: '场景建立镜头',
    intent: '故事开场',
    summary: '从环境到主体，建立氛围和叙事空间。',
    prompt: '生成一段故事开场的场景建立镜头：镜头从环境缓慢移动到主体，空间层次清楚，光线自然，有电影感，动作克制，适合作为短片第一镜。',
    videoAspect: '16:9',
    videoDuration: 10,
    videoFps: 24,
    videoMotion: 'pan',
    videoStyle: 'cinematic',
    videoQuality: 'high',
    negativePrompt: '镜头抖动、主体消失、空间变形、字幕、水印'
  }
];

function sendJson(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(JSON.stringify(payload));
}

function sendCors(req, res) {
  const origin = String(req.headers.origin || '').replace(/\/+$/, '');
  const allowOrigin = !origin || ALLOWED_ORIGINS.includes(origin) ? origin : '';
  if (allowOrigin) {
    res.setHeader('Access-Control-Allow-Origin', allowOrigin);
  }
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  return Boolean(!origin || allowOrigin);
}

function bearerToken(req) {
  const header = req.headers.authorization || '';
  const match = typeof header === 'string' ? header.match(/^Bearer\s+(.+)$/i) : null;
  return match ? match[1].trim() : '';
}

async function readJsonBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) {
      const error = new Error('BODY_TOO_LARGE');
      error.status = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function normalizeSub2ApiPayload(payload) {
  if (payload && typeof payload === 'object' && 'code' in payload) {
    if (payload.code === 0) return payload.data;
    throw new Error(payload.message || 'SUB2API_AUTH_FAILED');
  }
  return payload;
}

async function sub2apiRequest(pathname, token) {
  const response = await fetch(`${SUB2API_BASE_URL}${pathname}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload?.message || `SUB2API_HTTP_${response.status}`);
    error.status = response.status;
    throw error;
  }
  return normalizeSub2ApiPayload(payload);
}

async function authenticate(req) {
  const token = bearerToken(req);
  if (!token) {
    const error = new Error('AUTH_REQUIRED');
    error.status = 401;
    throw error;
  }

  let user;
  try {
    user = await sub2apiRequest('/api/v1/auth/me', token);
  } catch {
    user = await sub2apiRequest('/api/v1/user/profile', token);
  }

  const userId = user?.id || user?.user?.id || user?.email || user?.username;
  if (!userId) {
    const error = new Error('USER_ID_MISSING');
    error.status = 401;
    throw error;
  }

  const key = createHash('sha256').update(String(userId)).digest('hex');
  return {
    user,
    userKey: key,
    userDir: path.join(DATA_DIR, 'users', key)
  };
}

async function ensureUserDirs(auth) {
  await fs.mkdir(path.join(auth.userDir, 'assets'), { recursive: true });
}

function recordsPath(auth) {
  return path.join(auth.userDir, 'records.json');
}

async function readRecords(auth) {
  try {
    const raw = await fs.readFile(recordsPath(auth), 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

async function writeRecords(auth, records) {
  await ensureUserDirs(auth);
  await fs.writeFile(recordsPath(auth), JSON.stringify(records.slice(0, HISTORY_LIMIT), null, 2));
}

function text(value, length) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, length);
}

function cleanLibraryId(value) {
  const raw = String(value || '').trim();
  if (!/^[a-zA-Z0-9._:-]{1,120}$/.test(raw)) {
    const error = new Error('LIBRARY_ITEM_NOT_FOUND');
    error.status = 404;
    throw error;
  }
  return raw;
}

function cleanRecordId(value) {
  const raw = String(value || '');
  return /^[a-zA-Z0-9_-]{8,80}$/.test(raw) ? raw : randomUUID();
}

function assetExtension(mime) {
  if (mime === 'image/jpeg') return 'jpg';
  if (mime === 'image/webp') return 'webp';
  return 'png';
}

async function storeResultUrl(auth, recordId, value, index) {
  const raw = String(value || '');
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith('/studio-api/history/')) return raw;

  const match = raw.match(/^data:(image\/(?:png|jpeg|webp));base64,([a-zA-Z0-9+/=\s]+)$/);
  if (!match) return '';

  const buffer = Buffer.from(match[2].replace(/\s+/g, ''), 'base64');
  if (!buffer.length || buffer.length > MAX_IMAGE_BYTES) return '';

  const ext = assetExtension(match[1]);
  const assetDir = path.join(auth.userDir, 'assets', recordId);
  await fs.mkdir(assetDir, { recursive: true });
  const fileName = `${index}.${ext}`;
  await fs.writeFile(path.join(assetDir, fileName), buffer);
  return `/studio-api/history/${recordId}/assets/${fileName}`;
}

async function readJsonFile(filePath, fallback = {}) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return fallback;
    throw error;
  }
}

function protectedLibraryAssetUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^\/studio-api\/library-assets\//i.test(raw)) return raw;
  if (/^\/images\//i.test(raw)) return `/studio-api/library-assets/${raw.replace(/^\/images\//i, '')}`;
  if (/^https?:\/\//i.test(raw)) return raw;
  return '';
}

function sanitizeLibrarySummary(item) {
  const image = protectedLibraryAssetUrl(item.image || item.image_url);
  const thumbnail = protectedLibraryAssetUrl(item.thumbnail) || image;
  return {
    id: item.id,
    title: text(item.title, 180),
    image,
    thumbnail,
    imageAlt: text(item.imageAlt, 240),
    sourceLabel: text(item.sourceLabel, 120),
    sourceName: text(item.sourceName, 120),
    promptPreview: text(item.promptPreview, 160),
    category: text(item.category, 120),
    styles: Array.isArray(item.styles) ? item.styles.slice(0, 8).map((value) => text(value, 80)).filter(Boolean) : [],
    scenes: Array.isArray(item.scenes) ? item.scenes.slice(0, 8).map((value) => text(value, 80)).filter(Boolean) : [],
    featured: Boolean(item.featured),
    external: Boolean(item.external),
    sourceUrl: text(item.sourceUrl || item.githubUrl || item.sourceRepository, 600),
    sourceLicense: LIBRARY_LICENSE.spdx,
    attributionRequired: item.attributionRequired !== false,
    riskTags: Array.isArray(item.riskTags) ? item.riskTags.slice(0, 8).map((value) => text(value, 80)).filter(Boolean) : []
  };
}

function sanitizeLibraryDetail(item) {
  return {
    ...sanitizeLibrarySummary(item),
    prompt: text(item.prompt, 12000)
  };
}

function sanitizePromptPresetSummary(item) {
  return {
    id: item.id,
    mode: item.mode,
    title: text(item.title, 120),
    tag: text(item.tag, 80)
  };
}

function sanitizePromptPresetDetail(item) {
  return {
    ...sanitizePromptPresetSummary(item),
    prompt: text(item.prompt, 4000)
  };
}

function sanitizeVideoInspirationSummary(item) {
  return {
    id: item.id,
    kind: 'video-inspiration',
    title: text(item.title, 160),
    intent: text(item.intent, 120),
    summary: text(item.summary, 180),
    videoAspect: text(item.videoAspect, 20),
    videoDuration: Number(item.videoDuration) || 5,
    videoFps: Number(item.videoFps) || 24,
    videoMotion: text(item.videoMotion, 80),
    videoStyle: text(item.videoStyle, 80),
    videoQuality: text(item.videoQuality, 40)
  };
}

function sanitizeVideoInspirationDetail(item) {
  return {
    ...sanitizeVideoInspirationSummary(item),
    prompt: text(item.prompt, 4000),
    negativePrompt: text(item.negativePrompt, 1000)
  };
}

async function readLibrary() {
  const localData = await readJsonFile(path.join(LIBRARY_DIR, 'cases.json'), { cases: [] });
  const inspirationData = await readJsonFile(path.join(LIBRARY_DIR, 'inspirations.json'), { cases: [] });
  const localCases = Array.isArray(localData?.cases) ? localData.cases : [];
  const inspirationCases = Array.isArray(inspirationData?.cases) ? inspirationData.cases : [];
  const rawCases = [...localCases, ...inspirationCases].filter((item) => item && item.id !== undefined && item.id !== null);
  const cases = rawCases.map(sanitizeLibrarySummary);
  return {
    rawCases,
    payload: {
      ok: true,
      license: LIBRARY_LICENSE,
      totalCases: cases.length,
      categories: [...new Set([
        ...(Array.isArray(localData?.categories) ? localData.categories : []),
        ...(Array.isArray(inspirationData?.categories) ? inspirationData.categories : []),
        ...cases.map((item) => item.category).filter(Boolean)
      ])].sort(),
      styles: [...new Set(cases.flatMap((item) => item.styles || []))].sort(),
      scenes: [...new Set(cases.flatMap((item) => item.scenes || []))].sort(),
      promptPresets: PROMPT_PRESETS.map(sanitizePromptPresetSummary),
      videoInspirations: VIDEO_INSPIRATIONS.map(sanitizeVideoInspirationSummary),
      cases
    }
  };
}

function sanitizeCase(value) {
  if (!value || typeof value !== 'object') return null;
  return {
    id: value.id || null,
    title: text(value.title, 160),
    image: text(value.image, 600),
    imageAlt: text(value.imageAlt, 240),
    promptPreview: text(value.promptPreview, 800),
    category: text(value.category, 120)
  };
}

async function sanitizeRecord(auth, body) {
  const recordId = cleanRecordId(body.id);
  const inputUrls = Array.isArray(body.resultUrls) ? body.resultUrls.slice(0, 4) : [];
  const resultUrls = [];
  for (let index = 0; index < inputUrls.length; index += 1) {
    const stored = await storeResultUrl(auth, recordId, inputUrls[index], index);
    if (stored) resultUrls.push(stored);
  }

  return {
    id: recordId,
    createdAt: body.createdAt && !Number.isNaN(Date.parse(body.createdAt)) ? body.createdAt : new Date().toISOString(),
    mode: text(body.mode || 'image', 40),
    prompt: text(body.prompt, 6000),
    model: text(body.model, 120),
    size: text(body.size, 40),
    quality: text(body.quality, 40),
    count: Math.max(1, Math.min(4, Number(body.count || 1))),
    resultUrls,
    case: sanitizeCase(body.case)
  };
}

async function removeRecordAssets(auth, recordId) {
  await fs.rm(path.join(auth.userDir, 'assets', recordId), { recursive: true, force: true });
}

function parseRoute(req) {
  const url = new URL(req.url, 'http://localhost');
  const parts = url.pathname.split('/').filter(Boolean);
  return { url, parts };
}

async function serveAsset(req, res, auth, parts) {
  const recordId = cleanRecordId(parts[2]);
  const fileName = parts[4] || '';
  if (!/^[0-3]\.(png|jpg|webp)$/.test(fileName)) {
    return sendJson(res, 404, { ok: false, error: 'ASSET_NOT_FOUND' });
  }

  const filePath = path.join(auth.userDir, 'assets', recordId, fileName);
  const relative = path.relative(path.join(auth.userDir, 'assets'), filePath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    return sendJson(res, 404, { ok: false, error: 'ASSET_NOT_FOUND' });
  }

  const stat = await fs.stat(filePath).catch(() => null);
  if (!stat?.isFile()) return sendJson(res, 404, { ok: false, error: 'ASSET_NOT_FOUND' });

  const ext = path.extname(fileName).slice(1);
  const mime = ext === 'jpg' ? 'image/jpeg' : ext === 'webp' ? 'image/webp' : 'image/png';
  res.writeHead(200, {
    'Content-Type': mime,
    'Content-Length': stat.size,
    'Cache-Control': 'private, max-age=3600'
  });
  createReadStream(filePath).pipe(res);
}

async function serveLibraryAsset(req, res, auth, parts) {
  const rawAssetPath = decodeURIComponent(parts.slice(2).join('/'));
  const segments = rawAssetPath.split('/').filter(Boolean);
  if (!segments.length || segments.some((segment) => segment === '..' || segment.includes('\0'))) {
    return sendJson(res, 404, { ok: false, error: 'ASSET_NOT_FOUND' });
  }

  const filePath = path.join(LIBRARY_ASSET_DIR, ...segments);
  const relative = path.relative(LIBRARY_ASSET_DIR, filePath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    return sendJson(res, 404, { ok: false, error: 'ASSET_NOT_FOUND' });
  }

  const stat = await fs.stat(filePath).catch(() => null);
  if (!stat?.isFile()) return sendJson(res, 404, { ok: false, error: 'ASSET_NOT_FOUND' });

  const ext = path.extname(filePath).slice(1).toLowerCase();
  const mime = ext === 'jpg' || ext === 'jpeg'
    ? 'image/jpeg'
    : ext === 'webp'
      ? 'image/webp'
      : ext === 'svg'
        ? 'image/svg+xml'
        : 'image/png';
  res.writeHead(200, {
    'Content-Type': mime,
    'Content-Length': stat.size,
    'Cache-Control': 'private, max-age=300',
    'X-Robots-Tag': 'noindex, nofollow, noarchive'
  });
  createReadStream(filePath).pipe(res);
}

async function handler(req, res) {
  const corsAllowed = sendCors(req, res);
  if (req.method === 'OPTIONS') {
    res.writeHead(corsAllowed ? 204 : 403);
    res.end();
    return;
  }
  if (!corsAllowed) {
    return sendJson(res, 403, { ok: false, error: 'ORIGIN_NOT_ALLOWED' });
  }

  const { parts } = parseRoute(req);
  if (parts.join('/') === 'studio-api/health') {
    return sendJson(res, 200, { ok: true });
  }

  if (parts[0] !== 'studio-api' || !['history', 'library', 'library-assets', 'prompt-presets', 'video-inspirations'].includes(parts[1])) {
    return sendJson(res, 404, { ok: false, error: 'NOT_FOUND' });
  }

  try {
    const auth = await authenticate(req);

    if (req.method === 'GET' && parts[0] === 'studio-api' && parts[1] === 'library' && parts.length === 2) {
      const { payload } = await readLibrary();
      return sendJson(res, 200, payload);
    }

    if (req.method === 'GET' && parts[0] === 'studio-api' && parts[1] === 'library' && parts.length === 3) {
      const id = cleanLibraryId(decodeURIComponent(parts[2]));
      const { rawCases } = await readLibrary();
      const item = rawCases.find((caseItem) => String(caseItem.id) === id);
      if (!item) return sendJson(res, 404, { ok: false, error: 'LIBRARY_ITEM_NOT_FOUND' });
      return sendJson(res, 200, { ok: true, case: sanitizeLibraryDetail(item) });
    }

    if (req.method === 'GET' && parts[0] === 'studio-api' && parts[1] === 'prompt-presets' && parts.length === 3) {
      const id = cleanLibraryId(decodeURIComponent(parts[2]));
      const item = PROMPT_PRESETS.find((preset) => preset.id === id);
      if (!item) return sendJson(res, 404, { ok: false, error: 'PROMPT_PRESET_NOT_FOUND' });
      return sendJson(res, 200, { ok: true, preset: sanitizePromptPresetDetail(item) });
    }

    if (req.method === 'GET' && parts[0] === 'studio-api' && parts[1] === 'video-inspirations' && parts.length === 3) {
      const id = cleanLibraryId(decodeURIComponent(parts[2]));
      const item = VIDEO_INSPIRATIONS.find((inspiration) => inspiration.id === id);
      if (!item) return sendJson(res, 404, { ok: false, error: 'VIDEO_INSPIRATION_NOT_FOUND' });
      return sendJson(res, 200, { ok: true, inspiration: sanitizeVideoInspirationDetail(item) });
    }

    if (req.method === 'GET' && parts[0] === 'studio-api' && parts[1] === 'library-assets') {
      return serveLibraryAsset(req, res, auth, parts);
    }

    if (req.method === 'GET' && parts.length === 2) {
      const records = await readRecords(auth);
      return sendJson(res, 200, { ok: true, records });
    }

    if (req.method === 'POST' && parts.length === 2) {
      const body = await readJsonBody(req);
      const record = await sanitizeRecord(auth, body);
      const records = await readRecords(auth);
      const nextRecords = [record, ...records.filter((item) => item.id !== record.id)].slice(0, HISTORY_LIMIT);
      await writeRecords(auth, nextRecords);
      return sendJson(res, 200, { ok: true, record });
    }

    if (req.method === 'DELETE' && parts.length === 2) {
      const records = await readRecords(auth);
      await Promise.all(records.map((record) => removeRecordAssets(auth, record.id)));
      await writeRecords(auth, []);
      return sendJson(res, 200, { ok: true });
    }

    if (req.method === 'DELETE' && parts.length === 3) {
      const recordId = cleanRecordId(parts[2]);
      const records = await readRecords(auth);
      await removeRecordAssets(auth, recordId);
      await writeRecords(auth, records.filter((item) => item.id !== recordId));
      return sendJson(res, 200, { ok: true });
    }

    if (req.method === 'GET' && parts.length === 5 && parts[3] === 'assets') {
      return serveAsset(req, res, auth, parts);
    }

    res.setHeader('Allow', 'GET, POST, DELETE, OPTIONS');
    return sendJson(res, 405, { ok: false, error: 'METHOD_NOT_ALLOWED' });
  } catch (error) {
    const status = error.status || 500;
    const message = status >= 500 ? 'STUDIO_HISTORY_FAILED' : error.message;
    if (status >= 500) {
      console.warn('Studio history service failed', {
        message: String(error?.message || 'unknown').slice(0, 240)
      });
    }
    return sendJson(res, status, { ok: false, error: message });
  }
}

const server = http.createServer((req, res) => {
  handler(req, res).catch((error) => {
    console.warn('Unhandled studio history error', {
      message: String(error?.message || 'unknown').slice(0, 240)
    });
    sendJson(res, 500, { ok: false, error: 'STUDIO_HISTORY_FAILED' });
  });
});

server.listen(PORT, HOST, () => {
  console.log(`image-sub2api-studio history service listening on http://${HOST}:${PORT}/studio-api`);
  console.log(`Data directory: ${DATA_DIR}`);
  console.log(`Sub2API base URL: ${SUB2API_BASE_URL}`);
});
