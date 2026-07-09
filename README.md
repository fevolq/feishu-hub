# 飞书组织后台

这是一个单机版飞书组织数据后台，用于查看多个飞书公司主体，手动或定时同步飞书部门、员工和上下级关系，并保留员工变更、离职和恢复在职记录。

项目基于 Next.js、React、TypeScript 和 SQLite 实现，后台页面使用统一访问密码登录。SQLite 数据默认保存在本地 `data` 目录，适合单机部署和轻量运维。

## 本地启动

安装依赖：

```bash
npm install
```

复制环境变量文件：

```bash
cp .env.example .env
```

启动 Web 服务：

```bash
npm run dev
```

访问：

```text
http://localhost:3000
```

如果需要本地运行定时同步 worker，另开一个终端执行：

```bash
npm run worker
```

## 环境变量

`.env.example` 提供了最小配置：

```env
APP_PASSWORD=change-me
SESSION_SECRET=change-me
SESSION_COOKIE_SECURE=false
SYNC_POLL_SECONDS=60
APP_TIMEZONE=Asia/Shanghai
```

生产环境请至少修改：

- `APP_PASSWORD`：后台访问密码。
- `SESSION_SECRET`：用于签名登录 Cookie，建议使用足够长的随机字符串。
- `SESSION_COOKIE_SECURE`：是否给登录 Cookie 添加 `Secure` 属性。使用 `http://IP:端口` 访问时保持 `false`；仅 HTTPS 部署时设为 `true`。

如需指定数据库路径，可额外配置：

```env
DATABASE_PATH=./data/feishu-hub.sqlite
```

## Docker 部署

准备 `.env` 后启动：

```bash
docker compose up -d
```

停止服务：

```bash
docker compose down
```

`docker-compose.yml` 包含两个服务：

- `web`：Web 后台。
- `scheduler`：定时同步 worker。

默认访问端口是 `3000`。如果需要修改宿主机对外端口，在 `.env` 中设置：

```env
EXPOSE_PORT=3001
```

不要用 `PORT` 修改对外端口；`PORT` 会影响容器内 Next.js 监听端口。
