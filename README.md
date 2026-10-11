# LOVE MENU 💕 情侣点菜（像素风网页版）

一方点菜，另一半实时看到"TA今天想吃什么"，一键"接单 → 上菜"。
像素卡通风格，手机浏览器直接用，也可以"添加到主屏幕"当 App 用。

不需要微信开发者认证，部署到 Vercel 后发个链接给另一半就行。

> **GitHub 整理版**：本仓库对应当前线上版本 <https://love-menu-web.vercel.app/>。
> 本地密钥、Vercel 绑定信息和依赖目录均未纳入仓库；首次部署请复制 `.env.example` 并填写自己的环境变量。

## 下厨房 🍳（食材配菜，灵感来自 [cook.yunyoujun.cn](https://cook.yunyoujun.cn/)）

- 60 道菜全部拆解成 **食材 + 调料 + 厨具 + 步骤**
- 勾选家里有的食材，实时匹配今天能做的菜：
  - **模糊搭配**：显示包含任一所选食材的菜，缺什么会用灰色虚线标出
  - **严格模式**（生存模式）：只显示用现有食材就能完成的菜
  - **厨具筛选**：只有烤箱/只有电饭煲也能找到能做的菜
- 点任意菜谱卡片查看完整做法，一键「加入今日菜单」告诉TA
- 点菜页每道菜左上角的 📖 也能直接翻菜谱

## 点菜小账本 📒

- 每天点的每道菜自动记账（谁点的、几点点的、有没有做成）
- 汇总统计：累计点菜数、做成上桌数、我和TA各点了多少
- 「我们的最爱」排行榜：点得最多的前三道菜 🥇🥈🥉
- 按天分组回看历史，最多保留最近 400 条
- 入口：首页底部的「我们的点菜小账本」卡片，或「我的」页面

## 拍照记录 📷

- 每道菜的卡片上都有「📷 拍照」按钮，手机上可以直接调相机或选相册
- 照片在前端自动压缩（长边 1280px / JPEG 72%，约 200KB 一张），存到 Vercel Blob（免费 1GB ≈ 5000 张）
- 今日菜单和小账本里都会显示缩略图，点开看大图
- 谁拍都行——做饭的人晒成品图最合适，上传后另一半会收到推送

## 推送通知 🔔

- TA 点菜 / 接单 / 上菜 / 晒图时，另一半手机会弹通知
- 开启入口：首页的「开启做饭提醒」卡片，或「我的」→ 提醒通知
- iPhone 需要先用 Safari「添加到主屏幕」，从桌面图标打开后再开启（iOS 16.4+）
- 安卓 Chrome 直接开启即可
- 技术：Web Push（VAPID）+ Service Worker，零第三方服务、零费用
- 部署自己的实例时需要生成 VAPID 密钥：`npx web-push generate-vapid-keys`，
  然后设置环境变量 `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT`（mailto:你的邮箱），
  并把公钥同步替换到 `app.js` 顶部的 `VAPID_PUBLIC_KEY` 常量；
  照片功能需要在 Vercel 项目里创建 Blob 存储（`vercel blob create-store <名字> --access public --yes`）

## 本地预览（不用部署）

直接双击 `index.html` 就能打开——此时是**本地演示模式**（顶部有黄色横幅提示），
所有功能可以体验，但数据只存在本机、无法双人同步。

## 部署到 Vercel（双人同步，全程免费）

1. 注册 [Vercel](https://vercel.com)（可以用 GitHub 账号直接登录）
2. 安装并部署：

   ```bash
   npm i -g vercel
   cd love-menu-web
   vercel login
   vercel --prod
   ```

   （或者把这个文件夹推到 GitHub，在 Vercel 网页上 Import 仓库，效果一样）

3. **连接数据库**（让两个人的数据同步的关键一步）：
   - 打开 Vercel 项目页 → **Storage** 标签 → **Create Database** → 选 **Upstash Redis**（免费档 Free 即可）
   - 创建后选择 **Connect to Project** 连到本项目，环境变量会自动注入
   - 回到 **Deployments** 标签，对最新部署点 **Redeploy** 让环境变量生效
4. 打开你的 `xxx.vercel.app` 网址——黄色横幅消失就说明数据库连接成功了
5. 把网址发给另一半：一方"创建邀请码"，另一方输入即绑定 💕

> 支持的环境变量名：`UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`
> （旧版 Vercel KV 的 `KV_REST_API_URL` / `KV_REST_API_TOKEN` 也兼容）

## 添加到手机主屏幕（像 App 一样）

- **iPhone**：Safari 打开网址 → 分享按钮 → "添加到主屏幕"
- **Android**：Chrome 打开网址 → 菜单 → "添加到主屏幕"

> ⚠️ iPhone 上"主屏幕 App"和 Safari 是两个独立存储空间，打开会像新用户。
> 用**迁移码**找回：旧的 Safari 里打开网站 →「我的」→「换设备 / 迁移账号」生成 6 位码，
> 再到主屏幕 App 里点「用迁移码找回账号」输入即可，绑定和记录原样恢复。
> 换手机、清缓存后也用同样方法。迁移码 30 分钟有效、一次性使用。

## 项目结构

```
love-menu-web/
├── index.html      # 页面骨架
├── style.css       # 像素风样式（配色、按钮、卡片都在这）
├── app.js          # 全部前端逻辑 + 像素精灵（点阵图用代码画的）
├── dishes.js       # 内置菜品目录（60 道菜，可随意增删改）
├── recipes.js      # 下厨房数据：食材目录 + 每道菜的食材/调料/厨具/步骤
└── api/index.js    # 唯一后端接口（Vercel Serverless + Upstash Redis）
```

## 自定义

- **改菜单**：编辑 `dishes.js`（点菜列表）；想让新菜也能在下厨房被匹配、能翻菜谱，
  照着格式在 `recipes.js` 的 `recipes` 里加一条同名菜谱即可
- **改配色**：`style.css` 顶部的 `:root` 变量（`--pink` 主题粉、`--cream` 奶油底、`--ink` 描边色）
- **改像素小人**：`app.js` 顶部的 `SPRITES` 点阵图——每个字符是一个像素，
  `.` 是透明，其他字母对应 `PAL` 里的颜色，像画十字绣一样直接改就行

## 关于 .exe

网页版对情侣更实用（两台手机都能用、随时打开）。如果以后想要桌面版，
可以用 Tauri/Electron 把这个网页原样打包成 .exe，功能不用改。
