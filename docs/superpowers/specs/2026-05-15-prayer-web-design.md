# Prayer Web — 教会代祷网站设计文档

**日期：** 2026-05-15  
**状态：** 已确认，待实施

---

## 1. 项目概述

面向教会弟兄姊妹的代祷事项平台。任何人可公开浏览代祷列表，注册用户可发布代祷事项，管理员负责管理内容与账号。

**核心目标：**
- 降低发布门槛（注册只需邮箱 + 名称，发布默认匿名）
- 多平台可访问（手机为主，兼顾平板与桌面）
- 维护成本极低（托管服务，免运维）

---

## 2. 技术栈

| 层级 | 技术选型 |
|------|---------|
| 前端框架 | Next.js (App Router) |
| 样式 | Tailwind CSS |
| 国际化 | next-intl（中英双语） |
| 后端 / 数据库 | Supabase（PostgreSQL + Auth + Edge Functions） |
| 邮件服务 | Resend |
| 部署 | Vercel（前端）+ Supabase 云（后端） |

**费用：** Supabase 免费层（500MB DB，5 万月活）+ Vercel 免费层，教会规模完全覆盖。

---

## 3. 视觉设计

- **主色调：** 白色底 + 蓝色（`#2d6a9f`）主题，清爽现代
- **语言切换：** 中/EN 按钮置于顶部导航栏右侧，全站可见
- **响应式策略：** 移动优先，手机单列，平板/桌面激活侧边栏布局

---

## 4. 用户权限层级

| 角色 | 权限 |
|------|------|
| 访客 | 浏览代祷列表、查看详情 |
| 注册用户 | 以上 + 发布代祷、点击「我在祷告」、联系管理员 |
| 管理员 | 以上 + 管理所有代祷事项、管理用户账号、查看留言 |

---

## 5. 页面结构

### 公开页面（无需登录）
- `/` — 首页：代祷列表 + 侧边分类筛选
- `/prayer/[id]` — 代祷详情页
- `/auth/login` — 登录
- `/auth/register` — 注册（邮箱 + 名称）
- `/auth/forgot` — 找回密码

### 注册用户页面
- `/submit` — 发布代祷事项
- `/my` — 我的代祷事项
- `/account` — 账号设置（通知偏好）

### 管理员页面
- `/admin` — 管理后台首页
- `/admin/prayers` — 管理代祷事项（编辑、删除、归档）
- `/admin/users` — 管理用户账号（启用/禁用）
- `/admin/categories` — 管理分类标签
- `/admin/messages` — 查看用户留言

---

## 6. 首页布局

**方案：侧边栏 + 列表**

- 左侧固定分类导航（全部 / 健康 / 家庭 / 工作 / 教会 / 宣教…），显示各分类数量
- 右侧代祷卡片列表，每张卡片显示：标题、发布者（匿名或显示名）、分类、时间、祷告人数
- 手机端侧边栏折叠进顶部筛选 Tab 或汉堡菜单
- 顶部 Hero 区含网站名称、简介、「发布代祷事项」按钮

---

## 7. 数据模型

### `profiles`（用户资料，关联 Supabase Auth）
```sql
id            uuid PRIMARY KEY  -- 对应 auth.users.id
display_name  text NOT NULL
role          text DEFAULT 'user'  -- 'user' | 'admin'
is_active     bool DEFAULT true
created_at    timestamptz DEFAULT now()
```

### `categories`（分类标签）
```sql
id       serial PRIMARY KEY
name_zh  text NOT NULL  -- 如"健康"
name_en  text NOT NULL  -- 如"Health"
color    text NOT NULL  -- Hex，如"#4a90d9"
```

### `prayer_requests`（代祷事项，核心表）
```sql
id           uuid PRIMARY KEY DEFAULT gen_random_uuid()
user_id      uuid REFERENCES profiles(id)
category_id  int REFERENCES categories(id)
title        text NOT NULL
content      text NOT NULL
is_anonymous bool DEFAULT true   -- 默认匿名
pray_count   int DEFAULT 0
status       text DEFAULT 'active'  -- 'active' | 'expired' | 'deleted'
expires_at   timestamptz DEFAULT now() + interval '30 days'
created_at   timestamptz DEFAULT now()
```

### `pray_logs`（防重复点击「我在祷告」）
```sql
prayer_request_id  uuid REFERENCES prayer_requests(id)
user_id            uuid REFERENCES profiles(id)  -- 可为空（访客）
ip_hash            text  -- 访客用 IP 哈希去重
created_at         timestamptz DEFAULT now()
PRIMARY KEY (prayer_request_id, COALESCE(user_id::text, ip_hash))
```

### `email_notifications`（邮件队列）
```sql
id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
to_user_id  uuid REFERENCES profiles(id)
type        text  -- 'pray_received' | 'expiry_reminder' | 'new_admin_message'
payload     jsonb
sent_at     timestamptz  -- 发送后填写，null 表示待发送
created_at  timestamptz DEFAULT now()
```

### `admin_messages`（用户 → 管理员私信）
```sql
id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
user_id     uuid REFERENCES profiles(id)
content     text NOT NULL
read_at     timestamptz  -- null 表示未读
created_at  timestamptz DEFAULT now()
```

---

## 8. 关键功能说明

### 8.1 注册流程
1. 用户填写邮箱 + 显示名称
2. Supabase Auth 发送邮件验证链接
3. 验证通过后自动创建 `profiles` 记录，role = `user`

### 8.2 发布代祷事项
- 表单字段：标题、内容、分类（必填）；「显示我的名字」切换（默认关闭）
- 提交后立即发布（无审核流程），30 天后自动归档

### 8.3 「我在为你祷告」
- 登录用户和访客均可点击
- 通过 `pray_logs` 去重（登录用户按 user_id，访客按 IP 哈希）

### 8.4 匿名逻辑
- `is_anonymous = true` 时，前端展示「匿名」；管理员后台始终显示真实发布者
- RLS 策略：非管理员查询 `prayer_requests` 时，`user_id` 字段在匿名帖中返回 null

### 8.5 联系管理员
- 登录用户可在账号页或代祷详情页打开「联系管理员」窗口
- 提交后写入 `admin_messages`，同时触发管理员邮件通知

### 8.6 自动过期
- Supabase Edge Function 每日运行一次
- 扫描 `expires_at < now()` 且 `status = 'active'` 的记录，更新为 `expired`
- 同时处理 `email_notifications` 表中待发送的邮件队列

---

## 9. 关键架构决策

1. **RLS（行级安全）在数据库层保证权限**：匿名帖子对非管理员隐藏发布者 id，用户只能修改自己的数据，权限不依赖前端判断。

2. **Server Components 处理首页列表**：代祷列表服务端渲染，SEO 可被搜索引擎收录，首屏加载快。

3. **Edge Function 定时任务每天运行一次**：处理代祷事项过期归档与邮件队列，无需独立后端服务。

---

## 10. 邮件通知类型

| 类型 | 触发时机 | 收件人 |
|------|---------|--------|
| 邮箱验证 | 注册时 | 新用户 |
| `expiry_reminder` | 代祷事项到期前 3 天 | 发布者 |
| `new_admin_message` | 用户发送留言 | 管理员 |

---

## 11. 项目初始分类（可管理员后台修改）

| 中文 | English | 颜色 |
|------|---------|------|
| 健康 | Health | `#4a90d9` |
| 家庭 | Family | `#34a853` |
| 工作 | Work | `#fbbc04` |
| 教会 | Church | `#ea4335` |
| 宣教 | Mission | `#9c27b0` |
| 其他 | Other | `#9e9e9e` |
