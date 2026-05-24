// src/studio/util/filename.js
//
// 下载文件名工具：把 Provider ID、生成时间、prompt 与 MIME 折叠成形如
// `image-sub2api-studio-{provider}-{YYYYMMDD-HHmm}-{slug}-{index}.{ext}` 的纯函数文件名，
// 用于 ResultGrid / Lightbox / HistoryCard 三处的下载锚 `download` 属性。
//
// 设计依据：
//   - requirements.md Requirement 9.1 ~ 9.8（下载文件名规范）
//   - design.md "Download Filename" 节（算法表 + 示例 + mimeToExt）
//   - tasks.md Task 1.4
//
// 关键性质（design.md Property P10：filename safety）：
//   - 输出仅包含 `[a-z0-9.-]`，不会出现路径分隔符 / 控制字符 / 引号；
//   - prompt slug ≤ 40 字符；
//   - 空 prompt 或非 ASCII 全空 → 占位符 `image`，永不输出空 slug；
//   - index 总是 ≥ 1（从 1 起），即便调用方传入 0 / 负数 / NaN 也归一到 1；
//   - 所有内部辅助 (`sanitizeProvider` / `formatLocalStamp` / `buildPromptSlug` /
//     `mimeToExt`) 都对 `null` / `undefined` / 非字符串输入安全。
//
// v1 不引入拼音 / 罗马化库：CJK 等无法靠 NFKD 折叠出 ASCII 字母数字的 prompt
// 会在 slug 阶段被规约为空串，由 buildPromptSlug 的空串回退给出 `image`。
// 这与 Requirement 9.5 / 9.6 一致——9.6 的 "罗马化优先" 行为留给后续可选扩展。

/**
 * `buildDownloadFilename` 的入参形状。
 *
 * @typedef {Object} BuildDownloadFilenameArgs
 * @property {string} providerId
 *   Provider Registry 中的 ID（如 `'sub2api'` / `'replicate'`）。会被
 *   `sanitizeProvider` 归一化为 `[a-z0-9-]`。
 * @property {string} createdAt
 *   ISO 8601 字符串或 `new Date()` 可接受的形式；按本地时区格式化为
 *   `YYYYMMDD-HHmm`。
 * @property {string} prompt
 *   原始 prompt；空字符串 / 仅 CJK / 仅符号都会回退为 `image`。
 * @property {string} mime
 *   结果资源 MIME，如 `'image/png'` / `'image/jpeg'` / `'image/webp'`，
 *   不识别时回退到 `png`。
 * @property {number} index
 *   0-based 序号，输出会被映射为 `Math.max(1, (index|0) + 1)`。
 */

/**
 * 把生成结果元数据折叠为下载文件名。
 *
 * 形态：`image-sub2api-studio-{provider}-{YYYYMMDD-HHmm}-{slug}-{index}.{ext}`。
 *
 * 示例：
 *   - `A corgi running on the beach.` / `sub2api` / `image/png` / index `0`
 *     → `image-sub2api-studio-sub2api-20260517-1330-a-corgi-running-on-the-beach-1.png`
 *   - `咖啡杯特写` / `pollinations` / `image/jpeg` / index `0`
 *     → `image-sub2api-studio-pollinations-20260517-1330-image-1.jpg`
 *   - `Café au lait, soft light` / `replicate` / `image/webp` / index `0`
 *     → `image-sub2api-studio-replicate-20260517-0905-cafe-au-lait-soft-light-1.webp`
 *
 * @param   {BuildDownloadFilenameArgs} args
 * @returns {string}
 */
export function buildDownloadFilename({ providerId, createdAt, prompt, mime, index }) {
  const provider = sanitizeProvider(providerId);
  const stamp = formatLocalStamp(new Date(createdAt));
  const slug = buildPromptSlug(prompt);
  const ext = mimeToExt(mime);
  const seq = String(Math.max(1, (Number.isFinite(index) ? (index | 0) : 0) + 1));
  return `image-sub2api-studio-${provider}-${stamp}-${slug}-${seq}.${ext}`;
}

/**
 * 把 Provider ID 归一化到 `[a-z0-9-]`。
 *
 *   - 转小写；
 *   - 将所有非 `[a-z0-9-]` 字符折叠为单连字符；
 *   - 修剪首尾连字符；
 *   - 空串回退为 `'provider'`，确保文件名永远落在合法区段内。
 *
 * @param {string} providerId
 * @returns {string}
 */
export function sanitizeProvider(providerId) {
  const normalized = String(providerId ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized || 'provider';
}

/**
 * 把 `Date` 按本地时区格式化为 `YYYYMMDD-HHmm`。
 *
 * 无效日期（`Number.isNaN(d.getTime())`）回退为 `'00000000-0000'`，避免抛错
 * 把整个文件名链路打断。
 *
 * @param {Date} d
 * @returns {string}
 */
export function formatLocalStamp(d) {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) {
    return '00000000-0000';
  }
  const pad = (n) => String(n).padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hour = pad(d.getHours());
  const minute = pad(d.getMinutes());
  return `${year}${month}${day}-${hour}${minute}`;
}

/**
 * 把 prompt 折叠为安全 slug（≤ 40 字符，仅 `[a-z0-9-]`）。
 *
 * 算法（与 design.md "Download Filename" 节一致）：
 *   1. NFKD 归一化（把 `é` 拆为 `e + 组合符`）；
 *   2. 去掉所有 combining marks（U+0300..U+036F）；
 *   3. 把常见智能引号 / 全角标点替换为空格，避免连续标点被吸进同一连字符；
 *   4. 转小写，把任何非 `[a-z0-9]` 序列折叠为单连字符；
 *   5. 修剪首尾连字符；
 *   6. 截到 40 字符；若截断后以连字符结尾，再修剪一次；
 *   7. 若结果为空（典型如纯 CJK / 纯符号 prompt），回退为 `'image'`。
 *
 * @param {string} prompt
 * @returns {string}
 */
export function buildPromptSlug(prompt) {
  let text = String(prompt ?? '').normalize('NFKD');
  // 去 combining marks（NFKD 拆出来的变音符号）。
  text = text.replace(/[\u0300-\u036f]/g, '');
  // 把常见智能引号 / 全角空格替换为半角空格，让后续的 [^a-z0-9]+ 折叠更干净。
  text = text.replace(/[\u2018\u2019\u201C\u201D'"\u00A0\u3000]/g, ' ');
  text = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (text.length > 40) {
    text = text.slice(0, 40).replace(/-+$/, '');
  }
  return text || 'image';
}

/**
 * 把 MIME 字符串映射到下载扩展名。
 *
 *   - `'image/png'`              → `'png'`
 *   - `'image/jpeg'` / `'image/jpg'` → `'jpg'`
 *   - `'image/webp'`             → `'webp'`
 *   - 其它（含 `null` / `undefined`） → `'png'`
 *
 * 仅识别小写形式即可：调用方传入的 MIME 多来自 `Blob.type` / Content-Type，
 * 通常已是小写；若上游返回大写也会经 `.toLowerCase()` 兜底。
 *
 * @param {string} mime
 * @returns {string}
 */
export function mimeToExt(mime) {
  const value = String(mime ?? '').toLowerCase();
  if (value === 'image/png') return 'png';
  if (value === 'image/jpeg' || value === 'image/jpg') return 'jpg';
  if (value === 'image/webp') return 'webp';
  return 'png';
}
