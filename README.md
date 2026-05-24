# image-sub2api-studio

`image-sub2api-studio` is an open-source image generation workstation for Sub2API.

Sub2API already handles model access, user keys, quota, billing, and OpenAI-compatible API routes. This project adds the missing front-end creation layer: a workspace where users can write prompts, select their Sub2API key, choose models, upload reference images, tune generation parameters, preview results, download outputs, and keep history.

Demo: [studio.ohlaoo.com/studio/](https://studio.ohlaoo.com/studio/)

<p align="center">
  <a href="https://github.com/margetrp-hub/image-sub2api-studio"><img src="https://img.shields.io/badge/project-image--sub2api--studio-0f766e?style=flat-square" alt="project"></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-1f7268?style=flat-square" alt="MIT License"></a>
  <a href="./README.zh-CN.md"><img src="https://img.shields.io/badge/lang-简体中文-blue?style=flat-square" alt="简体中文"></a>
</p>

## What It Is

This project is not a model service and not just a prompt collection. It is a self-hostable creation workstation for Sub2API.

- Sub2API owns account login, API keys, models, quota, billing, and gateway routes.
- `image-sub2api-studio` owns the user-facing image generation workflow.
- Prompt templates and inspiration samples are optional starter content. A production deployment can serve a private template library through `/studio-api/library`.

## Screenshots

Screenshots use demo data and masked keys.

![Studio main workspace](docs/screenshots/studio-main.png)

![Image controls](docs/screenshots/image-controls.png)

![Reference image upload](docs/screenshots/reference-upload.png)

![Mask editing](docs/screenshots/mask-editor.png)

![Result preview](docs/screenshots/result-preview.png)

![Masked key settings](docs/screenshots/key-settings.png)

![History](docs/screenshots/history.png)

![Video workspace](docs/screenshots/video-workspace.png)

## Features

- Text-to-image generation through Sub2API-compatible routes.
- Reference image upload by picker, drag-and-drop, or paste.
- Mask editing for partial redraw workflows.
- Model, count, aspect ratio, quality, output format, moderation, and 1K/2K/4K resolution intent controls.
- Sub2API key selection with masked key display.
- Local history fallback plus optional server-side history isolated by Sub2API user.
- Separate image and video workspaces.
- Optional Nginx rules for blocking static prompt/image paths when the library is served through authenticated APIs.

## Project Structure

```text
.
├── src/
│   ├── studio.jsx                         # Main creation workspace
│   ├── studio.css                         # Workspace styles
│   ├── sub2apiClient.js                   # Sub2API / OpenAI-compatible client
│   └── studio/                            # Pure helpers and storage utilities
├── scripts/
│   ├── image-sub2api-studio-history-service.mjs
│   ├── check-sub2api-contract.mjs
│   └── package-studio-core-update.mjs
├── deploy/
│   ├── nginx-sub2api-studio.conf
│   ├── docker-nginx.conf
│   ├── image-sub2api-studio-history.service
│   └── UPDATE-SERVER.zh-CN.md
├── docs/
│   ├── DEPLOY.zh-CN.md
│   ├── DOCKER.zh-CN.md
│   ├── open-source-config.zh-CN.md
│   ├── sub2api-studio-overlay.md
│   ├── templates.md
│   └── screenshots/
├── public/
│   ├── cases.json                         # Lightweight starter templates
│   ├── inspirations.json                  # Empty starter extension point
│   ├── inspiration-sources.json
│   └── style-library.json
└── studio.html
```

## Quick Start

```bash
npm install
cp .env.example .env.local
npm run dev:studio
```

Build for production:

```bash
npm run build
```

Build for a `/studio/` subpath:

```bash
STUDIO_BASE_PATH=/studio/ npm run build
```

Windows PowerShell:

```powershell
$env:STUDIO_BASE_PATH="/studio/"
npm run build
Remove-Item Env:\STUDIO_BASE_PATH
```

## Environment

Minimum configuration:

```env
VITE_SUB2API_BASE_URL=https://sub2api.example.com
VITE_SUB2API_GATEWAY_BASE_URL=https://sub2api.example.com
VITE_SUB2API_IMAGE_ROUTE=responses
VITE_SUB2API_RESPONSES_MODEL=gpt-5.5
VITE_SUB2API_LOGIN_URL=https://studio.example.com/login
VITE_STUDIO_HISTORY_BASE_URL=https://studio.example.com
VITE_STUDIO_BACK_URL=/
VITE_STUDIO_LIBRARY_AUTH_REQUIRED=false
```

Notes:

- `VITE_SUB2API_BASE_URL` is normalized to `/api/v1` for login, profile, and key-list APIs.
- `VITE_SUB2API_GATEWAY_BASE_URL` is normalized to `/v1` for generation routes.
- `VITE_SUB2API_IMAGE_ROUTE=responses` uses `/v1/responses` with the image generation tool.
- `legacy` uses `/v1/images/generations`.
- `VITE_STUDIO_HISTORY_BASE_URL` points to the optional history service domain.
- `VITE_STUDIO_LIBRARY_AUTH_REQUIRED=false` lets the open-source starter templates load without login. Set it to `true` only when `/studio-api/library` is deployed and static template paths are blocked.

## Deployment

Static files can be served by Nginx, Docker, Vercel, object storage, or any regular VPS.

Common production paths:

```text
/var/www/image-sub2api-studio/    # Static files
/opt/image-sub2api-studio/        # Optional Node history service
/var/lib/image-sub2api-studio/    # User history and protected library assets
```

More details:

- [Deployment guide](docs/DEPLOY.zh-CN.md)
- [Docker guide](docs/DOCKER.zh-CN.md)
- [Server update guide](deploy/UPDATE-SERVER.zh-CN.md)

## Asset Library Strategy

The GitHub-ready package does not include a large image library. It ships with lightweight starter JSON so the app can run immediately.

For production:

- Put large images on the server, object storage, or a private CDN.
- Serve private prompts and assets through `/studio-api/library` after Sub2API login.
- Block direct static access to `/studio/images/`, `cases.json`, and `inspirations.json` if templates should not be crawled.
- Existing server image libraries do not need to be uploaded again when only updating JS/CSS/HTML.

## Sub2API Contract Check

```bash
SUB2API_BASE_URL=https://sub2api.example.com \
SUB2API_EMAIL=you@example.com \
SUB2API_PASSWORD='your-password' \
npm run check:sub2api
```

The check validates login, profile, and key-list behavior. It does not start paid generation.

## Prompt Sources & Acknowledgements

Community prompt projects and public examples are used as prompt-source references, case-study material, and learning references only. They are not the origin or ownership of this project.

Prompt template content comes from community sources and follows `CC BY 4.0` where applicable. Keep attribution to original authors or sources when using or adapting it.

See [Acknowledgements and Reference Boundaries](docs/ACKNOWLEDGEMENTS.md) for the project/source/asset boundary.

## Author & License

Maintainer: [@margetrp-hub](https://github.com/margetrp-hub)

Code is released under the [MIT License](LICENSE).
