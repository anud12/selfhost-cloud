import express from 'express';
import session from 'express-session';
import crypto from 'crypto';
import { openapi } from './openapi';

const app = express();
const PORT = process.env.PORT || 3000;

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

// The single user the provider can authenticate.
const USER = { username: 'admin', password: 'admin', name: 'Administrator' };

const SESSION_COOKIE_NAME = 'auth_session';

const TOKEN_TTL = 3600;                // access token lifetime (seconds)
const REFRESH_TTL = 60 * 60 * 24 * 30; // refresh token lifetime (seconds)
const CODE_TTL = 60;                   // authorization code lifetime (seconds)

interface Client {
  clientId: string;
  clientSecret: string;
  // Allowed redirect_uri pathnames (self-hosted demo: match by path, any host).
  redirectUriPaths: string[];
  scopes: string[];
}

// Registered OAuth2 clients (confidential: client_id + client_secret).
const CLIENTS: Record<string, Client> = {
  'demo-client': {
    clientId: 'demo-client',
    clientSecret: 'demo-secret',
    redirectUriPaths: ['/private/callback'],
    scopes: ['read', 'profile'],
  },
};

// ---------------------------------------------------------------------------
// In-memory token stores
// ---------------------------------------------------------------------------

interface AuthCode {
  clientId: string;
  redirectUri: string;
  user: string;
  scope: string;
  expiresAt: number;
  used: boolean;
}
const authCodes = new Map<string, AuthCode>();

interface StoredToken {
  clientId: string;
  user: string;
  scope: string;
  expiresAt: number;
}
const accessTokens = new Map<string, StoredToken>();
const refreshTokens = new Map<string, StoredToken>();

