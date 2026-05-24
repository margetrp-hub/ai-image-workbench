// src/studio/errors/translations.js
//
// Error Translation Table 与 translateError 工具：把任意 Provider 抛出的错误归一化为
// 中文友好提示，供创作台 UI 渲染（message + hint + 可展开技术详情）。
//
// 设计依据：
//   - requirements.md Requirement 4 (4.1 ~ 4.6)
//   - design.md "Error Translation Table" 一节
//   - tasks.md Task 1.5
//
// 使用方：
//   - CreationDesk 的 catch 路径：translateError(providerId, error)
//   - Hook 内部把上层 fetch reject / Provider 抛出的 { status, providerCode, message, payload }
//     归一化为 TranslatedError，再交给状态机决定走 error 还是 cancelled 路径。
//
// 设计要点：
//   - 匹配优先级：`${providerId}:${status}` → `${providerId}:${providerCode}`
//                → `default:${status}` → `default:unknown`
//   - 5xx 走 `default:5xx` 单一桶。
//   - AbortError（error.name === 'AbortError'）映射为 `default:abort`，调用方据此走
//     ProgressMachine 的 CANCEL 转移而不是 error。
//   - 网络 / CORS（fetch reject，无 status）走 `default:network`。
//   - raw 字段保留原始 payload（优先 error.payload，缺省回退到 error 本身），
//     方便 UI 的 "技术详情 / 复制原始报文" 面板使用。
//   - 函数永远返回 TranslatedError，不抛异常。

/**
 * @typedef {Object} TranslatedError
 * @property {string}            providerId
 * @property {number} [status]
 * @property {string} [providerCode]
 * @property {string}            message
 * @property {string} [hint]
 * @property {unknown}           raw
 */

/**
 * @typedef {Object} TranslationEntry
 * @property {string}            message
 * @property {string} [hint]
 */

/**
 * Error_Translation_Table 初始条目。
 *
 * key 形式：
 *   - `default:${status}` —— HTTP 状态码兜底；5xx 用 `default:5xx`；
 *   - `default:${pseudoCode}` —— 非 HTTP 错误（abort / network / unknown）；
 *   - `${providerId}:${status}` —— 单个 Provider 的状态码差异化覆写；
 *   - `${providerId}:${providerCode}` —— Provider 私有错误码覆写。
 *
 * @type {Readonly<Record<string, TranslationEntry>>}
 */
export const ERROR_TRANSLATIONS = Object.freeze({
  // --- default 兜底 -----------------------------------------------------------
  'default:401': Object.freeze({
    message: '鉴权失败：API Key 无效或已过期',
    hint: '请到 Settings 重新填写 Key',
  }),
  'default:402': Object.freeze({
    message: '余额 / 积分不足',
    hint: '请到账户中心充值或切换 Provider',
  }),
  'default:403': Object.freeze({
    message: '没有访问该模型的权限',
    hint: '检查账号订阅或 Provider 配置',
  }),
  'default:404': Object.freeze({
    message: '模型未知或网关地址错误',
    hint: '在 Settings 中确认模型名',
  }),
  'default:415': Object.freeze({
    message: '不支持的媒体类型',
    hint: '请上传 PNG / JPG / WebP',
  }),
  'default:422': Object.freeze({
    message: '参数校验失败',
    hint: '请检查尺寸 / 数量 / 质量是否在允许范围',
  }),
  'default:429': Object.freeze({
    message: '请求过于频繁，请稍后再试',
    hint: '通常 1 分钟后自动恢复',
  }),
  'default:5xx': Object.freeze({
    message: '上游服务暂时不可用',
    hint: '请稍后重试或更换 Provider',
  }),
  'default:network': Object.freeze({
    message: '网络异常或被 CORS 拦截',
    hint: '检查网络或浏览器扩展',
  }),
  'default:abort': Object.freeze({
    message: '已取消',
  }),

  // --- Provider 专属覆写 -----------------------------------------------------
  'replicate:422': Object.freeze({
    message: 'Replicate 拒绝了该提示词',
    hint: '通常是 NSFW / 受限内容',
  }),
  'replicate:nsfw': Object.freeze({
    message: '提示词触发 NSFW 安全策略',
    hint: '请去除敏感词后重试',
  }),
  'pollinations:429': Object.freeze({
    message: 'Pollinations 当前繁忙',
    hint: '免费节点限流，可稍后重试',
  }),
  'sub2api:402': Object.freeze({
    message: '创作台额度不足',
    hint: '请充值或等待免费额度恢复',
  }),
  'fal:401': Object.freeze({
    message: 'Fal Key 无效',
    hint: '请到 Settings 重新填写',
  }),
  'fal:rate-limited': Object.freeze({
    message: 'Fal 触发速率限制',
    hint: '几秒后自动恢复',
  }),
  'custom-openai:edits-unsupported': Object.freeze({
    message: '上游不支持图像编辑路径',
    hint: '请改用 /v1/images/generations 或换一个支持 edits 的网关',
  }),
});

