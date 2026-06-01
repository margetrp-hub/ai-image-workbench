# Release Notes

## 0.8.1

This is a small repair release after the first 0.8 deployment.

- The language switch now covers the visible canvas controls, reference panel, bottom creation conversation, and parameter rail instead of only the outer shell.
- Current-session recovery now handles old cached `blob:` image URLs by falling back to the persisted `/studio-api/history/.../assets/...` URL, then resolving it through the authenticated asset fetch path.
- The release was verified with a browser language-switch smoke test and a persisted-asset recovery test.

## 0.8.0

`0.8.0` turns `image-sub2api-studio` from a single-page image tool into a more complete Sub2API creation workstation.

The main change is architectural: authenticated image generation can now be submitted as a server-side job through `/studio-api/generation-jobs`. The browser no longer needs to keep the original generation request alive for the result to be recoverable.

## Highlights

- Text-to-image uses `/v1/images/generations` by default.
- Reference image and Mask flows use `/v1/images/edits`.
- Prompt optimization uses `/v1/chat/completions` and is separate from image generation.
- Generated images are persisted by the studio service and can be restored after refresh.
- The infinite canvas keeps visual lineage between generated images.
- History is grouped by creation session instead of splitting every image into a separate project.
- User API keys are masked in the UI.
- Chinese/English UI switching now lives in the lower-left account area next to the theme/account controls.
- Docker Compose deployment is included for a complete runnable shape.

## Persistence Upgrade

The optional Node service now owns more than history records:

- `/studio-api/session` saves the current canvas and active session state.
- `/studio-api/history` stores session history and generated result URLs.
- `/studio-api/generation-jobs` creates, polls, and cancels server-side generation jobs.
- Generated result images are saved under the authenticated user's private asset directory.

The service does not persist the runtime API key used for generation jobs.

## Upgrade Notes

Traditional VPS deployment should upload both packages:

- `image-sub2api-studio-core-update-*.zip` to the Nginx static root.
- `image-sub2api-studio-service-update-*.zip` to `/opt/image-sub2api-studio`.

After the service package is updated:

```bash
cd /opt/image-sub2api-studio
sudo npm ci --omit=dev
sudo cp deploy/image-sub2api-studio-history.service /etc/systemd/system/image-sub2api-studio-history.service
sudo systemctl daemon-reload
sudo systemctl restart image-sub2api-studio-history
curl http://127.0.0.1:8787/studio-api/health
```

For Docker deployment:

```bash
cp .env.example .env
docker compose up --build -d
```

Do not run `docker compose down -v` unless you intend to delete history, jobs, and generated assets.

## Verification Checklist

- `npm run build:studio` completes.
- `/studio/` returns the built `studio.html`.
- `/studio/studio-assets/*.js` returns `application/javascript`, not `text/html`.
- `/studio/studio-assets/*.css` returns `text/css`, not `text/html`.
- `/studio-api/health` returns `{"ok":true}`.
- A normal image request appears in Sub2API logs as `/v1/images/generations`.
- A reference image or Mask request appears as `/v1/images/edits`.
- A prompt assistant request appears as `/v1/chat/completions`.
- Refreshing during or after generation does not remove persisted results from the current canvas/history gallery.

## Security and License Notes

- Source code is MIT licensed.
- Community prompt template content follows `CC BY 4.0` where applicable.
- The open-source package does not include the production home page, real API keys, or the full private image library.
- See [SECURITY.md](SECURITY.md) for deployment and data-boundary notes.
- See [Acknowledgements and Reference Boundaries](docs/ACKNOWLEDGEMENTS.md) for prompt and asset-source boundaries.

## Known Limits

- Stopping the browser wait does not guarantee upstream cancellation once Sub2API has accepted the request.
- If the service restarts while a job is already in flight, the job can become `unknown`; check Sub2API logs and the history gallery before retrying.
- Any prompt or asset returned to a browser can be inspected by that user. Use authenticated library APIs for private materials.
