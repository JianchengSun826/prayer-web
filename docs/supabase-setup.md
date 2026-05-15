# Supabase 配置指南

完成此文档中的步骤后，数据库将创建完毕，本地开发环境即可运行完整的注册/登录流程。

---

## 第一部分：创建 Supabase 项目

### 1. 注册 / 登录 Supabase

打开 https://supabase.com，点击右上角 **Start your project**，使用 GitHub 账号登录即可（无需另外注册）。

### 2. 新建项目

1. 登录后进入 Dashboard，点击 **New project**
2. 填写以下信息：
   - **Organization**：选择你的个人账户（或新建组织）
   - **Name**：`prayer-web`
   - **Database Password**：设置一个强密码，**请保存好**（后续连接数据库会用到）
   - **Region**：选择离你最近的区域（如 `Northeast Asia (Tokyo)` 或 `Southeast Asia (Singapore)`）
3. 点击 **Create new project**
4. 等待约 2 分钟，等进度条完成（页面会自动刷新）

---

## 第二部分：获取 API 密钥

项目创建完成后：

1. 在左侧菜单点击 **Project Settings**（齿轮图标）
2. 点击 **API** 选项卡
3. 你会看到以下信息，**全部复制保存**：

| 字段 | 说明 |
|------|------|
| **Project URL** | 形如 `https://xxxxxxxxxxxx.supabase.co` |
| **anon public** | 以 `eyJ` 开头的长字符串（公开密钥，前端使用） |
| **service_role** | 以 `eyJ` 开头的另一个长字符串（私密！仅后端使用） |

> ⚠️ `service_role` 密钥拥有绕过所有安全规则的权限，**绝对不能提交到 git 或暴露在前端代码中**。

---

## 第三部分：配置本地环境变量

在项目根目录（`/Users/jianchengsun/web-dev/prayer-web/`）创建 `.env.local` 文件：

```bash
# 在终端中运行（或直接用编辑器创建文件）
touch /Users/jianchengsun/web-dev/prayer-web/.env.local
```

用任意编辑器打开 `.env.local`，填入以下内容（替换为你的真实值）：

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...（你的 anon key）
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...（你的 service_role key）
RESEND_API_KEY=re_placeholder
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

> `RESEND_API_KEY` 暂时填 `re_placeholder`，邮件功能在 Phase 3 再配置。

确认 `.env.local` 已在 `.gitignore` 中（它已经在了，不会被提交到 GitHub）。

---

## 第四部分：推送数据库结构

数据库的表结构、权限规则（RLS）、初始分类数据都定义在迁移文件中，通过 Supabase CLI 推送到云端。

### 1. 获取 Project Reference

打开 Supabase Dashboard，在浏览器地址栏中找到你的项目 URL，格式为：

```
https://supabase.com/dashboard/project/xxxxxxxxxxxx
```

`xxxxxxxxxxxx` 就是你的 **Project Reference**（项目引用 ID），复制它。

你也可以在 **Project Settings → General** 页面找到 **Reference ID**。

### 2. 登录 Supabase CLI

在终端中运行（在项目目录下）：

```bash
cd /Users/jianchengsun/web-dev/prayer-web
npx supabase login
```

这会打开浏览器要求授权，点击 **Authorize CLI** 即可。

### 3. 关联项目

```bash
npx supabase link --project-ref 你的Project_Reference
```

例如：
```bash
npx supabase link --project-ref abcdefghijklmnop
```

系统会提示输入数据库密码，填入你在第一部分步骤 2 设置的密码。

### 4. 推送数据库迁移

```bash
npx supabase db push
```

成功输出类似：

```
Applying migration 20260515000000_initial.sql...
Finished supabase db push.
```

### 5. 验证数据库

打开 Supabase Dashboard → **Table Editor**，你应该看到以下 5 张表：

- `profiles`
- `categories`（已有 6 条初始分类数据）
- `prayer_requests`
- `email_notifications`
- `admin_messages`

点击 `categories` 表，确认有以下 6 条数据：

| name_zh | name_en | color |
|---------|---------|-------|
| 健康 | Health | #4a90d9 |
| 家庭 | Family | #34a853 |
| 工作 | Work | #fbbc04 |
| 教会 | Church | #ea4335 |
| 宣教 | Mission | #9c27b0 |
| 其他 | Other | #9e9e9e |

---

## 第五部分：配置 Supabase Auth 邮件设置

### 1. 设置站点 URL

在 Supabase Dashboard → **Authentication → URL Configuration**：

- **Site URL**：`http://localhost:3000`（开发时；上线后改为正式域名）
- **Redirect URLs**：添加 `http://localhost:3000/**`

### 2. 查看邮件模板（可选）

**Authentication → Email Templates** 中可以查看注册验证邮件的模板。默认模板是英文的，可以先不修改，上线前再汉化。

---

## 第六部分：启动开发服务器并测试

### 1. 启动

```bash
cd /Users/jianchengsun/web-dev/prayer-web
npm run dev
```

### 2. 测试注册流程

1. 打开 http://localhost:3000/auth/register
2. 填写：
   - 姓：`王`
   - 名：`James`
   - 身份：`弟兄`
   - 邮箱：你的真实邮箱（会收到验证邮件）
   - 密码：至少 6 位
3. 点击注册 → 应显示绿色成功提示
4. 打开邮箱，点击验证链接
5. 前往 http://localhost:3000/auth/login，用同一邮箱和密码登录
6. 登录成功后跳转到首页，导航栏应显示「退出登录」

### 3. 验证数据库记录

回到 Supabase Dashboard → **Table Editor → profiles**，应看到刚注册用户的一条记录：
- `last_name`：王
- `first_name`：James
- `gender`：brother
- `role`：user

---

## 常见问题

**Q：`npx supabase link` 报错「project not found」**
A：检查 Project Reference 是否正确复制（不含空格）。

**Q：`npx supabase db push` 报错「password authentication failed」**
A：重新输入你在创建项目时设置的数据库密码（不是 Supabase 账号密码）。

**Q：注册后没有收到验证邮件**
A：Supabase 免费层有发送频率限制。检查垃圾邮件文件夹；也可以在 Dashboard → Authentication → Users 手动确认用户邮件。

**Q：登录后 profiles 表没有新记录**
A：说明触发器（trigger）没有正确运行。检查 `npx supabase db push` 是否成功，或在 Supabase SQL Editor 中手动执行 `supabase/migrations/20260515000000_initial.sql` 中的 trigger 部分。

---

完成以上步骤后，Phase 1（基础架构 + 用户认证）即全部完成，可以开始 Phase 2 的开发（代祷列表、详情页、发布功能等）。
