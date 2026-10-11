// OpenAPI 3.0 specification for the Self-Host Auth (OAuth2) service.
// Served at GET /openapi.json.

export const openapi = {
  openapi: '3.0.3',
  info: {
    title: 'Self-Host Auth (OAuth2) API',
    description:
      'OAuth 2.0 Authorization Code provider with a built-in demo client, a protected ' +
      'resource, and admin token management. Tokens are opaque and stored in-memory for ' +
      'this self-hosted demo (they do not survive a restart or scale to multiple replicas).',
    version: '1.0.0',
    contact: { name: 'Self-Host Cloud' },
  },
  tags: [
    { name: 'OAuth2', description: 'OAuth 2.0 authorization server endpoints' },
    { name: 'Resource', description: 'Protected resource and the interactive client flow' },
    { name: 'Admin', description: 'Token management (admin only)' },
    { name: 'Meta', description: 'API metadata' },
  ],
  paths: {
    '/oauth/authorize': {
      get: {
        tags: ['OAuth2'],
        summary: 'Authorization endpoint',
        description:
          'For an unauthenticated user, returns the sign-in/consent HTML page. For an ' +
          'authenticated user, redirects to `redirect_uri` with an authorization `code` (and `state`).',
        operationId: 'authorize',
        parameters: [
          { name: 'response_type', in: 'query', required: true, schema: { type: 'string', enum: ['code'] } },
          { name: 'client_id', in: 'query', required: true, schema: { type: 'string' } },
          { name: 'redirect_uri', in: 'query', required: true, schema: { type: 'string', format: 'uri' } },
          { name: 'state', in: 'query', required: false, schema: { type: 'string' } },
          { name: 'scope', in: 'query', required: false, schema: { type: 'string' } },
        ],
        responses: {
          '200': {
            description: 'Sign-in / consent HTML page (unauthenticated)',
            content: { 'text/html': { schema: { type: 'string' } } },
          },
          '302': { description: 'Redirect to `redirect_uri` with `code` and `state` (authenticated)' },
          '400': {
            description: 'Invalid authorization request',
            content: { 'text/plain': { schema: { type: 'string' } } },
          },
        },
      },
      post: {
        tags: ['OAuth2'],
        summary: 'Authorization endpoint (sign-in form)',
        description:
          'Submits credentials for the authorization request. On success, redirects to ' +
          '`redirect_uri` with an authorization `code`; on failure, re-renders the sign-in page with 401.',
        operationId: 'authorizeLogin',
        requestBody: {
          required: true,
          content: {
            'application/x-www-form-urlencoded': {
              schema: {
                type: 'object',
                properties: {
                  response_type: { type: 'string', enum: ['code'] },
                  client_id: { type: 'string' },
                  redirect_uri: { type: 'string', format: 'uri' },
                  state: { type: 'string' },
                  scope: { type: 'string' },
                  username: { type: 'string' },
                  password: { type: 'string', format: 'password' },
                },
                required: ['response_type', 'client_id', 'redirect_uri', 'username', 'password'],
              },
            },
          },
        },
        responses: {
          '302': { description: 'Redirect to `redirect_uri` with `code` (success)' },
          '401': {
            description: 'Invalid credentials; sign-in page re-rendered',
            content: { 'text/html': { schema: { type: 'string' } } },
          },
          '400': {
            description: 'Invalid authorization request',
            content: { 'text/html': { schema: { type: 'string' } } },
          },
        },
      },
    },
    '/oauth/token': {
      post: {
        tags: ['OAuth2'],
        summary: 'Token endpoint',
        description:
          'Exchanges an authorization code (or refresh token) for access/refresh tokens. ' +
          'Requires client authentication via HTTP Basic or `client_id`/`client_secret` in the body.',
        operationId: 'token',
        requestBody: {
          required: true,
          content: {
            'application/x-www-form-urlencoded': {
              schema: {
                type: 'object',
                properties: {
                  grant_type: { type: 'string', enum: ['authorization_code', 'refresh_token'] },
                  code: { type: 'string', description: 'Authorization code (authorization_code grant)' },
                  redirect_uri: { type: 'string', format: 'uri', description: 'Must match the authorize step' },
                  refresh_token: { type: 'string', description: 'Refresh token (refresh_token grant)' },
                  client_id: { type: 'string', description: 'Used when not authenticating via Basic' },
                  client_secret: { type: 'string', description: 'Used when not authenticating via Basic' },
                },
                required: ['grant_type'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Token response',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/TokenResponse' } } },
          },
          '400': {
            description: 'invalid_request / invalid_grant / unsupported_grant_type',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/OAuthError' } } },
          },
          '401': {
            description: 'invalid_client',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/OAuthError' } } },
          },
        },
      },
    },
    '/oauth/introspect': {
      post: {
        tags: ['OAuth2'],
        summary: 'Token introspection (RFC 7662)',
        description: 'Reports whether a given token is active. Requires client authentication.',
        operationId: 'introspect',
        requestBody: {
          required: true,
          content: {
            'application/x-www-form-urlencoded': {
              schema: {
                type: 'object',
                properties: {
                  token: { type: 'string' },
                  client_id: { type: 'string', description: 'Used when not authenticating via Basic' },
                  client_secret: { type: 'string', description: 'Used when not authenticating via Basic' },
                },
                required: ['token'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Introspection response',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/IntrospectionResponse' } } },
          },
          '401': {
            description: 'invalid_client',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/OAuthError' } } },
          },
        },
      },
    },
    '/oauth/userinfo': {
      get: {
        tags: ['OAuth2'],
        summary: 'User info',
        description: "Returns the authenticated user's claims. Requires a valid access token.",
        operationId: 'userinfo',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'User claims',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/UserInfo' } } },
          },
          '401': {
            description: 'Invalid or missing access token',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/OAuthError' } } },
          },
        },
      },
    },
    '/oauth/verify': {
      get: {
        tags: ['OAuth2'],
        summary: 'Token verification (gateway middleware)',
        description:
          'Returns 200 if the request carries a valid access token (Bearer or demo session), ' +
          '401 otherwise. Consumed by the nginx `auth_request` middleware; not meant for direct use.',
        operationId: 'verify',
        responses: {
          '200': {
            description: 'Valid token',
            content: { 'text/plain': { schema: { type: 'string', example: 'OK' } } },
          },
          '401': {
            description: 'No valid token',
            content: { 'text/plain': { schema: { type: 'string' } } },
          },
        },
      },
    },
    '/private/': {
      get: {
        tags: ['Resource'],
        summary: 'Private area (protected resource)',
        description:
          'Protected by a valid access token (Bearer or demo session). Unauthenticated requests ' +
          'are redirected to the login flow.',
        operationId: 'private',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Protected HTML content',
            content: { 'text/html': { schema: { type: 'string' } } },
          },
          '302': { description: 'Redirect to the login flow (unauthenticated)' },
        },
      },
    },
    '/private/login': {
      get: {
        tags: ['Resource'],
        summary: 'Start the authorization code flow',
        description: 'Begins the interactive flow by redirecting to /oauth/authorize.',
        operationId: 'startLoginFlow',
        responses: { '302': { description: 'Redirect to /oauth/authorize' } },
      },
    },
    '/private/callback': {
      get: {
        tags: ['Resource'],
        summary: 'Authorization code callback',
        description: 'Validates `state`, exchanges the `code` for tokens, then redirects to /private/.',
        operationId: 'callback',
        parameters: [
          { name: 'code', in: 'query', required: true, schema: { type: 'string' } },
          { name: 'state', in: 'query', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '302': { description: 'Redirect to /private/ on success' },
          '400': {
            description: 'Invalid state or authorization code',
            content: { 'text/plain': { schema: { type: 'string' } } },
          },
        },
      },
    },
    '/private/logout': {
      get: {
        tags: ['Resource'],
        summary: 'Logout',
        description: 'Invalidates the session and its refresh token, then redirects to the login flow.',
        operationId: 'logout',
        responses: { '302': { description: 'Redirect to the login flow' } },
      },
    },
    '/admin/tokens': {
      get: {
        tags: ['Admin'],
        summary: 'List all issued tokens',
        description: 'Admin-only. Returns an HTML table of all active access and refresh tokens.',
        operationId: 'listTokens',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Token list (HTML)',
            content: { 'text/html': { schema: { type: 'string' } } },
          },
          '302': { description: 'Redirect to the login flow (unauthenticated)' },
        },
      },
    },
    '/admin/revoke': {
      post: {
        tags: ['Admin'],
        summary: 'Revoke a single token',
        description: 'Admin-only. Removes the given access or refresh token.',
        operationId: 'revokeToken',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/x-www-form-urlencoded': {
              schema: {
                type: 'object',
                properties: { token: { type: 'string' } },
                required: ['token'],
              },
            },
          },
        },
        responses: {
          '302': { description: 'Redirect back to the token list' },
          '401': {
            description: 'Unauthorized',
            content: { 'text/plain': { schema: { type: 'string' } } },
          },
        },
      },
    },
    '/admin/revoke-all': {
      post: {
        tags: ['Admin'],
        summary: 'Revoke all tokens',
        description: 'Admin-only. Removes every outstanding access and refresh token.',
        operationId: 'revokeAllTokens',
        security: [{ bearerAuth: [] }],
        responses: {
          '302': { description: 'Redirect back to the token list' },
          '401': {
            description: 'Unauthorized',
            content: { 'text/plain': { schema: { type: 'string' } } },
          },
        },
      },
    },
    '/openapi.json': {
      get: {
        tags: ['Meta'],
        summary: 'This OpenAPI specification',
        description: 'Returns this document as JSON.',
        operationId: 'getOpenApi',
        responses: {
          '200': {
            description: 'The OpenAPI document',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/OpenApiDocument' } } },
          },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        description: 'A valid OAuth2 access token in the Authorization header.',
      },
    },
    schemas: {
      TokenResponse: {
        type: 'object',
        properties: {
          access_token: { type: 'string' },
          token_type: { type: 'string', example: 'Bearer' },
          expires_in: { type: 'integer', example: 3600 },
          refresh_token: { type: 'string' },
          scope: { type: 'string', example: 'read' },
        },
        required: ['access_token', 'token_type', 'expires_in'],
      },
      OAuthError: {
        type: 'object',
        properties: {
          error: { type: 'string', example: 'invalid_grant' },
          error_description: { type: 'string' },
        },
        required: ['error'],
      },
      IntrospectionResponse: {
        type: 'object',
        properties: {
          active: { type: 'boolean' },
          scope: { type: 'string' },
          client_id: { type: 'string' },
          username: { type: 'string' },
          token_type: { type: 'string' },
          exp: { type: 'integer', format: 'int64' },
        },
        required: ['active'],
      },
      UserInfo: {
        type: 'object',
        properties: {
          sub: { type: 'string' },
          name: { type: 'string' },
          preferred_username: { type: 'string' },
          scope: { type: 'string' },
        },
        required: ['sub'],
      },
      OpenApiDocument: {
        type: 'object',
        description: 'An OpenAPI 3.0 document.',
        properties: {
          openapi: { type: 'string' },
          info: { type: 'object' },
          paths: { type: 'object' },
          components: { type: 'object' },
        },
      },
    },
  },
};
