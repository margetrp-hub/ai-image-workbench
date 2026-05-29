# Changelog

## 0.8.0 - 2026-05-30

- Redesigned the studio around an infinite canvas plus a bottom creation conversation.
- Added visible canvas lineage for #1 -> #2 / #3 continuation flows.
- Grouped the left project list and history gallery by creation session instead of splitting every generated image into a separate project.
- Improved the prompt assistant so the latest user direction wins, especially for derive, local edit, rewrite, remove, and replace instructions.
- Added pending-review states for timeout, manual stop, and interrupted generation, with clearer quota warnings when the upstream request may still be processing.
- Preserved streamed preview images on the canvas before final completion, reducing image loss after refresh or frontend interruption.
- Refined the bottom conversation UI, compact assistant action, parameter rail behavior, and project cards.
- Updated README screenshots, release story, deployment notes, and VPS update wording for the 0.8 release.

## 0.6.0 - 2026-05-28

- Added `/studio-api/session` for authenticated current-session persistence.
- The active canvas, selected node, prompt context, generation status, parameters, and recent result URLs can restore after refresh.
- Session image data URLs are converted into private user-scoped service assets instead of staying only in browser storage.
- The frontend fetches the remote session after login and debounces server-side session snapshots while editing or generating.

## 0.5.0 - 2026-05-28

- Changed image generation to call image models through `/v1/responses` directly, so `gpt-image-2` no longer falls back to `gpt-5.5 + image_generation tool`.
- Routed reference-image editing and Mask redraw through `/v1/images/edits`.
- Added an infinite-canvas creation area where results remain in the current session and previous images can be selected for continuation.
- Masked user keys in the UI.
- Added the local development proxy `VITE_DEV_SUB2API_PROXY_TARGET` for real upstream testing.
- Reworked image/video workspaces, template library, inspiration plaza, history records, deployment docs, acknowledgements, and asset-library protection notes.
