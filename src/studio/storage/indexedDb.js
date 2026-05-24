// IndexedDB 低层帮手
//
// 与工作台历史记录模型保持同形：
//   - 数据库 `image-sub2api-studio` v1；
//   - 对象仓库 `studio_history`，keyPath `id`；
//   - 索引 `byScopeCreatedAt`（`[scope, createdAt]`，非唯一）；
//   - 索引 `byScope`（`scope`，非唯一）。
//
// 该模块只承担打开数据库与封装事务两件事；具体的 CRUD（含 favorite / LRU）由
// 上层 `historyStore.js` 实现。
//
// 隐私模式 / 配额失败时统一抛出 `Error('IDB_UNAVAILABLE')`，并把原始错误挂在
// `error.cause` 上；调用方据此回退到 localStorage 行为。

/** @type {string} */
export const DB_NAME = 'image-sub2api-studio';
/** @type {number} */
export const DB_VERSION = 1;
/** @type {string} */
export const STORE_NAME = 'studio_history';
/** @type {string} */
export const INDEX_BY_SCOPE_CREATED_AT = 'byScopeCreatedAt';
/** @type {string} */
export const INDEX_BY_SCOPE = 'byScope';

/** @type {string} */
const ERR_UNAVAILABLE = 'IDB_UNAVAILABLE';

/**
 * 缓存的连接 Promise。同一会话内复用同一个连接，避免每次 CRUD 都重新打开。
 * `versionchange` 触发时清空缓存并关闭连接，让下一次调用重新打开。
 *
 * @type {Promise<IDBDatabase> | null}
 */
let cachedDbPromise = null;

/**
 * 检测当前环境是否提供可用的 `indexedDB` 全局对象。
 *
 * 一些浏览器（特别是 Firefox 的隐私模式）会在访问 `window.indexedDB` 时直接抛
 * `SecurityError`，所以这里用 try/catch 包住。
 *
 * 注意：本函数只做 "API 是否暴露" 的最浅层检测——`open()` 后续仍可能因为配额
 * 或权限失败，那种失败由 {@link openDb} 转换为 `IDB_UNAVAILABLE` 抛出。
 *
 * @returns {boolean}
 */
export function indexedDbAvailable() {
  try {
    if (typeof globalThis === 'undefined') return false;
    // @ts-ignore - indexedDB 在浏览器环境下是 globalThis 的属性
    const idb = globalThis.indexedDB;
    return typeof idb !== 'undefined' && idb !== null;
  } catch {
    return false;
  }
}

/**
 * 把任意值规范化为 `Error`，再用 `IDB_UNAVAILABLE` 包一层；保留原因供调用方排查。
 *
 * @param {unknown} cause
 * @returns {Error}
 */
function makeUnavailableError(cause) {
  const error = new Error(ERR_UNAVAILABLE);
  // @ts-ignore - Error.cause 在所有现代浏览器与 Node 18+ 都已支持
  error.cause = cause instanceof Error ? cause : cause != null ? new Error(String(cause)) : undefined;
  return error;
}

/**
 * 在 `upgradeneeded` 时创建对象仓库与索引。
 * 仅在 v0 → v1 时执行；后续版本若新增索引，应在此函数中追加分支判断 `oldVersion`。
 *
 * @param {IDBDatabase} db
 * @param {IDBVersionChangeEvent} event
 */
function applyUpgrade(db, event) {
  const oldVersion = event.oldVersion ?? 0;

  if (oldVersion < 1) {
    // upgradeneeded 期间，request.transaction 为 versionchange 事务；通过它拿到既有 store
    // 或新建 store。
    const store = db.objectStoreNames.contains(STORE_NAME)
      ? // @ts-ignore - event.target 是 IDBOpenDBRequest，其 transaction 在 upgradeneeded 期间非空
        event.target.transaction.objectStore(STORE_NAME)
      : db.createObjectStore(STORE_NAME, { keyPath: 'id' });

    if (!store.indexNames.contains(INDEX_BY_SCOPE_CREATED_AT)) {
      store.createIndex(INDEX_BY_SCOPE_CREATED_AT, ['scope', 'createdAt'], { unique: false });
    }
    if (!store.indexNames.contains(INDEX_BY_SCOPE)) {
      store.createIndex(INDEX_BY_SCOPE, 'scope', { unique: false });
    }
  }
}

/**
 * 打开（或复用）`image-sub2api-studio` 数据库，返回连接 Promise。
 *
 * - 若 `indexedDB` 不可用 / `open` 触发 `error` 或 `blocked` 事件，抛
 *   `Error('IDB_UNAVAILABLE')`，原始错误挂在 `error.cause`。
 * - 连接收到 `versionchange` 时主动 `close()` 并清空缓存，避免阻塞其它 tab 升级。
 * - 连接收到 `close`（如硬重启）时也清空缓存，下一次调用会重新打开。
 *
 * @returns {Promise<IDBDatabase>}
 * @throws  {Error} `IDB_UNAVAILABLE`
 */
