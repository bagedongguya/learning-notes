# 学习笔记平台部署指南（Vercel + Supabase）

> 代码已上传到 GitHub，部署过程中遇到问题请参考下面的诊断和修复步骤。

---

## 已部署后网页打不开的修复

### 快速诊断：访问 health 端点

打开浏览器访问：

```
https://note-platform-vercel.vercel.app/api/health
```

会看到类似下面的 JSON：

```json
{
  "status": "ok",
  "config": {
    "supabase_url": "❌ MISSING",
    "supabase_key": "❌ MISSING",
    "jwt_secret": "✅ configured",
    ...
  }
}
```

如果看到 `❌ MISSING`，说明**环境变量没设置**，跳到下面"补充环境变量"。

### 步骤1：补充环境变量（如果缺失）

1. 打开 https://vercel.com → 登录 → 进入你的项目
2. 点 **Settings** → **Environment Variables**
3. 添加 3 个变量：

   | Name | Value |
   |------|-------|
   | `SUPABASE_URL` | Supabase Project Settings → API → Project URL |
   | `SUPABASE_KEY` | Supabase Project Settings → API → anon public |
   | `JWT_SECRET` | 任意字符串，比如 `my_secret_2026` |

4. **保存后必须重新部署**（Vercel 改 env 不会自动重部署）

### 步骤2：强制重新部署

1. 在 Vercel 项目页面，点 **Deployments** 标签
2. 找到最近一次部署，点右边的 **⋯** → **Redeploy**
3. 等 1-2 分钟部署完成

### 步骤3：验证

1. 访问 `https://你的域名.vercel.app/` —— 应该看到登录/注册页面
2. 访问 `https://你的域名.vercel.app/api/health` —— 应该看到 3 个 ✅
3. 试注册一个账号，看能否成功

---

## 关于 Supabase 安全配置（你之前截图的那个页面）

截图中的 3 个选项：

- ✅ **启用数据API** — 必须勾选（否则无法调用 REST API）
- ✅ **自动暴露新表** — 勾选没问题（生产环境可以关闭）
- ❌ **启用自动RLS** — **不要勾选**（我们已经手动用 SQL 设置了 RLS 策略）

如果你已经创建项目，跳过这个页面，直接做下一步。

---

## 如果数据库还没建

打开 Supabase 项目 → 左侧菜单 **SQL Editor** → **New query**，粘贴并运行：

```sql
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  tags TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  word_count INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_notes_user ON notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_updated ON notes(updated_at DESC);
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on users" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on notes" ON notes FOR ALL USING (true) WITH CHECK (true);
```

---

## 部署文件架构

```
learning-notes/
├── api/
│   ├── _helpers.js      # 公共工具（JWT验证、Supabase REST调用）
│   ├── register.js      # POST /api/register
│   ├── login.js         # POST /api/login
│   ├── notes.js         # GET/POST /api/notes
│   ├── notes/[id].js    # PUT/DELETE /api/notes/:id
│   └── health.js        # GET /api/health（诊断用）
├── index.html           # 前端单页应用
├── package.json         # 依赖（bcryptjs, jsonwebtoken）
├── vercel.json          # 路由配置
└── supabase_init.sql    # 数据库建表脚本
```

后端用纯 Node.js fetch 调用 Supabase REST API（不依赖任何 SDK），最稳定。

---

## 常见问题

**Q: 部署成功但访问提示 500 错误？**
A: 看 Vercel → Deployments → 点对应部署 → Functions → 点对应函数 → 看 Logs

**Q: 注册提示 "Supabase not configured"？**
A: 环境变量没设，参考上面的"补充环境变量"

**Q: 数据库表已建但 API 调用报权限错误？**
A: 检查 RLS 策略是否创建成功。在 Supabase → Table Editor → 选 users 表 → 看 Policies 标签

**Q: 想要自己的域名？**
A: Vercel → Settings → Domains → 添加