# 部署与使用指南（给非程序员）

这是一个**个人专用**的英语口语训练网页应用。部署一次之后，你在手机、平板、电脑的浏览器里打开同一个网址就能用，还能"添加到主屏幕"像 App 一样。所有练习记录和错题会自动跨设备同步。

下面每一步都尽量具体。**全程不需要你写代码**，照着点就行。

---

## 你需要准备的三样东西

1. 一份 **AI 凭据**（提供 AI 反馈）。二选一：自己的 **Anthropic 账号**（方案 A），或公司提供的 **base URL + token**（方案 B，不必自购账号）。详见第 1 步。
2. 一个 **GitHub 账号**（免费，用来存放代码）。
3. 一个 **Vercel 账号**（免费，用来把网页跑在云端；可以用 GitHub 账号直接登录）。

---

## 第 1 步：准备 AI 凭据（方案 A / B 二选一）

应用用 Claude 给反馈。两种接法，挑一种：

### 方案 A — 自购 Anthropic 账号

1. 打开 <https://console.anthropic.com> 注册 / 登录。
2. 进入 **Billing（计费）**，绑定信用卡并充一点额度（例如 5 美元就够用很久）。
3. 进入 **API Keys**，点 **Create Key**，复制生成的那串 `sk-ant-...`，存好备用。

### 方案 B — 用公司提供的 base URL + token（不必自购账号）

如果公司给了你一个 Anthropic 兼容网关（一个 base URL + 一个 token），可以直接用它，省掉个人计费。**先用一条命令确认它能用**（把尖括号里的占位符换成你的）：

```bash
# 网关用 x-api-key 时：
curl -s "<BASE_URL>/v1/messages" \
  -H "x-api-key: <TOKEN>" -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{"model":"<模型名>","max_tokens":16,"messages":[{"role":"user","content":"hi"}]}'

# 如果公司说用 Bearer：把上面的  -H "x-api-key: <TOKEN>"  换成  -H "authorization: Bearer <TOKEN>"
```

返回一段含 `content` 的 JSON 就说明可用。记下三件事，第 3 步要填：① **base URL**；② token 该放 **x-api-key** 还是 **Bearer**；③ 能用的 **模型名**（若和官方 `claude-sonnet-4-6` 不一样）。

> 合规提醒：用公司资源跑个人项目前，请先确认公司允许这样用。

无论哪种方案，**凭据都只放在云端服务器的环境变量里，绝不会出现在网页前端。**

---

## 第 2 步：把代码放到 GitHub（私有仓库）

代码已经在你电脑上这个文件夹里，并且已经用 git 管理好了。把它推到 GitHub：

1. 打开 <https://github.com/new> 新建一个仓库：
   - 名字随便起，例如 `learning-english`。
   - 选择 **Private（私有）**。
   - **不要**勾选 "Add a README / .gitignore / license"（保持空仓库）。
   - 点 **Create repository**。
2. 创建后页面会给出几行命令。用 "…push an existing repository" 那一组。在这个项目文件夹里执行（把下面的网址换成你自己的）：

   ```bash
   git remote add origin https://github.com/你的用户名/learning-english.git
   git push -u origin main
   ```

> 如果你不想碰命令行，告诉我，我可以帮你用 `gh` 命令创建私有仓库并推上去。

---

## 第 3 步：在 Vercel 上部署

