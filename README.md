# Framee

**自托管的影视检索与播放平台**

基于 Next.js 14 App Router 构建，聚合多个影视资源站，提供豆瓣驱动的浏览、搜索、收藏与播放体验。

![Next.js](https://img.shields.io/badge/Next.js-14-000?logo=nextdotjs)

![React](https://img.shields.io/badge/React-18-61dafb?logo=react)

![TypeScript](https://img.shields.io/badge/TypeScript-4.9-3178c6?logo=typescript)

![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3-38bdf8?logo=tailwindcss)

![License](https://img.shields.io/badge/License-CC%20BY--NC--SA%204.0-lightgrey)



---

## ⚠️ 重要声明（请先阅读）

- 本项目**仅供学习与技术研究使用**，不得用于任何商业用途或公开服务。
- 本项目**不存储、不上传、不分发任何视频内容**，所有播放地址均来自第三方影视站点公开提供的 API 接口。如有侵权内容，请联系相应的内容提供方。
- 请勿在 B 站、小红书、微信公众号、抖音、今日头条等中国大陆社交平台发布视频或文章宣传本项目；不授权任何"科技周刊/月刊"类项目或站点收录本项目。
- 使用者须自行遵守所在地区的法律法规。因公开分享或使用本项目产生的任何法律风险及责任，由使用者自行承担。
- 本项目不提供任何形式的付费内容绕过手段。

---

## 目录

- [功能特性](#功能特性)
- [技术栈](#技术栈)
- [环境要求](#环境要求)
- [本地运行](#本地运行)
- [部署到 Vercel](#部署到-vercel)
- [用户账号与注册](#用户账号与注册)
- [Docker 部署](#docker-部署)
- [配置说明（config.json）](#配置说明configjson)
- [环境变量](#环境变量)
- [项目结构](#项目结构)
- [已知限制](#已知限制)
- [署名与许可](#署名与许可)

---

## 功能特性

### 浏览与发现

- **首页影院式布局** —— Hero 巨幕轮播、豆瓣热门推荐、继续观看记录。
- **豆瓣分类浏览** —— 电影 / 电视剧 / 综艺 / 纪录片等片单，支持类型、地区、年代、排序多级组合筛选。
- **自定义分类** —— 通过 `config.json` 的 `custom_category` 自行增删导航分类，构建期自动生效。
- **豆瓣日历** —— 按星期查看当季新番与剧集更新时间。

### 搜索

- **流式搜索** —— 结果边返回边渲染，无需等待全部资源站响应完成。
- **搜索建议** —— 输入时实时联想。
- **热门推荐** —— 搜索页展示基于站内热度的推荐内容。
- **聚合与排序** —— 多资源站结果去重合并，按相关性重排。

### 播放

- **ArtPlayer + HLS.js** —— 支持 HLS (m3u8) 流媒体播放。
- **多线路优选** —— 内置线路评分机制，自动挑选可用性更高的播放源。
- **详情页三级数据回退** —— 依次尝试服务端爬取、第三方 API、资源站 API，提升详情获取成功率。
- **内容预加载** —— 提前拉取相邻剧集，降低切换等待。
- **跳过片头片尾** —— 可配置的自动跳过规则。

### 个人数据

- **观看记录 / 收藏 / 搜索历史** —— 支持浏览器本地存储或 Redis 服务端存储。
- **滚动位置记忆** —— 从详情页返回列表时恢复原浏览位置。

### 管理与适配

- **管理后台** —— 站点配置、资源站管理、用户管理（需非 localstorage 模式）。
- **资源站连通性测试与自动排序** —— 在后台一键测试各 API 可用性。
- **多端适配** —— 针对手机、平板、桌面三档断点分别设计交互（移动端底部导航 / 平板抽屉侧栏 / 桌面常驻侧栏）。
- **PWA** —— 支持添加到主屏幕（详见[已知限制](#已知限制)）。

---

## 技术栈

| 分类  | 主要依赖                                                                                                  |
| --- | ----------------------------------------------------------------------------------------------------- |
| 框架  | [Next.js 14](https://nextjs.org/)（App Router）· React 18                                               |
| 语言  | TypeScript 4.9                                                                                        |
| 样式  | [Tailwind CSS 3](https://tailwindcss.com/) · next-themes（明暗主题）                                        |
| 播放器 | [ArtPlayer](https://github.com/zhw2590582/ArtPlayer) · [HLS.js](https://github.com/video-dev/hls.js/) |
| 动效  | framer-motion                                                                                         |
| 数据  | redis · @upstash/redis                                                                                |
| 抓取  | cheerio                                                                                               |
| 校验  | zod                                                                                                   |
| 部署  | Vercel · Docker · Netlify                                                                             |

---

## 环境要求

| 项目      | 要求                                                     |
| ------- | ------------------------------------------------------ |
| Node.js | **≥ 18.17.0**（Next.js 14 硬性要求）。推荐 Node 20 LTS 或 22 LTS |
| 包管理器    | **pnpm**（`packageManager` 字段锁定 `pnpm@10.14.0`）         |
| 操作系统    | 任意（Linux / macOS / Windows）                            |
| 浏览器     | 支持 HLS 的现代浏览器（Chrome / Edge / Safari / Firefox 最新版）    |

> 项目同时提供 `pnpm-lock.yaml`，请勿混用 npm / yarn 安装依赖，否则可能出现依赖树不一致。

安装 pnpm：

```bash
corepack enable
corepack prepare pnpm@10.14.0 --activate
# 或： npm i -g pnpm@10
```

---

## 本地运行

### 1. 获取代码

```bash
git clone <你的仓库地址> framee
cd framee
```

### 2. 配置环境变量

```bash
cp .env.example .env.local
```

然后编辑 `.env.local`，**至少填写 `PASSWORD`**：

```ini
PASSWORD=your-own-password
NEXT_PUBLIC_STORAGE_TYPE=localstorage
```

> ⚠️ 不填写 `PASSWORD` 时，所有页面会被重定向到 `/warning`，站点无法正常使用。

### 3. 安装依赖

```bash
pnpm install
```

### 4. 启动开发服务器

```bash
pnpm dev
```

访问 <http://localhost:3000>，使用你设置的 `PASSWORD` 登录。

### 5. 生产构建与本地预览

```bash
pnpm build
pnpm start
```

### 可用的 npm scripts

| 命令                  | 说明                                           |
| ------------------- | -------------------------------------------- |
| `pnpm dev`          | 生成运行时配置与 manifest，启动开发服务器                    |
| `pnpm build`        | 生产构建（含 `gen:runtime`、`gen:manifest` 两个前置步骤）  |
| `pnpm start`        | 以生产模式启动（需先 `pnpm build`）                     |
| `pnpm typecheck`    | TypeScript 类型检查（`tsc --noEmit`）              |
| `pnpm lint`         | ESLint 检查（**需先补齐 ESLint 配置**，见[已知限制](#已知限制)） |
| `pnpm format`       | Prettier 格式化                                 |
| `pnpm gen:runtime`  | 仅执行 `config.json` → `src/lib/runtime.ts` 的转换 |
| `pnpm gen:manifest` | 仅重新生成 `public/manifest.json`                 |

> **修改 `config.json` 后必须重新执行 `pnpm gen:runtime`**（`pnpm dev` 与 `pnpm build` 会自动执行），否则编译期不会读取到新配置。

---

## 部署到 Vercel

Vercel 是本项目最省事的部署方式。以下步骤以 **localstorage 模式**为主线（零额外服务依赖）。

### 1. 推送到 GitHub

确保仓库已包含 `.gitignore`（本仓库已提供），避免把 `node_modules/`、`.next/` 等产物提交上去。

```bash
git init
git add .
git commit -m "chore: initial commit"
git branch -M main
git remote add origin <你的仓库地址>
git push -u origin main
```

### 2. 在 Vercel 导入项目

1. 登录 [Vercel](https://vercel.com/)，点击 **Add New → Project**。
2. 选择你刚推送的仓库并导入。
3. **Framework Preset** 会自动识别为 Next.js，构建命令与输出目录保持默认即可。  
   （Vercel 会自动执行 `package.json` 中的 `build` 脚本，其中已包含 `gen:runtime` 与 `gen:manifest`。）

### 3. 配置环境变量

在 **Settings → Environment Variables** 中添加。**至少要配置以下三项**：

| 变量                         | 值              | 说明              |
| -------------------------- | -------------- | --------------- |
| `PASSWORD`                 | 你的访问密码         | **必填**，不填站点无法访问 |
| `NEXT_PUBLIC_STORAGE_TYPE` | `localstorage` | 存储方式            |
| `NEXT_PUBLIC_BASE_URL`     | `https://你的域名` | **搜索推荐功能依赖此项**  |

其余可选变量见[环境变量](#环境变量)一节。

> 所有 `NEXT_PUBLIC_` 开头的变量在**构建时**被内联进前端产物。修改后必须 **Redeploy** 才会生效。

### 4. 部署

点击 **Deploy**。首次构建约需 2–4 分钟。完成后即可通过 Vercel 分配的域名访问，也可以绑定自定义域名。

### 5. 部署后自检

部署完成后，建议依次确认：

- [ ] 未登录访问首页 → 应被重定向到 `/login`
- [ ] 使用 `PASSWORD` 能正常登录
- [ ] 首页、豆瓣页、搜索页能正常加载数据
- [ ] 播放页能正常起播
- [ ] 搜索页的"热门推荐"有内容（若为空，检查 `NEXT_PUBLIC_BASE_URL`）

### 可选：升级为 Upstash Redis（多账户 / 跨设备同步）

localstorage 模式下，记录只存在浏览器本地，且**管理后台不可用**。如果需要多账户与跨设备同步：

1. 完成上面的 localstorage 部署并能正常访问。
2. 在 [Upstash](https://upstash.com/) 注册并新建一个 Redis 实例（名称任意）。
3. 复制实例的 **HTTPS Endpoint** 与 **Token**。
4. 回到 Vercel 项目，新增环境变量：
   - `UPSTASH_URL` = 上一步的 Endpoint
   - `UPSTASH_TOKEN` = 上一步的 Token
   - `NEXT_PUBLIC_STORAGE_TYPE` = `upstash`
   - `USERNAME` = 超管用户名
   - `PASSWORD` = 超管密码
5. **Redeploy**。
6. （可选）若想让访客自己注册账号，再追加 `NEXT_PUBLIC_ENABLE_REGISTRATION=true`，详见[用户账号与注册](#用户账号与注册)。

---

## 用户账号与注册

### 两种账号体系

| 模式 | 登录方式 | 账号来源 | 数据归属 |
| --- | --- | --- | --- |
| `localstorage`（默认） | 只输入一个共享密码 | 不适用 | 浏览器本地 |
| `upstash` / `redis` | 用户名 + 密码 | 管理员后台创建，或访客自助注册 | 服务端，按用户名隔离 |

> 换句话说：**只有非 localstorage 模式才存在"用户"这个概念**。localstorage 模式下全站共用一个密码，记录存在浏览器里。

### 超管账号

超管由环境变量 `USERNAME` + `PASSWORD` 直接决定，**不经过数据库**，因此不需要（也无法通过）注册产生。登录时会先比对这两个环境变量，命中即授予 `owner` 角色。

### 开放自助注册

默认**关闭**。开启方式：

```ini
NEXT_PUBLIC_ENABLE_REGISTRATION=true
```

开启后登录页会出现「立即注册」入口。约束如下：

| 项目 | 规则 |
| --- | --- |
| 存储模式要求 | 必须为 `upstash` 或 `redis`；localstorage 下接口返回 400 |
| 用户名 | 3–32 字符，仅允许字母、数字、`_`、`-` |
| 密码 | 8–128 字符，需同时包含字母与数字（或符号） |
| 账号角色 | 固定为 `user`，**无法通过注册获得管理员权限** |
| 限流 | 每 IP 每小时最多成功注册 10 个账号 |

> ⚠️ 限流是**进程内存计数**。Docker 单实例下有效；Vercel 这类 serverless 环境下每个实例各持一份，只能挡住单实例上的连续尝试，**不能防御分布式滥用**。面向公网开放注册时，请额外配置 Vercel WAF 或 Upstash Ratelimit。

### 密码存储

用户密码以 **PBKDF2-SHA256（100,000 次迭代，随机盐）** 哈希后存储，数据库里不保存明文。存储格式为 `pbkdf2$<迭代次数>$<盐>$<哈希>`。

- 该前缀同时是版本标记：**改造前遗留的明文密码仍可正常登录**，并会在首次登录成功时自动升级为哈希，用户无感。
- 迭代次数写在存储串里，因此调整代码中的迭代次数**不会让存量密码失效**。

### 未开放注册时的建号方式

关闭自助注册后，账号只能由超管在 `/admin/user` 后台逐个创建（「添加用户」）。这适合家庭、小圈子等封闭场景。

---

## Docker 部署

Docker 部署支持自建 Redis，适合长期运行与内网使用。

### 使用 Docker Compose（Redis 版本，推荐）

`docker-compose.yml`：

```yaml
services:
  framee:
    build: .
    container_name: framee
    restart: unless-stopped
    ports:
      - '3000:3000'
    environment:
      - USERNAME=admin
      - PASSWORD=change-me-please
      - NEXT_PUBLIC_STORAGE_TYPE=redis
      - REDIS_URL=redis://framee-redis:6379
    networks:
      - framee-network
    depends_on:
      - framee-redis
    # 如需自定义配置，可挂载 config.json
    # volumes:
    #   - ./config.json:/app/config.json:ro

  framee-redis:
    image: redis:alpine
    container_name: framee-redis
    restart: unless-stopped
    networks:
      - framee-network
    # 如需持久化
    # volumes:
    #   - ./data:/data

networks:
  framee-network:
    driver: bridge
```

启动：

```bash
docker compose up -d --build
```

访问 <http://localhost:3000>。

### 存储支持矩阵

|      存储方式     | Docker | Vercel | Netlify |
| :-----------: | :----: | :----: | :-----: |
|  localstorage |    ✅   |    ✅   |    ✅    |
|    自建 Redis   |    ✅   |    ❌   |    ❌    |
| Upstash Redis |    ✅   |    ✅   |    ✅    |

> 除 localstorage 外，其他方式都支持多账户、记录同步与管理后台。

---

## 配置说明（config.json）

所有可自定义项集中在根目录的 `config.json`：

```json
{
  "cache_time": 7200,
  "api_site": {
    "dyttzy": {
      "api": "http://caiji.dyttzyapi.com/api.php/provide/vod",
      "name": "电影天堂资源",
      "detail": "http://caiji.dyttzyapi.com"
    }
  },
  "custom_category": [
    { "name": "华语", "type": "movie", "query": "华语" }
  ]
}
```

| 字段                | 说明          |
| ----------------- | ----------- |
| `cache_time`      | 接口缓存时间，单位秒  |
| `api_site`        | 资源站字典，可自由增删 |
| `custom_category` | 导航中的自定义分类   |

### `api_site` 字段

| 键            | 说明                                       |
| ------------ | ---------------------------------------- |
| `key`（对象的键名） | 唯一标识，建议使用小写字母与数字                         |
| `api`        | 资源站的 `vod` JSON API 根地址                  |
| `name`       | 界面上展示的名称                                 |
| `detail`     | （可选）部分站点无法通过 API 获取剧集详情时，提供网页详情根 URL 供爬取 |

接口格式遵循标准的苹果 CMS V10 API。

### `custom_category` 支持的分类

- **movie**：热门、最新、经典、豆瓣高分、冷门佳片、华语、欧美、韩国、日本、动作、喜剧、爱情、科幻、悬疑、恐怖、治愈
- **tv**：热门、美剧、英剧、韩剧、日剧、国产剧、港剧、日本动画、综艺、纪录片

> `custom_category` 以 `type` + `query` 作为唯一标识，请勿重复。

---

## 环境变量

完整清单与逐项说明见 [`.env.example`](./.env.example)。速查表：

| 变量                                    | 说明                       | 可选值                                                                                     | 默认值            |
| ------------------------------------- | ------------------------ | --------------------------------------------------------------------------------------- | -------------- |
| `PASSWORD`                            | **访问密码（必填）**             | 任意字符串                                                                                   | （空）            |
| `USERNAME`                            | 超管账号（仅非 localstorage 模式） | 任意字符串                                                                                   | （空）            |
| `NEXT_PUBLIC_SITE_NAME`               | 站点名称                     | 任意字符串                                                                                   | `Framee`       |
| `ANNOUNCEMENT`                        | 站点公告                     | 任意字符串                                                                                   | 内置默认文案         |
| `NEXT_PUBLIC_STORAGE_TYPE`            | 存储方式                     | `localstorage` / `redis` / `upstash`                                                    | `localstorage` |
| `REDIS_URL`                           | 自建 Redis 连接串             | 连接串                                                                                     | （空）            |
| `UPSTASH_URL`                         | Upstash Redis 连接串        | 连接串                                                                                     | （空）            |
| `UPSTASH_TOKEN`                       | Upstash Redis Token      | Token                                                                                   | （空）            |
| `NEXT_PUBLIC_ENABLE_REGISTRATION` | 开放用户自助注册（详见[用户账号与注册](#用户账号与注册)） | `true` / 不设置 | 不设置（关闭） |
| `NEXT_PUBLIC_SEARCH_MAX_PAGE`         | 搜索接口最大拉取页数               | `1`–`50`                                                                                | `5`            |
| `NEXT_PUBLIC_DOUBAN_PROXY_TYPE`       | 豆瓣数据请求方式                 | `direct` / `cors-proxy-zwei` / `cmliussss-cdn-tencent` / `cmliussss-cdn-ali` / `custom` | `direct`       |
| `NEXT_PUBLIC_DOUBAN_PROXY`            | 自定义豆瓣数据代理前缀              | URL 前缀                                                                                  | （空）            |
| `NEXT_PUBLIC_DOUBAN_IMAGE_PROXY_TYPE` | 豆瓣图片加载方式                 | `direct` / `server` / `img3` / `cmliussss-cdn-tencent` / `cmliussss-cdn-ali` / `custom` | `img3`         |
| `NEXT_PUBLIC_DOUBAN_IMAGE_PROXY`      | 自定义图片代理前缀                | URL 前缀                                                                                  | （空）            |
| `NEXT_PUBLIC_BASE_URL`                | 本站完整地址                   | `https://xxx.com`                                                                       | （空）            |


### 关于图片加载失败

若部署后出现大量海报加载异常，把 `NEXT_PUBLIC_DOUBAN_IMAGE_PROXY_TYPE` 改为 `direct` 或 `server` 后重新部署，通常即可恢复。

### 关于自定义豆瓣代理

若 `NEXT_PUBLIC_DOUBAN_PROXY_TYPE` 选择 `custom`，需要自行搭建一个 CORS 代理。仓库根目录的 `proxy.worker.js` 是一份可直接部署到 **Cloudflare Workers** 的通用代理实现，部署后把 Worker 地址填入 `NEXT_PUBLIC_DOUBAN_PROXY` 即可。

---

## 项目结构

```
.
├── config.json                 # 资源站与自定义分类配置
├── next.config.js              # Next.js 配置（含 PWA、SVG、图片策略）
├── tailwind.config.ts          # 设计系统：配色、字体、断点
├── vercel.json                 # Vercel 缓存头与定时任务
├── Dockerfile                  # 多阶段生产镜像
├── start.js                    # Docker 环境下的启动脚本（standalone + cron）
├── proxy.worker.js             # 可选：Cloudflare Workers 豆瓣代理
├── .env.example                # 环境变量示例
├── scripts/
│   ├── convert-config.js       # config.json → src/lib/runtime.ts
│   └── generate-manifest.js    # 生成 public/manifest.json
└── src/
    ├── middleware.ts           # 全站鉴权（HMAC 签名校验）
    ├── app/                    # App Router 页面与 API 路由
    │   ├── page.tsx            # 首页
    │   ├── detail/             # 详情页
    │   ├── play/               # 播放页
    │   ├── search/             # 搜索页
    │   ├── douban/             # 豆瓣分类浏览
    │   ├── history/            # 观看记录 / 收藏
    │   ├── login/ warning/     # 登录页 / 未配置密码提示页
    │   ├── admin/              # 管理后台（站点 / 资源站 / 用户）
    │   └── api/                # 后端 API 路由
    ├── components/             # UI 组件
    └── lib/                    # 数据层、工具函数、hooks
```

---

## 已知限制

请在部署前了解以下事项，它们都是当前代码的真实行为，不是配置问题。

### 1. 必须配置 `PASSWORD`


全站鉴权由 `src/middleware.ts` 统一处理。当 `PASSWORD` 为空时，middleware 会把所有页面重定向到 `/warning`。这是设计行为，不是 bug。

### 2. localstorage 模式下管理后台不可用

`NEXT_PUBLIC_STORAGE_TYPE=localstorage`（默认）时，6 个 `/api/admin/*` 接口会直接返回 400。因此：

- 无法使用管理后台修改站点配置、管理资源站与用户；
- 播放记录与收藏只保存在当前浏览器，换设备或清理浏览器数据即丢失。

如需这些能力，请切换到 Upstash Redis 或自建 Redis。

### 3. Vercel 不支持自建 Redis

`/api/admin/*` 等路由声明了 `runtime = 'edge'`，而 `redis` 是 Node.js 专用驱动，两者不兼容。Vercel 上请使用 `upstash`；自建 Redis 仅适用于 Docker 部署（Dockerfile 中已自动把 runtime 改写为 `nodejs`）。

### 4. PWA 离线能力受限

`public/sw.js` 未加入鉴权白名单，未登录状态下 Service Worker 的注册请求会被重定向到登录页，导致注册失败。表现是：

- 浏览器控制台可能出现 Service Worker 注册相关报错；
- "添加到主屏幕"后无法获得离线缓存能力。

网站在线访问不受影响。若需要完整的 PWA 体验，可在 `src/middleware.ts` 的 `shouldSkipAuth` 白名单中加入 `'/sw.js'` 与 `'/workbox-'`。

### 5. ESLint 尚未配置

仓库中未包含 `.eslintrc`，因此 `pnpm lint` / `next lint` 会进入交互式配置向导，在 CI 环境中会失败。`package.json` 中的 `lint-staged` 与 `prepare: husky install` 也因此不会实际生效。需要代码检查时，请先补齐 ESLint 配置。

### 6. 图片防盗链

豆瓣图片域名（`img*.doubanio.com`）按 `Referer` 校验。项目内所有 `<img>` 已统一设置 `referrerPolicy="no-referrer"`，请勿移除，否则海报会大面积 403。

### 7. 筛选维度受豆瓣 tag 词汇表约束

豆瓣分类的年份、年代、排序等筛选项，其取值必须落在豆瓣实际的 tag 词汇表内（例如年代必须写作 `90年代` 而非 `1990年代`）。写入不存在的词会得到空结果。相关白名单集中在 `src/lib/doubanFilters.ts`。

---

## 署名与许可

### 上游项目

本项目基于 [MoonTV](https://github.com/senshinya/MoonTV) 二次开发，并参考了 [LibreTV](https://github.com/LibreSpark/LibreTV) 的设计思路。在此向上游作者致谢。

若你基于本项目继续开发，请遵守许可证条款并保留本项目的署名与仓库地址。

### 许可证

本项目采用 **[CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/)**（署名 — 非商业性使用 — 相同方式共享 4.0 国际）许可协议，详见 [LICENSE](./LICENSE)。

这意味着你可以：

- ✅ 自由复制、分发、修改本项目
- ✅ 用于个人学习与研究

但你必须：

- 📌 **署名** —— 保留原作者署名与项目地址
- 📌 **非商业** —— 不得用于任何商业用途
- 📌 **相同方式共享** —— 基于本项目的衍生作品必须以相同协议发布

---

<div align="center">

**如果这个项目对你有帮助，欢迎点一个 ⭐ Star**

</div>
