# 项目架构

## 目标

项目采用模块化单体结构。业务仍运行在一个 Next.js Web 进程和一个同步 worker 进程中，两者共享同一个 SQLite 文件，不拆分服务、不改变数据库结构或对外 HTTP 契约。

## 目录

```text
src/
  app/                         Next.js 页面、布局和 API 适配器
    (dashboard)/               统一鉴权和 AppShell，不影响 URL
  modules/
    auth/                      登录、Session、鉴权
    companies/                 公司配置、排序、公开 DTO
    schedules/                 crontab 与同步计划
    organization/              用户、部门、历史和组织领域规则
    overview/                  概览读模型
    sync/                      飞书读取、快照持久化和调度
  shared/
    contracts/                 跨端基础契约
    http/                      HTTP 参数解析
    lib/                       无业务归属的纯工具
    server/                    配置、日志、SQLite 连接和 schema
    ui/                        API 客户端与共享展示样式
  worker.ts                    worker 组合入口

tests/
  contracts/                   数据库和模块依赖不变量
  modules/                     与业务模块镜像的测试
  shared/                      共享基础能力测试
```

## 依赖规则

```text
app / worker  ->  modules  ->  shared
```

- `src/app` 不包含 SQL、飞书读取或组织差异规则。
- `modules/*/domain` 只能依赖纯数据类型和纯函数库，不能依赖 Next.js、React、Arco、SQLite 或模块的 `server` 层。
- `shared` 不得依赖任何业务模块。
- 模块之间只通过明确的 contracts、domain 类型或 server 入口协作。
- 浏览器可见的公司 DTO 不包含 `appSecret`；带密钥的实体只存在于公司服务端仓储和同步流程。
- `tests/contracts/module-boundaries.test.ts` 自动保护以上关键规则。

## HTTP 流程

API 路径保持不变。路由处理顺序为：

1. Session 鉴权。
2. 解析路由和查询参数。
3. 使用模块 schema 校验请求体。
4. 调用模块仓储或应用服务。
5. 拼装既有状态码和 JSON 响应。

页面使用 `(dashboard)` route group 统一执行页面鉴权并渲染 AppShell。各页面只加载首屏数据并挂载对应模块 UI。

## 同步流程

同步顺序必须保持：

1. 校验公司存在且已启用。
2. 创建 `running` 同步记录。
3. 获取飞书 Token，递归读取部门，按部门分页读取员工。
4. 保存不含认证信息的原始组织响应。
5. 在单个事务中更新部门、当前员工、部门关系、每日快照和变更事件。
6. 写入成功统计；异常时将同步记录标为失败并保存错误。

`modules/sync/server/feishu` 将传输、组织遍历和原始响应采集分开，但保留 `FeishuClient` facade。Web 手动同步和 worker 定时同步复用同一个 `syncCompany` 用例。

## 数据库约束

- schema 位于 `src/shared/server/db/schema.sql`。
- 现有 9 张表、字段、索引、唯一约束和外键不得在结构重构中变化。
- 连接继续启用 WAL 和 foreign keys。
- 应用启动只执行幂等的当前 schema，不承担旧数据库迁移。
- `tests/contracts/database-schema.test.ts` 对完整结构进行校验。

## 前端结构

- Console 负责组合，异步请求和交互状态放在同模块 controller hook。
- 表格、抽屉、弹窗和概览卡片是独立展示组件。
- 组件局部样式使用 CSS Modules；`app/globals.css` 只保留 token、reset、共享工作面和必要的 Arco 响应式覆盖。
- 部门树和员工列表使用独立请求版本，避免切换公司时旧树覆盖新状态。
- 历史分页请求失败时不展示上一页事件，并恢复到最近成功页。

## 验证门禁

每次结构调整至少运行：

```bash
npx tsc --noEmit --incremental false
npm test
npm run build
```

涉及界面时还需验证登录、四个导航页面、主要弹窗/抽屉以及桌面和移动端布局。