export function openDb() {
  if (cachedDbPromise) return cachedDbPromise;

  if (!indexedDbAvailable()) {
    return Promise.reject(makeUnavailableError(new Error('indexedDB is undefined')));
  }

  cachedDbPromise = new Promise((resolve, reject) => {
    /** @type {IDBOpenDBRequest} */
    let request;
    try {
      // @ts-ignore - indexedDB 在浏览器环境下是 globalThis 的属性
      request = globalThis.indexedDB.open(DB_NAME, DB_VERSION);
    } catch (error) {
      reject(makeUnavailableError(error));
      return;
    }

    request.onupgradeneeded = (event) => {
      const db = request.result;
      try {
        applyUpgrade(db, event);
      } catch (error) {
        // upgrade 失败时主动 abort tx，让外层走 error 路径
        try {
          request.transaction?.abort();
        } catch {
          /* ignore */
        }
        reject(makeUnavailableError(error));
      }
    };

    request.onsuccess = () => {
      const db = request.result;

      // 别的 tab 触发版本升级时，主动 close 让那个 tab 不被阻塞。
      db.onversionchange = () => {
        try {
          db.close();
        } catch {
          /* ignore */
        }
        cachedDbPromise = null;
      };

      // 连接异常关闭时清空缓存，下次再打开。
      db.onclose = () => {
        cachedDbPromise = null;
      };

      resolve(db);
    };

    request.onerror = () => {
      cachedDbPromise = null;
      reject(makeUnavailableError(request.error));
    };

    request.onblocked = () => {
      cachedDbPromise = null;
      reject(makeUnavailableError(new Error('indexedDB open blocked')));
    };
  });

  // 若 Promise 自身 reject，确保下次调用能重新尝试。
  cachedDbPromise.catch(() => {
    cachedDbPromise = null;
  });

  return cachedDbPromise;
}

/**
 * 在 `studio_history` 对象仓库上启动一次事务，并把对象仓库交给回调。
 *
 * 用法示例：
 * ```js
 * const entries = await withStore('readonly', async (store) => {
 *   return new Promise((resolve, reject) => {
 *     const req = store.getAll();
 *     req.onsuccess = () => resolve(req.result);
 *     req.onerror = () => reject(req.error);
 *   });
 * });
 * ```
 *
 * 行为契约：
 * - `mode`: `'readonly'` 或 `'readwrite'`。
 * - `fn` 可以是同步或异步函数。其返回值在事务 `complete` 后作为 Promise 的 resolve 值。
 * - 若 `fn` 抛错或返回的 Promise reject，主动 `transaction.abort()` 并把错误透传出去。
 * - 若事务 `abort`（如配额耗尽、外部中断）但 `fn` 已 resolve，仍以事务的错误 reject。
 *
 * @template T
 * @param {IDBTransactionMode} mode
 * @param {(store: IDBObjectStore) => T | Promise<T>} fn
 * @returns {Promise<T>}
 */
export async function withStore(mode, fn) {
  const db = await openDb();

  return new Promise((resolve, reject) => {
    /** @type {IDBTransaction} */
    let tx;
    try {
      tx = db.transaction(STORE_NAME, mode);
    } catch (error) {
      reject(makeUnavailableError(error));
      return;
    }

    const store = tx.objectStore(STORE_NAME);

    /** @type {unknown} */
    let resolved;
    /** @type {boolean} */
    let hasResolved = false;
    /** @type {unknown} */
    let aborted;

    tx.oncomplete = () => {
      if (hasResolved) {
        // @ts-ignore - resolved 在 hasResolved=true 时已被赋值
        resolve(resolved);
      } else {
        // 极端情况：事务 complete 但 fn 未 resolve（fn 同步返回 undefined 也算 resolved）。
        resolve(/** @type {T} */ (/** @type {unknown} */ (undefined)));
      }
    };

    tx.onerror = () => {
      reject(tx.error ?? aborted ?? new Error('IDB transaction error'));
    };

    tx.onabort = () => {
      reject(tx.error ?? aborted ?? new Error('IDB transaction aborted'));
    };

    Promise.resolve()
      .then(() => fn(store))
      .then((value) => {
        resolved = value;
        hasResolved = true;
      })
      .catch((error) => {
        aborted = error;
        try {
          tx.abort();
        } catch {
          /* ignore - 事务可能已经在错误中完成 */
        }
        reject(error);
      });
  });
}

/**
 * 仅供测试 / 调试使用：清空连接缓存，下次 `openDb()` 会重新发起 `open`。
 * 保留为命名导出方便单元测试或在身份切换时强制重连。
 *
 * @returns {void}
 */
export function __resetForTests() {
  cachedDbPromise = null;
}
