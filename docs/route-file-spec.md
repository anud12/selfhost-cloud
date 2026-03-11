Route File Specification

Overview
This file describes the per-project route file format used by the platform. Route files are YAML documents that list one or more route entries. Each route entry declares match conditions (host/path), the upstream target, optional rewrite/redirect rules, and metadata.

Top-level fields for a route entry
- id (optional): string, unique identifier for the route within the project. If omitted, tooling can generate one.
- host (required): string, the incoming Host header to match (e.g., example.com). Supports exact host only in the first iteration.
- path (required): string, the request path to match. Support for prefix/wildcard patterns using suffix "*" (e.g., /static/*) or exact matches.
- pathMatch (optional): enum [exact, prefix]. Default: prefix for paths ending with '/*', exact otherwise.
- upstream (required unless redirect is set): object describing target service or URL.
  - type: enum [service, url]
  - name: when type=service, the internal service name (e.g., users-service)
  - port: integer, port on the service (optional; default depends on service)
  - url: when type=url, full upstream URL (e.g., http://10.0.0.5:8080)
- rewrite (optional): object describing path rewrite rules
  - strip_prefix: boolean - if true, strips the matched prefix before forwarding
  - replace: mapping of regex -> replacement (advanced)
- redirect (optional): object describing an HTTP redirect instead of proxying
  - status: integer (301/302)
  - to: string (destination URL)
- status (optional): enum [active, queued, inactive, deprecated]. Default: active
- metadata (optional): object containing author, timestamp, description, tags
  - author: string (email or username)
  - timestamp: ISO8601 string
  - description: short human-readable summary

Sample route entry (normal)

- id: users-api-v1
  host: example.com
  path: /api/v1/users
  pathMatch: prefix
  upstream:
    type: service
    name: users-service
    port: 8080
  status: active
  metadata:
    author: alice@example.com
    timestamp: 2026-03-11T11:20:03Z
    description: Route users API to users-service

Wildcard example

- id: static-assets
  host: static.example.com
  path: /assets/*
  pathMatch: prefix
  upstream:
    type: service
    name: cdn-service
    port: 80
  status: active
  metadata:
    author: bob@example.com
    timestamp: 2026-03-11T11:20:03Z
    description: Serve static assets

Redirect example

- id: redirect-old
  host: example.com
  path: /old-path
  redirect:
    status: 301
    to: https://example.com/new-path
  status: active
  metadata:
    author: infra@example.com
    timestamp: 2026-03-11T11:20:03Z
    description: Redirect old path to new path

Deprecated example

- id: deprecated-route
  host: legacy.example.com
  path: /legacy
  upstream:
    type: service
    name: legacy-service
    port: 8080
  status: deprecated
  metadata:
    author: carol@example.com
    timestamp: 2026-03-11T11:20:03Z
    description: Deprecated legacy route (do not use)

Notes and glossary
- host: The HTTP Host header to match.
- path: The request path portion. Use trailing '/*' to indicate prefix matching.
- upstream service: References an internal service name resolvable by the platform's service discovery.
- status deprecated: Tooling should warn on creation and prevent activation unless explicitly allowed.

Validation hints
- Tooling should verify required fields: host, path, upstream OR redirect.
- Validate host format and path syntax. Provide human-readable errors with location (line/field) where possible.
