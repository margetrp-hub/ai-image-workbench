# Docker 快速部署

这份 Docker 配置用于把 `image-sub2api-studio` 构建成一个静态 Nginx 容器。容器不内置 Sub2API，也不内置真实模型密钥。

公开演示入口示例：[studio.ohlaoo.com/studio/](https://studio.ohlaoo.com/studio/)

## 一键启动

```bash
cp .env.example .env
docker compose up --build
```

默认本地访问：

```text
http://localhost:8080/studio/
```

修改端口：

```bash
STUDIO_PORT=8090 docker compose up --build
```

## 配置 Sub2API

在 `.env` 中设置接口地址：

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

重新构建：

```bash
docker compose up --build -d
```

## 子路径部署

如果部署到 `/studio/` 子路径，并让构建资源也使用 `/studio/` 前缀：

```bash
STUDIO_BASE_PATH=/studio/ VITE_BASE_PATH=/studio/ docker compose up --build
```

## 生产建议

- 容器只托管静态文件；登录、计费、Key 管理和模型调用由 Sub2API 承担。
- 不要提交真实 `.env`、API Key 或后台密钥。
- 大图库建议放在服务器目录、对象存储或私有 CDN，不要直接放进镜像。
- 如果要隐藏提示词和素材，需要把素材库后端化，并在 Nginx 层限制静态 JSON 和图片目录直接访问。
- 素材库后端化以后，再把 `VITE_STUDIO_LIBRARY_AUTH_REQUIRED` 设为 `true` 并重新构建镜像。
