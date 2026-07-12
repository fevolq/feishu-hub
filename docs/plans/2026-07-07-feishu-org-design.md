# 飞书组织设计

## 方案选择

采用单体 Next.js 应用加 SQLite。Web 服务负责页面、API、手动同步和登录；Docker Compose 另起一个 worker 容器复用同一份代码，定时扫描公司同步配置并触发同步。这个方案比把定时任务塞进 Next.js 请求生命周期更稳定，也比引入独立任务队列轻。

备选方案有两个：

- Next.js 单容器内置 `setInterval`：部署最简单，但进程生命周期和 Next.js dev/prod 行为耦合，后续不好排查。
- Next.js + 外部数据库 + 队列：扩展性最好，但对单机版过重。

## 架构

- `src/app`：Next.js App Router 页面和 API。
- `src/server/db`：SQLite 连接、表结构和仓储。
- `src/server/feishu`：飞书 Open API 客户端。
- `src/server/sync`：同步编排、快照比对、历史事件生成、定时调度。
- `src/server/auth`：密码登录、Cookie 会话和 API 鉴权。
- `src/components`：后台布局、退出登录等通用 UI。
- `tests`：优先覆盖员工快照差异计算。

## 数据流

1. 管理员登录后台。
2. 新增公司并录入飞书凭证。
3. 手动同步或 worker 到期触发同步。
4. 同步服务拉取部门和用户，归一化为内部模型。
5. SQLite 更新部门、用户当前表、用户部门关系。
6. 对比旧用户快照，写入用户变更事件。
7. 页面读取当前表和历史事件展示。

## 数据模型

- `companies`：公司主体和同步配置。
- `sync_runs`：每次同步运行记录。
- `departments`：公司下的当前部门树。
- `users_current`：公司下的用户当前状态。
- `user_departments`：用户和部门的当前关系。
- `user_change_events`：用户历史变更事件。

## 错误处理

- 飞书认证失败、接口失败、同步异常都会写入 `sync_runs`。
- 页面 API 返回结构化错误。
- 定时 worker 单个公司失败不影响其他公司。

## 安全取舍

- 访问密码来自 `.env` 的 `APP_PASSWORD`。
- Cookie 使用 `SESSION_SECRET` 做 HMAC 签名。
- `APP_SECRET` 按需求明文存储。

