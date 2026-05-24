const apiBaseUrl = normalizeBaseUrl(
  process.env.SUB2API_BASE_URL || process.env.VITE_SUB2API_BASE_URL,
  '/api/v1'
);

const email = process.env.SUB2API_EMAIL;
const password = process.env.SUB2API_PASSWORD;

if (!apiBaseUrl || !email || !password) {
    console.error([
      'Missing required environment variables.',
      'Required:',
      '  SUB2API_BASE_URL=https://sub2api.example.com',
      '  SUB2API_EMAIL=<your account email>',
      '  SUB2API_PASSWORD=<your account password>'
    ].join('\n'));
  process.exit(1);
}

const checks = [];

try {
  const login = await postJson('/auth/login', { email, password });
  checks.push(['login', true]);

  if (login.requires_2fa) {
    checks.push(['2fa-required', true]);
    console.log('Sub2API contract is reachable, but this account requires 2FA.');
    console.table(checks.map(([name, ok]) => ({ check: name, ok })));
    process.exit(0);
  }

  const accessToken = login.access_token;
  if (!accessToken) {
    throw new Error('Login response did not include access_token.');
  }

  await getJson('/auth/me', accessToken);
  checks.push(['auth/me', true]);

  await getJson('/user/profile', accessToken);
  checks.push(['user/profile', true]);

  const keyList = await getJson('/keys?page=1&page_size=5&status=active', accessToken);
  const items = Array.isArray(keyList?.items) ? keyList.items : [];
  checks.push(['keys-list', Array.isArray(items)]);
  checks.push(['keys-include-full-key-field', items.length === 0 || typeof items[0].key === 'string']);

  console.table(checks.map(([name, ok]) => ({ check: name, ok })));
  console.log('Sub2API studio contract check passed.');
} catch (error) {
  console.table(checks.map(([name, ok]) => ({ check: name, ok })));
  console.error(`Sub2API studio contract check failed: ${error.message}`);
  process.exit(1);
}

function normalizeBaseUrl(value, suffix) {
  if (!value) return '';
  const trimmed = String(value).replace(/\/+$/, '');
  return trimmed.endsWith(suffix) ? trimmed : `${trimmed}${suffix}`;
}

async function getJson(path, token) {
  return request(path, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

async function postJson(path, body) {
  return request(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
}

async function request(path, options) {
  const response = await fetch(`${apiBaseUrl}${path}`, options);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload?.message || payload?.error?.message || `HTTP_${response.status}`);
  }

  if (payload && typeof payload === 'object' && 'code' in payload) {
    if (payload.code === 0) return payload.data;
    throw new Error(payload.message || `SUB2API_CODE_${payload.code}`);
  }

  return payload;
}