1. 打开 <https://vercel.com>，用 GitHub 账号登录。
2. 点 **Add New… → Project**，选中刚才那个 `learning-english` 仓库，点 **Import**。
3. 先**别急着点 Deploy**，先加数据库和环境变量：

   **加数据库（Neon Postgres）**
   - 在项目的 **Storage** 标签里，从 Marketplace 选 **Neon**，一键开通（免费档足够个人用）。
   - 开通后 Vercel 会自动注入 `DATABASE_URL`，你不用手填。

   **加文件存储（Vercel Blob，存音频用）**
   - 还是在 **Storage** 标签里，选 **Blob**，点 **Create**（免费档足够个人用）。
   - 开通后 Vercel 会自动注入 `BLOB_READ_WRITE_TOKEN`，你不用手填。课程音频会通过它从浏览器直接上传到云端，不占用网页函数的请求体上限。

   **填环境变量（Settings → Environment Variables）**

   先按第 1 步选的方案填 AI 凭据：

   - **方案 A**：`ANTHROPIC_API_KEY` = 你的 `sk-ant-...`。
   - **方案 B**：`ANTHROPIC_BASE_URL` = 公司 base URL；token 二选一——用 x-api-key 就填 `ANTHROPIC_API_KEY`，用 Bearer 就填 `ANTHROPIC_AUTH_TOKEN`；若模型名和官方不同，再填 `MODEL_FEEDBACK` 和 `MODEL_INGEST`（都填成那个可用模型名即可）。

   再填这两个（两种方案都要）：

   | 名称 | 值 |
   |------|----|
   | `APP_PASSWORD` | 你自己设定的登录密码（建议长一点，例如一句话） |
   | `SESSION_SECRET` | 一串随机字符串，用来给登录状态签名 |

   生成 `SESSION_SECRET` 的简单办法：在电脑终端运行 `openssl rand -base64 32`，把输出整段粘进去即可。

4. 回到 **Deployments**，点 **Deploy**。等一两分钟，部署成功后会给你一个网址，例如 `https://learning-english-xxxx.vercel.app`。

---

## 第 4 步：第一次初始化数据库（只做一次）

1. 打开你的网址，用第 3 步设的 `APP_PASSWORD` 登录。
2. 首页如果提示"第一次使用，先初始化数据库"，点一下 **初始化数据库** 按钮即可。
3. 看到上传区域出现，就说明一切就绪。

---

## 第 5 步：装到手机 / 平板主屏

- **iPhone / iPad（Safari）**：打开网址 → 点底部"分享"按钮 → **添加到主屏幕**。
- **安卓（Chrome）**：打开网址 → 右上角菜单 → **添加到主屏幕 / 安装应用**。

之后点主屏图标就能像 App 一样全屏打开。

---

## 日常怎么用

1. **上传字幕 + 音频**：在首页选一份字幕文件（`.lrc`，带 `[mm:ss.xx]` 时间戳）和对应的音频文件（`.m4a` / `.mp3`）上传，几十秒后会自动生成一节课（按句分段、逐段中文翻译、抽出固定搭配 + 高频可迁移句式）。**以后想加新材料，随时在应用里上传即可，不用改代码、不用重新部署。**
2. **进入课程，按五步练**：
   1. **读**：按句看双语字幕（固定搭配自动加粗），点 ▶ 直接播放该句的真实音频片段（可 0.75× 慢放）；下面的固定搭配还能点开当场练造句。
   2. **句式**：看本课抽出的高频句式和例句。
   3. **看着填**：照着句式说/写出完整一句，拿到"语法订正 + 地道改写"双反馈。
   4. **给意思自己说**：只看中文意思，自己把句式调出来（治"开口空白"）。
   5. **限时脱口**：限时挑战，先开口、别想太多。
3. **错题复习**：说得不够好的句子会自动收进"错题复习"，可以随时再练一次。

> 语音输入（🎤）在桌面 Chrome 上好用；iPhone 上经常不可靠，所以**任何时候都可以直接打字**，不影响练习。

---

## 关于费用

- Vercel、Neon 的免费档对个人使用足够。
- 主要花费是 Anthropic 的 AI 调用。已经做了 **prompt caching**（缓存系统提示），个人用量通常每天只有几美分。
- 如果想更省，可以把反馈模型切到更便宜的档（见 `lib/models.ts` 里的 `cheap`）。需要的话告诉我，我帮你改。

---

## 常见问题

- **登录后还是跳回登录页？** 多半是 `SESSION_SECRET` 没配或部署后没生效，去 Vercel 重新确认环境变量并重新部署。
- **上传后报"没能解析出足够的内容"？** 字幕文件需要是带 `[mm:ss.xx]` 时间戳的 `.lrc` 格式，纯文本无时间戳的不行。
- **音频上传失败？** 多半是没连 Blob 存储（`BLOB_READ_WRITE_TOKEN` 缺失），回到第 3 步在 Storage 里开通 Blob 后重新部署。
- **AI 反馈报错？** 检查 `ANTHROPIC_API_KEY` 是否填对、Anthropic 账户是否还有额度。
- **想换登录密码？** 在 Vercel 改 `APP_PASSWORD` 环境变量，然后重新部署。
