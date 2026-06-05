import { INDEX_BY_SCOPE, withStore } from './indexedDb.js';

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('IDB_REQUEST_FAILED'));
  });
}

function cursorToPromise(request, onValue) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) {
        resolve();
        return;
      }
      onValue(cursor);
      cursor.continue();
    };
    request.onerror = () => reject(request.error || new Error('IDB_CURSOR_FAILED'));
  });
}

function historySortValue(item) {
  return Date.parse(item?.updatedAt || item?.createdAt || '') || 0;
}

function normalizeScope(scope) {
  return String(scope || 'guest');
}

function normalizeHistoryItem(scope, item) {
  if (!item || typeof item !== 'object') return null;
  const id = String(item.id || item.sessionId || item.createdAt || '').trim();
  if (!id) return null;
  return {
    ...item,
    id,
    scope: normalizeScope(scope)
  };
}

export async function loadHistoryItems(scope = 'guest') {
  const normalizedScope = normalizeScope(scope);
  const items = await withStore('readonly', async (store) => {
    const index = store.index(INDEX_BY_SCOPE);
    return requestToPromise(index.getAll(normalizedScope));
  });
  return Array.isArray(items)
    ? items
      .filter((item) => item && typeof item === 'object')
      .sort((a, b) => historySortValue(b) - historySortValue(a))
    : [];
}

export async function saveHistoryItems(scope = 'guest', items = []) {
  const normalizedScope = normalizeScope(scope);
  const normalizedItems = Array.isArray(items)
    ? items.map((item) => normalizeHistoryItem(normalizedScope, item)).filter(Boolean)
    : [];

  await withStore('readwrite', (store) => new Promise((resolve, reject) => {
    const index = store.index(INDEX_BY_SCOPE);
    const cursorRequest = index.openCursor(IDBKeyRange.only(normalizedScope));

    cursorRequest.onerror = () => reject(cursorRequest.error || new Error('IDB_CURSOR_FAILED'));
    cursorRequest.onsuccess = () => {
      const cursor = cursorRequest.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
        return;
      }

      for (const item of normalizedItems) {
        store.put(item);
      }
      resolve();
    };
  }));
}

export async function deleteHistoryItem(scope = 'guest', recordId = '') {
  const normalizedScope = normalizeScope(scope);
  const id = String(recordId || '').trim();
  if (!id) return;
  await withStore('readwrite', async (store) => {
    const index = store.index(INDEX_BY_SCOPE);
    await cursorToPromise(index.openCursor(IDBKeyRange.only(normalizedScope)), (cursor) => {
      const value = cursor.value || {};
      if (value.id === id || value.sessionId === id || Array.isArray(value.recordIds) && value.recordIds.includes(id)) {
        cursor.delete();
      }
    });
  });
}

export async function clearHistoryItems(scope = 'guest') {
  const normalizedScope = normalizeScope(scope);
  await withStore('readwrite', async (store) => {
    const index = store.index(INDEX_BY_SCOPE);
    await cursorToPromise(index.openCursor(IDBKeyRange.only(normalizedScope)), (cursor) => {
      cursor.delete();
    });
  });
}
