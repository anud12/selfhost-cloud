import { chromium } from 'playwright';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost';
const PRIVATE_URL = `${BASE_URL}/private/`;
const LOGOUT_URL = `${BASE_URL}/private/logout`;

const CREDENTIALS = { username: 'admin', password: 'admin' };
const CLIENT_ID = 'demo-client';
const CLIENT_SECRET = 'demo-secret';

let passed = 0;
let failed = 0;

function check(name: string, condition: boolean, detail?: string): void {
  if (condition) {
    passed += 1;
    console.log(`  [PASS] ${name}`);
  } else {
    failed += 1;
    console.error(`  [FAIL] ${name}${detail ? ` (${detail})` : ''}`);
  }
}

// Run the authorization-code grant once and return the resulting tokens.
async function obtainTokens(stateSuffix: string): Promise<{ access: string; refresh: string }> {
  const basic = `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`;
  const formHeader = { 'Content-Type': 'application/x-www-form-urlencoded' };

  const authorizeRes = await fetch(`${BASE_URL}/oauth/authorize`, {
    method: 'POST',
    redirect: 'manual',
    headers: formHeader,
    body: new URLSearchParams({
      response_type: 'code',
      client_id: CLIENT_ID,
      redirect_uri: `${BASE_URL}/private/callback`,
      state: `state-${stateSuffix}`,
      scope: 'read',
      username: CREDENTIALS.username,
      password: CREDENTIALS.password,
    }),
  });
  const location = authorizeRes.headers.get('location') ?? '';
  const code = new URL(location, BASE_URL).searchParams.get('code') ?? '';

  const tokenRes = await fetch(`${BASE_URL}/oauth/token`, {
    method: 'POST',
    headers: { ...formHeader, Authorization: basic },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: `${BASE_URL}/private/callback`,
    }),
  });
  const json = (await tokenRes.json()) as { access_token?: string; refresh_token?: string };
  return { access: json.access_token ?? '', refresh: json.refresh_token ?? '' };
}

// Part A: the interactive authorization-code flow in a real browser.
async function browserFlow(browser: import('playwright').Browser): Promise<void> {
  console.log('\n--- Part A: interactive OAuth2 flow (browser) ---');
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('\nA1. Unauthenticated /private/ starts the code flow (authorize/login page)');
    await page.goto(PRIVATE_URL, { waitUntil: 'domcontentloaded' });
    check('redirected into the authorize/login page', page.url().includes('/oauth/authorize'), `url=${page.url()}`);
    const formVisible = await page.locator('form[action="/oauth/authorize"]').isVisible();
    check('login form is rendered', formVisible);

    console.log('\nA2. Login with wrong credentials is rejected');
    await page.fill('input[name="username"]', CREDENTIALS.username);
    await page.fill('input[name="password"]', 'wrong-password');
    const [badResponse] = await Promise.all([
      page.waitForResponse((res) => res.url().includes('/oauth/authorize') && res.request().method() === 'POST'),
      page.click('button[type="submit"]'),
    ]);
    check('rejected with 401', badResponse.status() === 401, `status=${badResponse.status()}`);
    const errorVisible = await page.locator('.error-message').isVisible();
    check('error message is shown', errorVisible);

    console.log('\nA3. Valid credentials complete the flow and land on the private area');
    await page.fill('input[name="username"]', CREDENTIALS.username);
    await page.fill('input[name="password"]', CREDENTIALS.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(PRIVATE_URL, { timeout: 15000 });
    check('landed on /private/', page.url() === PRIVATE_URL, `url=${page.url()}`);
    const body = (await page.textContent('body')) ?? '';
    check('private area content is visible', body.includes('Private Area'));

    console.log('\nA4. Authenticated access to /private/ succeeds');
    const resp = await page.goto(PRIVATE_URL, { waitUntil: 'domcontentloaded' });
    check('response is 200 OK', resp !== null && resp.status() === 200, `status=${resp?.status() ?? 'null'}`);
    check('stays on /private/', page.url() === PRIVATE_URL, `url=${page.url()}`);

    console.log('\nA5. A new tab in the same context can access /private/ (shared session)');
    const tab = await context.newPage();
    await tab.goto(PRIVATE_URL, { waitUntil: 'domcontentloaded' });
    check('new tab can access /private/', tab.url() === PRIVATE_URL, `url=${tab.url()}`);
    await tab.close();

    console.log('\nA6. Logout ends the session');
    await page.goto(LOGOUT_URL, { waitUntil: 'domcontentloaded' });
    check(
      'redirected back into the login flow',
      page.url().includes('/oauth/authorize') || page.url().includes('/private/login'),
      `url=${page.url()}`,
    );

    console.log('\nA7. /private/ is protected again after logout');
    await page.goto(PRIVATE_URL, { waitUntil: 'domcontentloaded' });
    check(
      'redirected into the login flow again',
      page.url().includes('/oauth/authorize') || page.url().includes('/private/login'),
      `url=${page.url()}`,
    );
  } finally {
    await context.close();
  }
}

