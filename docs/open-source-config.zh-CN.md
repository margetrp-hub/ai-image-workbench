# 开源版配置说明

`image-sub2api-studio` 可以作为一个可自托管的 Sub2API 生图工作站使用。默认不包含任何真实密钥，也不包含完整大图库。

## 本地启动

```bash
npm install
cp .env.example .env.local
npm run dev:studio
```

## 最小配置

```env
VITE_SUB2API_BASE_URL=https://sub2api.example.com
VITE_SUB2API_GATEWAY_BASE_URL=https://sub2api.example.com
VITE_SUB2API_IMAGE_ROUTE=auto
VITE_SUB2API_RESPONSES_MODEL=gpt-5.5
VITE_SUB2API_LOGIN_URL=https://studio.example.com/login
VITE_STUDIO_HISTORY_BASE_URL=https://studio.example.com
VITE_STUDIO_BACK_URL=/
VITE_STUDIO_LIBRARY_AUTH_REQUIRED=false
```

字段含义：

- `VITE_SUB2API_BASE_URL`：Sub2API 管理接口根域名，前端会自动补成 `/api/v1`。
- `VITE_SUB2API_GATEWAY_BASE_URL`：OpenAI 兼容接口根域名，前端会自动补成 `/v1`。
- `VITE_SUB2API_IMAGE_ROUTE`：`auto` 为推荐模式，普通生图使用 `/v1/images/generations`，参考图和 Mask 使用 `/v1/images/edits`；只有上游明确支持时才改成 `responses`。
- `VITE_SUB2API_LOGIN_URL`：登录页地址，登录完成后应能带用户回到 Studio。
- `VITE_STUDIO_HISTORY_BASE_URL`：历史图库服务所在域名，默认同域调用 `/studio-api`。
- `VITE_STUDIO_BACK_URL`：工作台左上角返回链接。
- `VITE_STUDIO_LIBRARY_AUTH_REQUIRED`：是否要求登录后再加载素材库。开源版默认 `false`，生产环境把素材库改成 `/studio-api/library` 后可设为 `true`。

## 可替换内容

- `src/studio.jsx`：工作台文案、默认模型、默认参数和模板展示。
- `src/studio.css`：工作台样式。
- `public/cases.json`：轻量启动模板。生产环境可以替换成自己的模板索引。
- `public/inspirations.json`：扩展灵感入口。
- `docs/screenshots/`：README 截图。

## 历史图库服务

Studio 可以只使用浏览器本地历史，也可以启用服务端历史：

```bash
SUB2API_BASE_URL=http://127.0.0.1:8080
STUDIO_DATA_DIR=/var/lib/image-sub2api-studio
STUDIO_LIBRARY_DIR=/var/lib/image-sub2api-studio/library
STUDIO_LIBRARY_ASSET_DIR=/var/lib/image-sub2api-studio/library/images
STUDIO_HISTORY_HOST=127.0.0.1
STUDIO_HISTORY_PORT=8787
STUDIO_ALLOWED_ORIGINS=https://studio.example.com
npm run history:service
```

服务会用用户的 Sub2API Bearer Token 校验身份，把历史图库和当前画布会话写到按用户哈希隔离的目录。它不保存用户密码，也不保存用户的 Sub2API API Key。

## 生产构建

```bash
npm run build
```

部署在 `/studio/`：

```bash
STUDIO_BASE_PATH=/studio/ npm run build
```

构建产物在 `dist/`。`dist/`、`release/`、`output/`、`.tmp/` 都是本地产物或过程资料，已经在 `.gitignore` 中排除。

## 许可证说明

提示词模板内容来自社区，遵循 CC BY 4.0 许可证；使用和改编时请保留原作者或来源归属。项目代码按仓库根目录的 `LICENSE` 发布。