declare module 'express-session' {
  interface SessionData {
    user?: string;          // provider: authenticated username
    oauth_state?: string;   // client: pending CSRF state
    access_token?: string;  // client: stored access token
    refresh_token?: string; // client: stored refresh token
  }
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

app.use(express.urlencoded({ extended: true }));
app.use(session({
  name: SESSION_COOKIE_NAME,
  secret: process.env.SESSION_SECRET || 'selfhost-auth-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, secure: false, sameSite: 'lax', path: '/' },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function randomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

function findClient(clientId: string): Client | undefined {
  return CLIENTS[clientId];
}

function isValidRedirectUri(client: Client, redirectUri: string): boolean {
  try {
    const u = new URL(redirectUri);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
    return client.redirectUriPaths.includes(u.pathname);
  } catch {
    return false;
  }
}

function issueTokens(client: Client, user: string, scope: string) {
  const access_token = randomToken();
  const refresh_token = randomToken();
  accessTokens.set(access_token, {
    clientId: client.clientId, user, scope, expiresAt: Date.now() + TOKEN_TTL * 1000,
  });
  refreshTokens.set(refresh_token, {
    clientId: client.clientId, user, scope, expiresAt: Date.now() + REFRESH_TTL * 1000,
  });
  return { access_token, refresh_token };
}

function bearerToken(req: express.Request): string | undefined {
  const header = req.get('authorization');
  if (header && header.toLowerCase().startsWith('bearer ')) {
    return header.slice(7).trim();
  }
  return undefined;
}

// Resolve a valid, non-expired access token from the request, either as a
// Bearer credential (API clients) or from the demo client's session cookie
// (interactive browser flow). Returns the token or null.
function resolveValidToken(req: express.Request): string | null {
  const bearer = bearerToken(req);
  if (bearer) {
    const t = accessTokens.get(bearer);
    if (t && t.expiresAt > Date.now()) return bearer;
  }
  const inSession = req.session.access_token;
  if (inSession) {
    const t = accessTokens.get(inSession);
    if (t && t.expiresAt > Date.now()) return inSession;
  }
  return null;
}

// Client authentication for the token/introspect endpoints: HTTP Basic or
// client_id/client_secret in the form body.
function authenticateClient(req: express.Request): Client | null {
  const header = req.get('authorization');
  let clientId = '';
  let clientSecret = '';
  if (header && header.toLowerCase().startsWith('basic ')) {
    const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
    [clientId, clientSecret] = decoded.split(':');
  }
  const body = req.body as Record<string, string>;
  clientId = clientId || body.client_id || '';
  clientSecret = clientSecret || body.client_secret || '';
  const client = findClient(clientId);
  if (!client || client.clientSecret !== clientSecret) return null;
  return client;
}

// ---------------------------------------------------------------------------
// OAuth2 provider: authorization endpoint
// ---------------------------------------------------------------------------

interface AuthorizeParams {
  response_type?: string;
  client_id?: string;
  redirect_uri?: string;
  state?: string;
  scope?: string;
}

function renderLoginPage(res: express.Response, params: AuthorizeParams, error?: string): void {
  const hidden = (['response_type', 'client_id', 'redirect_uri', 'state', 'scope'] as const)
    .map((k) => `<input type="hidden" name="${k}" value="${params[k] ?? ''}" />`)
    .join('\n          ');
  const errorBlock = error
    ? '<p class="error-message" style="color:#b00020;">Invalid username or password.</p>'
    : '';
  res.status(error ? 401 : 200).type('html').send(`
    <!doctype html>
    <html>
      <head><meta charset="utf-8" /><title>Authorize</title></head>
      <body style="font-family:sans-serif; text-align:center; padding:50px;">
        <h1>Sign In to Authorize</h1>
        ${errorBlock}
        <form action="/oauth/authorize" method="POST">
          ${hidden}
          <input type="text" name="username" placeholder="Username" required /><br />
          <input type="password" name="password" placeholder="Password" required /><br />
          <button type="submit">Authorize</button>
        </form>
      </body>
    </html>`);
}

function issueCodeAndRedirect(req: express.Request, res: express.Response, params: {
  clientId: string; redirectUri: string; state?: string; scope?: string;
}): void {
  const client = findClient(params.clientId)!;
  const code = randomToken(16);
  const scope = params.scope || client.scopes.join(' ');
  authCodes.set(code, {
    clientId: client.clientId,
    redirectUri: params.redirectUri,
    user: req.session.user!,
    scope,
    expiresAt: Date.now() + CODE_TTL * 1000,
    used: false,
  });
  const u = new URL(params.redirectUri);
  u.searchParams.set('code', code);
  if (params.state) u.searchParams.set('state', params.state);
  res.redirect(u.toString());
}

function validateAuthorizeRequest(params: AuthorizeParams): Client | null {
  if (params.response_type !== 'code') return null;
  const client = findClient(params.client_id ?? '');
  if (!client) return null;
  if (!params.redirect_uri || !isValidRedirectUri(client, params.redirect_uri)) return null;
  return client;
}

app.get('/oauth/authorize', (req, res) => {
  const params = req.query as AuthorizeParams;
  const client = validateAuthorizeRequest(params);
  if (!client) {
    return res.status(400).type('txt').send('invalid_request');
  }
  if (req.session.user) {
    return issueCodeAndRedirect(req, res, {
      clientId: client.clientId,
      redirectUri: params.redirect_uri!,
      state: params.state,
      scope: params.scope,
    });
  }
  return renderLoginPage(res, params);
});

app.post('/oauth/authorize', (req, res) => {
  const body = req.body as AuthorizeParams & { username?: string; password?: string };
  const params: AuthorizeParams = {
    response_type: body.response_type,
    client_id: body.client_id,
    redirect_uri: body.redirect_uri,
    state: body.state,
    scope: body.scope,
  };
  const client = validateAuthorizeRequest(params);
  if (!client) {
    return renderLoginPage(res, params, 'Invalid authorization request.');
  }
  if (body.username === USER.username && body.password === USER.password) {
    req.session.user = body.username;
    return issueCodeAndRedirect(req, res, {
      clientId: client.clientId,
      redirectUri: params.redirect_uri!,
      state: params.state,
      scope: params.scope,
    });
  }
  return renderLoginPage(res, params, 'Invalid username or password.');
});

// ---------------------------------------------------------------------------
// OAuth2 provider: token endpoint
// ---------------------------------------------------------------------------

app.post('/oauth/token', (req, res) => {
  const client = authenticateClient(req);
  if (!client) {
    return res.status(401).json({ error: 'invalid_client' });
  }

  const body = req.body as Record<string, string>;
  const { grant_type, code, redirect_uri, refresh_token } = body;

  if (grant_type === 'authorization_code') {
    if (!code) return res.status(400).json({ error: 'invalid_request' });
    const ac = authCodes.get(code);
    if (!ac || ac.used || ac.expiresAt <= Date.now()) {
      return res.status(400).json({ error: 'invalid_grant' });
    }
    if (ac.clientId !== client.clientId) {
      return res.status(400).json({ error: 'invalid_grant' });
    }
    if (redirect_uri !== undefined && redirect_uri !== ac.redirectUri) {
      return res.status(400).json({ error: 'invalid_grant' });
    }
    ac.used = true;
    authCodes.delete(code);
    const tokens = issueTokens(client, ac.user, ac.scope);
    return res.json({
      access_token: tokens.access_token,
      token_type: 'Bearer',
      expires_in: TOKEN_TTL,
      refresh_token: tokens.refresh_token,
      scope: ac.scope,
    });
  }

  if (grant_type === 'refresh_token') {
    if (!refresh_token) return res.status(400).json({ error: 'invalid_request' });
    const rt = refreshTokens.get(refresh_token);
    if (!rt || rt.expiresAt <= Date.now() || rt.clientId !== client.clientId) {
      return res.status(400).json({ error: 'invalid_grant' });
    }
    refreshTokens.delete(refresh_token); // rotate
    const tokens = issueTokens(client, rt.user, rt.scope);
    return res.json({
      access_token: tokens.access_token,
      token_type: 'Bearer',
      expires_in: TOKEN_TTL,
      refresh_token: tokens.refresh_token,
      scope: rt.scope,
    });
  }

  return res.status(400).json({ error: 'unsupported_grant_type' });
});

// ---------------------------------------------------------------------------
// OAuth2 provider: introspection (RFC 7662) + userinfo
// ---------------------------------------------------------------------------

app.post('/oauth/introspect', (req, res) => {
  const client = authenticateClient(req);
  if (!client) {
    return res.status(401).json({ error: 'invalid_client' });
  }
  const token = (req.body as Record<string, string>).token;
  const at = token ? accessTokens.get(token) : undefined;
  if (at && at.expiresAt > Date.now()) {
    return res.json({
      active: true,
      scope: at.scope,
      client_id: at.clientId,
      username: at.user,
      token_type: 'Bearer',
      exp: Math.floor(at.expiresAt / 1000),
    });
  }
  return res.json({ active: false });
});

app.get('/oauth/userinfo', (req, res) => {
  const bearer = bearerToken(req);
  const at = bearer ? accessTokens.get(bearer) : undefined;
  if (!at || at.expiresAt <= Date.now()) {
    return res.status(401).json({ error: 'invalid_token' });
  }
  res.json({ sub: at.user, name: USER.name, preferred_username: at.user, scope: at.scope });
});

// Token check endpoint used by the nginx `auth_request` middleware.
app.get('/oauth/verify', (req, res) => {
  const valid = resolveValidToken(req);
  if (valid) {
    const at = accessTokens.get(valid)!;
    res.status(200).set({ 'X-Auth-User': at.user, 'X-Auth-Scope': at.scope }).send('OK');
  } else {
    res.status(401).send('Unauthorized');
  }
});

// ---------------------------------------------------------------------------
// Built-in OAuth2 client + protected resource (the "private area")
// ---------------------------------------------------------------------------

const DEMO_CLIENT_ID = 'demo-client';

// Resource: requires a valid access token (Bearer or demo session).
app.get('/private/', (req, res) => {
  const valid = resolveValidToken(req);
  if (!valid) {
    return res.redirect('/private/login');
  }
  res.status(200).type('html').send(`
    <html style="font-family:sans-serif; text-align:center; padding:50px;">
      <body>
        <h1>Private Area</h1>
        <p>You have successfully authenticated via OAuth2 (authorization code flow).</p>
        <p>Subject: <strong>${req.session.user ?? 'api-client'}</strong></p>
        <a href="/admin/tokens">Token Management</a> &middot;
        <a href="/private/logout">Logout</a>
      </body>
    </html>`);
});

// Client: kick off the authorization code flow.
app.get('/private/login', (req, res) => {
  const state = randomToken(16);
  req.session.oauth_state = state;
  const host = req.get('host') || 'localhost';
  const scheme = req.get('x-forwarded-proto') || 'http';
  const redirectUri = `${scheme}://${host}/private/callback`;
  const qs = new URLSearchParams({
    response_type: 'code',
    client_id: DEMO_CLIENT_ID,
    redirect_uri: redirectUri,
    state,
    scope: 'read',
  });
  res.redirect(`/oauth/authorize?${qs.toString()}`);
});

// Client: callback - validate state, exchange code for tokens.
app.get('/private/callback', (req, res) => {
  const { code, state } = req.query as Record<string, string>;
  if (!code || !state || state !== req.session.oauth_state) {
    return res.status(400).type('txt').send('Invalid state (CSRF check failed).');
  }
  req.session.oauth_state = undefined;

  const client = findClient(DEMO_CLIENT_ID)!;
  const ac = authCodes.get(code);
  if (!ac || ac.used || ac.expiresAt <= Date.now() || ac.clientId !== client.clientId) {
    return res.status(400).type('txt').send('Invalid authorization code.');
  }
  ac.used = true;
  authCodes.delete(code);
  const tokens = issueTokens(client, ac.user, ac.scope);
  req.session.access_token = tokens.access_token;
  req.session.refresh_token = tokens.refresh_token;

  res.redirect('/private/');
});

app.get('/private/logout', (req, res) => {
  const rt = req.session.refresh_token;
  if (rt) refreshTokens.delete(rt);
  req.session.destroy(() => {
    res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
    res.redirect('/private/login');
  });
});

// ---------------------------------------------------------------------------
// Admin: view and revoke issued tokens
// ---------------------------------------------------------------------------

// Require a valid admin access token (Bearer or demo session). In this
// single-user demo, "admin" means the token belongs to the admin user.
function requireAdmin(req: express.Request): StoredToken | null {
  const valid = resolveValidToken(req);
  if (!valid) return null;
  const at = accessTokens.get(valid);
  if (!at || at.user !== USER.username) return null;
  return at;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatRemaining(expiresAt: number): string {
  const sec = Math.floor((expiresAt - Date.now()) / 1000);
  if (sec <= 0) return 'expired';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

interface TokenRow {
  token: string;
  type: 'access' | 'refresh';
  clientId: string;
  user: string;
  scope: string;
  expiresAt: number;
}

function collectTokens(): TokenRow[] {
  const rows: TokenRow[] = [];
  for (const [token, t] of accessTokens) {
    rows.push({ token, type: 'access', clientId: t.clientId, user: t.user, scope: t.scope, expiresAt: t.expiresAt });
  }
  for (const [token, t] of refreshTokens) {
    rows.push({ token, type: 'refresh', clientId: t.clientId, user: t.user, scope: t.scope, expiresAt: t.expiresAt });
  }
  return rows.sort((a, b) => a.expiresAt - b.expiresAt);
}

app.get('/admin/tokens', (req, res) => {
  if (!requireAdmin(req)) {
    return res.redirect('/private/login');
  }
  const rows = collectTokens();
  const accessCount = rows.filter((r) => r.type === 'access').length;
  const refreshCount = rows.length - accessCount;

  const bodyRows = rows.length
    ? rows
        .map((r) => {
          const short = `${r.token.slice(0, 12)}…`;
          return `
          <tr>
            <td>${r.type}</td>
            <td>${escapeHtml(r.clientId)}</td>
            <td>${escapeHtml(r.user)}</td>
            <td>${escapeHtml(r.scope)}</td>
            <td>${formatRemaining(r.expiresAt)}</td>
            <td class="token" title="${escapeHtml(r.token)}">${short}</td>
            <td>
              <form method="POST" action="/admin/revoke">
                <input type="hidden" name="token" value="${escapeHtml(r.token)}" />
                <button type="submit">Revoke</button>
              </form>
            </td>
          </tr>`;
        })
        .join('')
    : '<tr><td colspan="7">No active tokens.</td></tr>';

  res.status(200).type('html').send(`
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Token Management</title>
        <style>
          body { font-family: sans-serif; margin: 40px; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #ccc; padding: 8px; text-align: left; font-size: 14px; }
          th { background: #f4f4f4; }
          .token { font-family: monospace; }
          .summary { margin: 16px 0; }
          .danger { color: #b00020; }
        </style>
      </head>
      <body>
        <h1>Token Management</h1>
        <p class="summary">Access tokens: <strong>${accessCount}</strong> &middot; Refresh tokens: <strong>${refreshCount}</strong></p>
        <form method="POST" action="/admin/revoke-all" style="margin-bottom:16px;">
          <button type="submit" class="danger">Revoke All Tokens</button>
        </form>
        <table>
          <thead>
            <tr><th>Type</th><th>Client</th><th>User</th><th>Scope</th><th>Expires In</th><th>Token</th><th></th></tr>
          </thead>
          <tbody>${bodyRows}</tbody>
        </table>
        <p><a href="/private/">Back to Private Area</a></p>
      </body>
    </html>`);
});

// Revoke a single token (access or refresh).
app.post('/admin/revoke', (req, res) => {
  if (!requireAdmin(req)) {
    return res.status(401).type('txt').send('Unauthorized');
  }
  const token = (req.body as { token?: string }).token;
  if (token) {
    accessTokens.delete(token);
    refreshTokens.delete(token);
  }
  res.redirect('/admin/tokens');
});

// Revoke every outstanding token.
app.post('/admin/revoke-all', (req, res) => {
  if (!requireAdmin(req)) {
    return res.status(401).type('txt').send('Unauthorized');
  }
  accessTokens.clear();
  refreshTokens.clear();
  res.redirect('/admin/tokens');
});

// ---------------------------------------------------------------------------
// Public landing
// ---------------------------------------------------------------------------

app.get('/', (req, res) => {
  res.status(200).type('html').send(`
    <html style="font-family:sans-serif; text-align:center; padding:50px;">
      <body>
        <h1>Welcome</h1>
        <p>Public area.</p>
        <a href="/private/">Enter Private Area (OAuth2)</a>
        &middot; <a href="/openapi.json">OpenAPI Spec</a>
      </body>
    </html>`);
});

// ---------------------------------------------------------------------------
// Meta: OpenAPI specification
// ---------------------------------------------------------------------------

app.get('/openapi.json', (req, res) => {
  res.status(200).type('application/json').json(openapi);
});

app.listen(PORT, () => {
  console.log(`Auth (OAuth2) server listening on http://localhost:${PORT}`);
});
