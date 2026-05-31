# Security Boundary

`image-sub2api-studio` is a self-hosted creation workstation for Sub2API-compatible image generation. It is not a model gateway, billing system, account system, or security product.

This document describes what the project does, what it intentionally does not do, and what should be checked before a production deployment.

## Supported Scope

- Front-end studio UI for prompt writing, reference image upload, image generation parameters, infinite canvas iteration, and history gallery.
- Optional Node service under `/studio-api/*` for current-session persistence, history records, generated asset storage, prompt library APIs, and server-side generation jobs.
- Same-origin deployment examples for Nginx, Docker Compose, and a traditional VPS layout.

## Out of Scope

- Sub2API account creation, billing, quota calculation, account pool routing, and upstream model availability.
- Abuse prevention, rate limits, moderation policy, or enterprise access control beyond the basic deployment examples.
- Full protection of any prompt, JSON, or image that has already been served to the browser.
- Legal review of user-generated images, uploaded references, third-party prompt packs, or private asset libraries.

## Key and Token Handling

- Sub2API bearer tokens are used by the browser to call the studio persistence service.
- The history service verifies the bearer token through Sub2API user endpoints and stores data under a hashed user directory.
- Sub2API API keys are masked in the UI.
- Server-side generation jobs receive the selected API key at runtime so the service can call `/v1/images/generations` or `/v1/images/edits`.
- API keys are not written to `jobs.json`, `records.json`, `session.json`, or generated asset files by the provided service.

Before deploying, confirm logs, reverse proxies, CDN tooling, and process managers do not print full authorization headers or API keys.

## Stored Data

The persistence service can store:

- `records.json`: history gallery records.
- `session.json`: current canvas/session snapshot.
- `jobs.json`: server-side generation job state, request IDs, status, timing, and non-secret request metadata.
- `assets/<record-id>/*`: generated result images persisted for later recovery.

By default, user storage is separated by a hash derived from the authenticated Sub2API user identity. This is practical isolation for a small self-hosted service, not a substitute for a hardened multi-tenant platform.

## Production Hardening Checklist

- Serve the studio through HTTPS.
- Keep `/studio-api/*` behind the same domain as the studio UI where possible.
- Set `STUDIO_ALLOWED_ORIGINS` to the real production origin.
- Keep `STUDIO_DATA_DIR` outside the static web root.
- Restrict static access to private libraries, for example `/studio/images/`, `cases.json`, and `inspirations.json`, if they contain private material.
- Add `X-Robots-Tag: noindex, nofollow, noarchive` for private deployments.
- Configure `client_max_body_size` for reference image and mask uploads.
- Keep Nginx `proxy_read_timeout` long enough for image generation.
- Back up `STUDIO_DATA_DIR` before upgrades.
- Do not commit `.env`, real Sub2API keys, user tokens, private images, or private prompt libraries.

## Known Limits

- A user can still inspect any asset or prompt returned to their browser.
- Stopping a browser wait does not guarantee that an upstream generation request has been canceled or refunded.
- If the Node persistence service restarts while an upstream request is already in flight, the job can become `unknown`; users should check history and upstream billing logs before retrying.
- Docker examples are meant to be runnable defaults. Public production deployments should still add firewall rules, monitoring, backups, and stricter origin policy.

## Reporting

For security issues in this project, open a private report through GitHub Security Advisories when available, or contact the maintainer through the repository owner profile.

Do not include live API keys, bearer tokens, private prompts, or private images in public issues.

