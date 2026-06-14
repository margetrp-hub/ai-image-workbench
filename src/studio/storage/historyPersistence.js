export function historyScopeFromIdentity(session, profile) {
  const identity = profile?.id || profile?.email || profile?.username || session?.user?.id || session?.user?.email || session?.user?.username || 'guest';
  return String(identity).toLowerCase().replace(/[^a-z0-9._-]+/g, '-');
}

export function createHistoryPersistence({
  historyKey,
  legacyHistoryKey,
  historyScopePrefix,
  legacyHistoryScopePrefix,
  localHistoryLimit,
  loadHistoryItems,
  saveHistoryItems,
  deleteHistoryItem,
  clearHistoryItems
}) {
  function historyStorageKey(scope) {
    return `${historyScopePrefix}:${scope || 'guest'}`;
  }

  function legacyHistoryStorageKey(scope) {
    return `${legacyHistoryScopePrefix}:${scope || 'guest'}`;
  }

  function loadHistory(scope = 'guest') {
    try {
      const scopedKey = historyStorageKey(scope);
      const fallback = localStorage.getItem(scopedKey)
        || localStorage.getItem(legacyHistoryStorageKey(scope))
        || (scope === 'guest' ? localStorage.getItem(historyKey) || localStorage.getItem(legacyHistoryKey) : null)
        || '[]';
      const parsed = JSON.parse(fallback);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveHistory(items, scope = 'guest') {
    const nextItems = mergeHistoryRecords(items, []).slice(0, localHistoryLimit).map(compactHistoryItem);
    try {
      localStorage.setItem(historyStorageKey(scope), JSON.stringify(nextItems));
      if (scope === 'guest') {
        localStorage.setItem(historyKey, JSON.stringify(nextItems));
      }
    } catch {
      try {
        localStorage.setItem(historyStorageKey(scope), JSON.stringify(nextItems.map((item) => ({ ...item, resultUrls: [] }))));
      } catch {
        localStorage.removeItem(historyStorageKey(scope));
      }
    }
    saveHistoryItems(scope, nextItems).catch(() => {
      // IndexedDB is an expanded local cache; localStorage remains the fallback.
    });
  }

  async function loadPersistedHistory(scope = 'guest') {
    try {
      const idbItems = await loadHistoryItems(scope);
      if (Array.isArray(idbItems) && idbItems.length) {
        return mergeHistoryRecords(idbItems, loadHistory(scope)).slice(0, localHistoryLimit);
      }
    } catch {
      // Fall back to the existing localStorage cache when IndexedDB is unavailable.
    }
    return loadHistory(scope);
  }

  function deletePersistedHistory(recordId, scope = 'guest') {
    deleteHistoryItem(scope, recordId).catch(() => {
      // IndexedDB cleanup is best-effort; the server/localStorage paths still run.
    });
  }

  function clearPersistedHistory(scope = 'guest') {
    clearHistoryItems(scope).catch(() => {
      // IndexedDB cleanup is best-effort; the server/localStorage paths still run.
    });
  }

  return {
    historyStorageKey,
    loadHistory,
    saveHistory,
    loadPersistedHistory,
    deletePersistedHistory,
    clearPersistedHistory
  };
}

export function mergeHistoryRecords(primary, secondary = []) {
  const map = new Map();
  for (const item of [...secondary, ...primary]) {
    if (!item?.id) continue;
    const existing = map.get(item.id);
    if (!existing) {
      map.set(item.id, item);
      continue;
    }
    const existingTime = Date.parse(existing.createdAt || '') || 0;
    const itemTime = Date.parse(item.createdAt || '') || 0;
    if (itemTime >= existingTime) {
      map.set(item.id, { ...existing, ...item });
    }
  }
  return [...map.values()].sort((left, right) => {
    const leftTime = Date.parse(left.createdAt || '') || 0;
    const rightTime = Date.parse(right.createdAt || '') || 0;
    return rightTime - leftTime;
  });
}

function compactHistoryItem(item) {
  if (!item || typeof item !== 'object') return item;
  const resultUrls = Array.isArray(item.resultUrls)
    ? item.resultUrls.filter((url) => !String(url || '').startsWith('data:'))
    : [];
  const displayResultUrls = resultUrls.length
    ? []
    : Array.isArray(item.displayResultUrls)
      ? item.displayResultUrls.filter((url) => !String(url || '').startsWith('data:')).slice(0, 4)
      : [];
  return {
    ...item,
    displayResultUrls,
    resultUrls
  };
}