// Part B: the programmatic authorization-code grant over plain HTTP.
async function apiFlow(): Promise<void> {
  console.log('\n--- Part B: programmatic OAuth2 API (code grant) ---');
  const basic = `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`;
  const formHeader = { 'Content-Type': 'application/x-www-form-urlencoded' };

  console.log('\nB1. Obtain an authorization code (login at the authorize endpoint)');
  const authorizeRes = await fetch(`${BASE_URL}/oauth/authorize`, {
    method: 'POST',
    redirect: 'manual',
    headers: formHeader,
    body: new URLSearchParams({
      response_type: 'code',
      client_id: CLIENT_ID,
      redirect_uri: `${BASE_URL}/private/callback`,
      state: 'api-state-123',
      scope: 'read',
      username: CREDENTIALS.username,
      password: CREDENTIALS.password,
    }),
  });
  check('authorize returns a 3xx redirect', authorizeRes.status >= 300 && authorizeRes.status < 400, `status=${authorizeRes.status}`);
  const location = authorizeRes.headers.get('location') ?? '';
  check('redirect points to the registered redirect_uri', location.startsWith(`${BASE_URL}/private/callback?`), `location=${location}`);
  const code = new URL(location, BASE_URL).searchParams.get('code') ?? '';
  check('an authorization code was issued', code.length > 0);

  console.log('\nB2. Exchange the code for tokens at the token endpoint');
  const tokenRes = await fetch(`${BASE_URL}/oauth/token`, {
    method: 'POST',
    headers: { ...formHeader, Authorization: basic },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: `${BASE_URL}/private/callback`,
    }),
  });
  check('token endpoint returns 200', tokenRes.status === 200, `status=${tokenRes.status}`);
  const tokenJson = (await tokenRes.json()) as {
    access_token?: string; refresh_token?: string; token_type?: string;
  };
  check('an access token was issued', typeof tokenJson.access_token === 'string' && tokenJson.access_token.length > 0);
  check('a refresh token was issued', typeof tokenJson.refresh_token === 'string' && tokenJson.refresh_token.length > 0);
  check('token_type is Bearer', tokenJson.token_type === 'Bearer', `token_type=${tokenJson.token_type}`);
  const accessToken = tokenJson.access_token ?? '';
  const refreshToken = tokenJson.refresh_token ?? '';

  console.log('\nB3. Re-using the same authorization code is rejected (single use)');
  const reuseRes = await fetch(`${BASE_URL}/oauth/token`, {
    method: 'POST',
    headers: { ...formHeader, Authorization: basic },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: `${BASE_URL}/private/callback`,
    }),
  });
  const reuseJson = (await reuseRes.json()) as { error?: string };
  check('code reuse rejected with invalid_grant', reuseRes.status === 400 && reuseJson.error === 'invalid_grant', `status=${reuseRes.status} error=${reuseJson.error}`);

  console.log('\nB4. Access the resource with the Bearer token (no session cookie)');
  const resourceRes = await fetch(PRIVATE_URL, { headers: { Authorization: `Bearer ${accessToken}` } });
  const resourceBody = await resourceRes.text();
  check('resource returns 200 for a valid Bearer token', resourceRes.status === 200, `status=${resourceRes.status}`);
  check('resource content is returned', resourceBody.includes('Private Area'));

  console.log('\nB5. The userinfo endpoint validates the Bearer token');
  const infoRes = await fetch(`${BASE_URL}/oauth/userinfo`, { headers: { Authorization: `Bearer ${accessToken}` } });
  const infoJson = (await infoRes.json()) as { sub?: string; preferred_username?: string };
  check('userinfo returns 200', infoRes.status === 200, `status=${infoRes.status}`);
  check('userinfo subject is the authenticated user', infoJson.preferred_username === CREDENTIALS.username, `sub=${infoJson.sub}`);

  console.log('\nB6. The introspection endpoint reports the token active');
  const introspectRes = await fetch(`${BASE_URL}/oauth/introspect`, {
    method: 'POST',
    headers: formHeader,
    body: new URLSearchParams({ token: accessToken, client_id: CLIENT_ID, client_secret: CLIENT_SECRET }),
  });
  const introspectJson = (await introspectRes.json()) as { active?: boolean };
  check('introspection returns active=true', introspectRes.status === 200 && introspectJson.active === true, `active=${introspectJson.active}`);

  console.log('\nB7. The refresh_token grant issues a working new access token');
  const refreshRes = await fetch(`${BASE_URL}/oauth/token`, {
    method: 'POST',
    headers: { ...formHeader, Authorization: basic },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken }),
  });
  const refreshJson = (await refreshRes.json()) as { access_token?: string };
  check('refresh grant returns 200 with a new access token', refreshRes.status === 200 && typeof refreshJson.access_token === 'string', `status=${refreshRes.status}`);
  const newAccessToken = refreshJson.access_token ?? '';
  const newInfoRes = await fetch(`${BASE_URL}/oauth/userinfo`, { headers: { Authorization: `Bearer ${newAccessToken}` } });
  check('the rotated access token works', newInfoRes.status === 200, `status=${newInfoRes.status}`);

  console.log('\nB8. Invalid clients / bad tokens / missing tokens are rejected');
  const badClientRes = await fetch(`${BASE_URL}/oauth/token`, {
    method: 'POST',
    headers: {
      ...formHeader,
      Authorization: `Basic ${Buffer.from(`${CLIENT_ID}:wrong-secret`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: 'whatever',
      redirect_uri: `${BASE_URL}/private/callback`,
    }),
  });
  const badClientJson = (await badClientRes.json()) as { error?: string };
  check('wrong client_secret rejected with invalid_client', badClientRes.status === 401 && badClientJson.error === 'invalid_client', `status=${badClientRes.status} error=${badClientJson.error}`);

  const badBearerRes = await fetch(`${BASE_URL}/oauth/userinfo`, { headers: { Authorization: 'Bearer not-a-real-token' } });
  check('invalid Bearer token rejected with 401', badBearerRes.status === 401, `status=${badBearerRes.status}`);

  const noTokenRes = await fetch(PRIVATE_URL, { redirect: 'manual' });
  check('resource without a token is not served (redirects to login)', noTokenRes.status === 301 || noTokenRes.status === 302, `status=${noTokenRes.status}`);
}

// Part C: admin token management (list + revoke).
async function adminFlow(): Promise<void> {
  console.log('\n--- Part C: admin token management (list + revoke) ---');
  const formHeader = { 'Content-Type': 'application/x-www-form-urlencoded' };

  console.log('\nC1. Obtain two valid admin tokens');
  const adminTok = await obtainTokens('admin');
  const victimTok = await obtainTokens('victim');
  check('admin token obtained', adminTok.access.length > 0);
  check('victim token obtained', victimTok.access.length > 0);

  console.log('\nC2. Admin can view the token list with a valid token');
  const listRes = await fetch(`${BASE_URL}/admin/tokens`, { headers: { Authorization: `Bearer ${adminTok.access}` } });
  const listBody = await listRes.text();
  check('admin page returns 200', listRes.status === 200, `status=${listRes.status}`);
  check('token table is rendered', listBody.includes('Token Management'));
  check('lists the victim access token', listBody.includes(victimTok.access));

  console.log('\nC3. The admin page is protected without a token');
  const noAuthRes = await fetch(`${BASE_URL}/admin/tokens`, { redirect: 'manual' });
  check('redirects to login when unauthenticated', noAuthRes.status === 301 || noAuthRes.status === 302, `status=${noAuthRes.status}`);
  const noAuthLocation = noAuthRes.headers.get('location') ?? '';
  check('redirect target is the login flow', noAuthLocation.includes('/private/login'), `location=${noAuthLocation}`);

  console.log('\nC4. A single token can be revoked');
  const revokeRes = await fetch(`${BASE_URL}/admin/revoke`, {
    method: 'POST',
    redirect: 'manual',
    headers: { ...formHeader, Authorization: `Bearer ${adminTok.access}` },
    body: new URLSearchParams({ token: victimTok.access }),
  });
  check('revoke returns a redirect', revokeRes.status === 301 || revokeRes.status === 302, `status=${revokeRes.status}`);
  const victimInfo = await fetch(`${BASE_URL}/oauth/userinfo`, { headers: { Authorization: `Bearer ${victimTok.access}` } });
  check('revoked token no longer works (userinfo 401)', victimInfo.status === 401, `status=${victimInfo.status}`);
  const adminInfo = await fetch(`${BASE_URL}/oauth/userinfo`, { headers: { Authorization: `Bearer ${adminTok.access}` } });
  check('admin token still works after revoking another', adminInfo.status === 200, `status=${adminInfo.status}`);
  const listAfter = await (await fetch(`${BASE_URL}/admin/tokens`, { headers: { Authorization: `Bearer ${adminTok.access}` } })).text();
  check('revoked token is no longer listed', !listAfter.includes(victimTok.access));

  console.log('\nC5. All tokens can be revoked at once');
  const revokeAllRes = await fetch(`${BASE_URL}/admin/revoke-all`, {
    method: 'POST',
    redirect: 'manual',
    headers: { ...formHeader, Authorization: `Bearer ${adminTok.access}` },
    body: new URLSearchParams({}),
  });
  check('revoke-all returns a redirect', revokeAllRes.status === 301 || revokeAllRes.status === 302, `status=${revokeAllRes.status}`);
  const adminAfter = await fetch(`${BASE_URL}/oauth/userinfo`, { headers: { Authorization: `Bearer ${adminTok.access}` } });
  check('admin token is invalidated after revoke-all', adminAfter.status === 401, `status=${adminAfter.status}`);
  const adminPageAfter = await fetch(`${BASE_URL}/admin/tokens`, { redirect: 'manual', headers: { Authorization: `Bearer ${adminTok.access}` } });
  check('admin page is locked again after revoke-all', adminPageAfter.status === 301 || adminPageAfter.status === 302, `status=${adminPageAfter.status}`);
}

// Part D: the OpenAPI specification endpoint.
async function specFlow(): Promise<void> {
  console.log('\n--- Part D: OpenAPI specification ---');

  const specRes = await fetch(`${BASE_URL}/openapi.json`);
  const contentType = specRes.headers.get('content-type') ?? '';
  check('spec endpoint returns 200', specRes.status === 200, `status=${specRes.status}`);
  check('spec served as JSON', contentType.includes('application/json'), `content-type=${contentType}`);

  const spec = (await specRes.json()) as {
    openapi?: string;
    info?: { title?: string; version?: string };
    paths?: Record<string, unknown>;
    components?: { securitySchemes?: Record<string, unknown> };
  };
  check('declares an OpenAPI 3.x version', typeof spec.openapi === 'string' && spec.openapi.startsWith('3.'), `openapi=${spec.openapi}`);
  check('has an info block', typeof spec.info?.title === 'string' && typeof spec.info?.version === 'string');
  const pathKeys = spec.paths ? Object.keys(spec.paths) : [];
  check(
    'documents the core OAuth2 paths',
    ['/oauth/authorize', '/oauth/token', '/oauth/userinfo', '/admin/tokens'].every((p) => pathKeys.includes(p)),
    `paths=${pathKeys.join(',')}`,
  );
  check('defines a bearer security scheme', typeof spec.components?.securitySchemes?.bearerAuth === 'object');
}

async function main(): Promise<void> {
  console.log(`--- OAuth2 flow test against ${BASE_URL} ---`);

  const browser = await chromium.launch({ headless: true });
  try {
    await browserFlow(browser);
  } finally {
    await browser.close();
  }
  await apiFlow();
  await adminFlow();
  await specFlow();

  console.log(`\n--- Result: ${passed} passed, ${failed} failed ---`);
  if (failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error('Test run crashed:', error);
  process.exitCode = 1;
});
