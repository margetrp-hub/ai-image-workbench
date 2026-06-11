const baseUrl = String(process.env.STUDIO_PUBLIC_BASE_URL || process.env.STUDIO_BASE_URL || 'http://127.0.0.1:8080').replace(/\/+$/, '');
const historyBaseUrl = String(process.env.STUDIO_HISTORY_BASE_URL || `${baseUrl}`).replace(/\/+$/, '');

async function assertFetch(url, matcher, label) {
  const response = await fetch(url);
  const text = await response.text();
  if (!response.ok || !matcher(response, text)) {
    throw new Error(`${label} check failed: ${url}\nHTTP ${response.status}\n${text.slice(0, 1000)}`);
  }
  return { status: response.status, text };
}

const studio = await assertFetch(
  `${baseUrl}/studio/`,
  (_response, text) => text.includes('studio-assets') || text.includes('studio-root'),
  'Studio page'
);
const health = await assertFetch(
  `${historyBaseUrl}/studio-api/health`,
  (_response, text) => text.includes('"ok":true'),
  'History service health'
);

console.log(JSON.stringify({
  ok: true,
  baseUrl,
  historyBaseUrl,
  studioStatus: studio.status,
  health: JSON.parse(health.text)
}, null, 2));