/**
 * 判断错误是否属于 fetch 网络层失败（无 status 的 TypeError、CORS 阻断等）。
 *
 * @param {{ name?: string, message?: string }} error
 * @returns {boolean}
 */
function isNetworkError(error) {
  if (!error) return false;
  if (error.name === 'TypeError') return true;
  const text = typeof error.message === 'string' ? error.message.toLowerCase() : '';
  if (!text) return false;
  return (
    text.includes('fetch') ||
    text.includes('network') ||
    text.includes('networkerror')
  );
}

/**
 * 把任意错误归一化为 TranslatedError。
 *
 * 永远返回对象，不抛异常；调用方根据返回值的 message / hint 渲染中文提示，
 * 并可通过 raw 字段展示 "技术详情" 折叠面板。
 *
 * @param {string} providerId
 * @param {{
 *   status?: number,
 *   providerCode?: string,
 *   code?: string,
 *   message?: string,
 *   payload?: unknown,
 *   name?: string,
 * } | null | undefined} error
 * @returns {TranslatedError}
 */
export function translateError(providerId, error) {
  const safeProviderId =
    typeof providerId === 'string' && providerId ? providerId : 'unknown';
  const safeError = error || {};
  const raw =
    safeError && Object.prototype.hasOwnProperty.call(safeError, 'payload')
      ? safeError.payload
      : safeError;

  // 1. AbortError 优先：永远走 default:abort，交给状态机的 CANCEL 通路。
  if (safeError && safeError.name === 'AbortError') {
    const entry = ERROR_TRANSLATIONS['default:abort'];
    return {
      providerId: safeProviderId,
      message: entry.message,
      ...(entry.hint ? { hint: entry.hint } : null),
      raw,
    };
  }

  const status = typeof safeError.status === 'number' ? safeError.status : undefined;
  // providerCode 既可能挂在 error.providerCode，也可能挂在 error.code（服务端代理常这么传）。
  const providerCode =
    typeof safeError.providerCode === 'string' && safeError.providerCode
      ? safeError.providerCode
      : typeof safeError.code === 'string' && safeError.code
        ? safeError.code
        : undefined;

  // 2. 按优先级查表。
  const entry = lookupEntry({
    providerId: safeProviderId,
    status,
    providerCode,
    error: safeError,
  });

  if (entry) {
    return {
      providerId: safeProviderId,
      ...(typeof status === 'number' ? { status } : null),
      ...(providerCode ? { providerCode } : null),
      message: entry.message,
      ...(entry.hint ? { hint: entry.hint } : null),
      raw,
    };
  }

  // 3. 兜底：default:unknown —— 中文 "生成失败" + 状态码（如有）。
  const fallbackMessage =
    typeof status === 'number' ? `生成失败（HTTP ${status}）` : '生成失败';
  return {
    providerId: safeProviderId,
    ...(typeof status === 'number' ? { status } : null),
    ...(providerCode ? { providerCode } : null),
    message: fallbackMessage,
    raw,
  };
}

/**
 * 按优先级查找 Error_Translation_Table 命中项。
 *
 * 顺序：
 *   1) `${providerId}:${status}`
 *   2) `${providerId}:${providerCode}`
 *   3) `default:${status}`（5xx 走 `default:5xx`）
 *   4) `default:network`（无 status 且看起来像网络错误）
 *
 * 命中则返回对应 entry，否则返回 null（由调用方进入 default:unknown 兜底）。
 *
 * @param {{ providerId: string, status?: number, providerCode?: string, error: object }} ctx
 * @returns {TranslationEntry | null}
 */
function lookupEntry({ providerId, status, providerCode, error }) {
  // 1) Provider + 状态码精确命中（5xx 走 provider:5xx 桶，留出未来覆写空间）
  if (typeof status === 'number') {
    const providerStatusKey =
      status >= 500 && status < 600
        ? `${providerId}:5xx`
        : `${providerId}:${status}`;
    if (ERROR_TRANSLATIONS[providerStatusKey]) {
      return ERROR_TRANSLATIONS[providerStatusKey];
    }
  }

  // 2) Provider + providerCode 命中
  if (providerCode) {
    const providerCodeKey = `${providerId}:${providerCode}`;
    if (ERROR_TRANSLATIONS[providerCodeKey]) {
      return ERROR_TRANSLATIONS[providerCodeKey];
    }
  }

  // 3) default + 状态码（5xx 折叠到 default:5xx）
  if (typeof status === 'number') {
    const defaultStatusKey =
      status >= 500 && status < 600 ? 'default:5xx' : `default:${status}`;
    if (ERROR_TRANSLATIONS[defaultStatusKey]) {
      return ERROR_TRANSLATIONS[defaultStatusKey];
    }
  }

  // 4) 网络 / CORS 失败
  if (typeof status !== 'number' && isNetworkError(error)) {
    return ERROR_TRANSLATIONS['default:network'];
  }

  return null;
}
