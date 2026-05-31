# Docker 生产部署

这份 Docker 配置不是纯静态 demo，而是完整可运行形态：

- `studio-web`：Nginx，负责 `/studio/` 静态前端、`/studio-api/`、`/api/`、`/login` 和 `/v1/*` 反向代理。
- `studio-history`：Node 历史/会话服务，负责历史图库、当前画布会话和生成结果资产持久化。
- `studio-data`：Docker volume，保存每个登录用户的 `records.json`、`session.json` 和本地化图片资产。

Sub2API 本身不打进这个镜像。项目通过 `SUB2API_UPSTREAM` 连接你已有的 Sub2API 服务。

## 1. 准备环境

复制环境文件：

```bash
cp .env.example .env
```

如果 Sub2API 已经跑在宿主机 `127.0.0.1:8080`，Docker 默认值可以直接用：

```env
SUB2API_UPSTREAM=http://host.docker.internal:8080
STUDIO_PORT=8080
```

如果 Sub2API 是另一个容器，把它改成同一个 Docker 网络里的服务名：

```env
SUB2API_UPSTREAM=http://sub2api:8080
```

如果 Sub2API 是远程域名：

```env
SUB2API_UPSTREAM=https://sub2api.example.com
```

默认建议让浏览器只访问 Studio 同域接口，所以 `.env` 里保持：

```env
VITE_SUB2API_BASE_URL=
VITE_SUB2API_GATEWAY_BASE_URL=
VITE_SUB2API_LOGIN_URL=/login
VITE_STUDIO_HISTORY_BASE_URL=
VITE_SUB2API_IMAGE_ROUTE=auto
```

这样前端会请求当前 Studio 域名下的 `/api`、`/login`、`/v1/responses`、`/v1/images/edits`，再由 Nginx 转发到 `SUB2API_UPSTREAM`。

## 2. 启动

```bash
docker compose up --build -d
```

本地默认访问：

```text
http://localhost:8080/studio/
```

检查容器：

```bash
docker compose ps
docker compose logs -f studio-web
docker compose logs -f studio-history
```

健康检查：

```bash
curl -I http://localhost:8080/studio/
curl http://localhost:8080/studio-api/health
```

预期：

```json
{"ok":true}
```

## 3. 持久化目录

默认数据保存在 Docker volume：

```bash
docker volume ls | grep image-sub2api-studio
docker volume inspect image-sub2api-studio_studio-data
```

数据结构大致是：

```text
/data/users/<user-hash>/records.json
/data/users/<user-hash>/session.json
/data/users/<user-hash>/assets/<record-id>/*.png
```

更新镜像或重建容器不会删除这个 volume。不要用 `docker compose down -v`，除非你明确要清空历史图库和当前会话。

备份：

```bash
docker run --rm \
  -v image-sub2api-studio_studio-data:/data:ro \
  -v "$PWD":/backup \
  alpine tar czf /backup/studio-data-backup.tgz -C /data .
```

恢复：

```bash
docker run --rm \
  -v image-sub2api-studio_studio-data:/data \
  -v "$PWD":/backup \
  alpine sh -c 'cd /data && tar xzf /backup/studio-data-backup.tgz'
```

## 4. 更新

```bash
git pull
docker compose build
docker compose up -d
```

只要不删除 `studio-data` volume，历史图库、当前画布和已本地化的生成图片都会保留。

## 5. VPS/Nginx 外层反代

如果 Docker 映射到宿主机 `8080`，外层 Nginx 可以这样转发：

```nginx
location /studio/ {
    proxy_pass http://127.0.0.1:8080;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location /studio-api/ {
    proxy_pass http://127.0.0.1:8080;
    proxy_http_version 1.1;
    client_max_body_size 120m;
    proxy_buffering off;
    proxy_cache off;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location /api/ {
    proxy_pass http://127.0.0.1:8080;
}

location /login {
    proxy_pass http://127.0.0.1:8080;
}

location /v1/ {
    proxy_pass http://127.0.0.1:8080;
    proxy_http_version 1.1;
    proxy_buffering off;
    proxy_read_timeout 900s;
    proxy_send_timeout 900s;
}
```

如果外层 Nginx 和 Docker Nginx 在同一台机器上，浏览器仍然只看到一个域名，登录、模型调用、历史图库和当前会话都走同域路径。

## 6. 素材库保护

开源包默认把基础 JSON 放在镜像和 `./public` 挂载里，适合 starter 版本。

如果要保护提示词和素材：

```env
VITE_STUDIO_LIBRARY_AUTH_REQUIRED=true
STUDIO_LIBRARY_DIR=/srv/image-sub2api-studio-library
```

然后把库文件放到：

```text
/srv/image-sub2api-studio-library/cases.json
/srv/image-sub2api-studio-library/inspirations.json
/srv/image-sub2api-studio-library/images/...
```

前端会通过 `/studio-api/library` 和 `/studio-api/library-assets/...` 登录后读取，避免直接暴露 `/studio/cases.json` 和 `/studio/images/`。

## 7. 常见问题

### `/studio-api/health` 正常，但历史为空

历史服务需要用户登录后的 Bearer token。未登录时只会使用浏览器本地缓存。

### 生成图刷新后丢失

确认 `studio-history` 正常运行，并且没有执行过：

```bash
docker compose down -v
```

### JS/CSS 返回 `text/html`

说明静态资源没有命中真实文件。检查：

```bash
curl -I http://localhost:8080/studio/studio-assets/<file>.js
```

正确应该是 `application/javascript`，不是 `text/html`。

### 容器连不上宿主机 Sub2API

Linux VPS 需要 Compose 里的：

```yaml
extra_hosts:
  - "host.docker.internal:host-gateway"
```

本项目已经默认配置。若仍失败，直接把 `SUB2API_UPSTREAM` 改成 Sub2API 的内网 IP 或域名。
