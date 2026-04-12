var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  Config: () => Config,
  apply: () => apply,
  inject: () => inject,
  name: () => name,
  usage: () => usage
});
module.exports = __toCommonJS(src_exports);
var import_koishi = require("koishi");
var name = "koishi-plugin-music-pick";
var inject = {
  required: ["http"],
  optional: ["puppeteer"]
};
var logger = new import_koishi.Logger(name);
var usage = `
## Met-API 点歌插件

基于可配置 API 的点歌插件。

### 主要功能
- 使用 \`点歌 [关键词]\` 指令搜索音乐。
- 支持通过序号选择歌曲，或使用 \`-n\` 选项直接点歌。
- 自动解析聊天中的 QQ 音乐卡片并进行点歌。
- 将歌曲信息以合并转发的形式发送，提供更佳的展示效果。
`;
var command_return_data_Field_default = [
  { data: "name", describe: "歌曲名称", type: "text", enable: true },
  { data: "artist", describe: "歌手", type: "text", enable: true },
  { data: "album", describe: "专辑", type: "text", enable: true },
  { data: "coverUrl", describe: "封面", type: "image", enable: true },
  { data: "musicUrl", describe: "下载链接", type: "audio", enable: true }
];
var Config = import_koishi.Schema.intersect([
  import_koishi.Schema.object({
    commandName: import_koishi.Schema.string().default("点歌").description("插件的核心指令名称。"),
    apilink: import_koishi.Schema.string().description("【必需】API 的域名，无需填写 `https://` 或路径。").required(),
    proxyUrl: import_koishi.Schema.string().role("link").default("").description("插件独立代理地址（可选），例如 `http://127.0.0.1:7890`。仅影响本插件内网络请求。"),
    waitTimeout: import_koishi.Schema.number().role("s").default(60).description("等待用户选择歌曲序号的超时时间（秒）。"),
    exitCommand: import_koishi.Schema.string().default("算了,不听了,退出").description("退出选择的指令，多个关键词用英文逗号隔开。"),
    searchLimit: import_koishi.Schema.number().min(1).max(20).default(10).description("单次搜索返回的歌曲列表长度。"),
    musicLevel: import_koishi.Schema.union(["HQ", "SQ", "RS", "DA", "QAI"]).role("radio").default("RS").description("下载链接音质"),
    retryCount: import_koishi.Schema.number().min(0).max(5).default(3).description("HTTP 请求失败时的最大重试次数。"),
    retryDelay: import_koishi.Schema.number().min(100).max(1e4).default(1e3).description("HTTP 请求重试间隔（毫秒）。")
  }).description("基础设置"),
  import_koishi.Schema.object({
    imageMode: import_koishi.Schema.boolean().default(true).description("是否以图片形式展示歌曲选择列表（需要 `puppeteer` 服务）。关闭则使用纯文本列表。"),
    darkMode: import_koishi.Schema.boolean().default(false).description("图片列表是否使用暗黑模式。"),
    cardBorderColor: import_koishi.Schema.string().default("#4CAF50").description("搜索列表图片卡片的边框颜色。")
  }).description("列表外观设置"),
  import_koishi.Schema.object({
    return_data_Field: import_koishi.Schema.array(import_koishi.Schema.object({
      data: import_koishi.Schema.string().description("返回的字段名"),
      describe: import_koishi.Schema.string().description("该字段的中文描述"),
      type: import_koishi.Schema.union(["text", "image", "audio", "video", "file"]).description("字段发送类型"),
      enable: import_koishi.Schema.boolean().default(true).description("是否启用该字段")
    })).role("table").default(command_return_data_Field_default).description("配置歌曲信息的返回格式和内容。")
  }).description("返回格式设置"),
  import_koishi.Schema.object({
    enableMiddleware: import_koishi.Schema.boolean().default(true).description("是否启用中间件，自动解析聊天中的QQ音乐卡片。"),
    isFigure: import_koishi.Schema.boolean().default(true).description("将歌曲信息以合并转发的形式发送（仅支持 OneBot v11 等协议）。").experimental()
  }).description("高级功能"),
  import_koishi.Schema.object({
    loggerInfo: import_koishi.Schema.boolean().default(false).description("是否在控制台打印详细日志，用于调试。")
  }).description("调试设置")
]);
function apply(ctx, config) {
  const customHeaders = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
  };
  const proxyConfig = (() => {
    if (!config.proxyUrl?.trim()) return void 0;
    try {
      const parsed = new URL(config.proxyUrl.trim());
      return {
        protocol: parsed.protocol.replace(":", ""),
        host: parsed.hostname,
        port: parsed.port ? Number(parsed.port) : parsed.protocol === "https:" ? 443 : 80,
        auth: parsed.username || parsed.password ? {
          username: decodeURIComponent(parsed.username || ""),
          password: decodeURIComponent(parsed.password || "")
        } : void 0
      };
    } catch (error) {
      logger.warn(`代理地址格式无效，将忽略代理设置: ${config.proxyUrl}`, error);
      return void 0;
    }
  })();
  function createHttpOptions(extra = {}) {
    return proxyConfig ? { ...extra, proxy: proxyConfig } : extra;
  }
  __name(createHttpOptions, "createHttpOptions");
  const retryCount = Math.max(0, config.retryCount ?? 3);
  const retryDelay = Math.max(100, config.retryDelay ?? 1e3);
  const sleep = /* @__PURE__ */ __name((ms) => new Promise((resolve) => setTimeout(resolve, ms)), "sleep");
  const shouldRetryError = /* @__PURE__ */ __name((error) => {
    const status = error?.response?.status;
    if (status === 403) return false; // 403 无意义重试，直接放弃
    if (status === 404) return false; // 404 同理
    if (typeof status === "number" && status >= 500) return true;
    return !status;
  }, "shouldRetryError");
  async function retryableGet(url, options, tag) {
    let lastError;
    for (let attempt = 0; attempt <= retryCount; attempt++) {
      try {
        return await ctx.http.get(url, options);
      } catch (error) {
        lastError = error;
        if (attempt >= retryCount || !shouldRetryError(error)) throw error;
        logger.warn(`[Retry] ${tag} 请求失败，第 ${attempt + 1}/${retryCount} 次重试:`, error?.message || error);
        await sleep(retryDelay);
      }
    }
    throw lastError;
  }
  __name(retryableGet, "retryableGet");
  function createMediaDownloadOptions(headers) {
    return createHttpOptions({
      responseType: "arraybuffer",
      headers,
      timeout: 3e4
    });
  }
  __name(createMediaDownloadOptions, "createMediaDownloadOptions");
  async function downloadMediaBuffer(url, tag) {
    const options = createMediaDownloadOptions(customHeaders);
    options.maxRedirects = 5;
    logger.info(`[${tag}] 开始下载: ${url}${proxyConfig ? ` (通过代理 ${config.proxyUrl})` : ""}`);
    const arrayBuffer = await retryableGet(url, options, tag);
    const buf = Buffer.from(arrayBuffer);
    if (!buf.length) {
      throw new Error("empty download body");
    }
    logger.info(`[${tag}] 下载成功，大小: ${buf.length} 字节`);
    return buf;
  }
  __name(downloadMediaBuffer, "downloadMediaBuffer");
  ctx.on("ready", async () => {
    if (config.enableMiddleware) {
      ctx.middleware(async (session, next) => {
        if (!config.enableMiddleware) return next();
        try {
          const elements = import_koishi.h.parse(session.content);
          for (const element of elements) {
            if (element.type === "json" && element.attrs?.data) {
              const data = JSON.parse(element.attrs.data);
              const musicMeta = data?.meta?.music;
              if (musicMeta?.tag?.includes("音乐")) {
                const title = musicMeta.title || "";
                const artist = musicMeta.desc || "";
                logInfo(`[Middleware] 检测到音乐卡片: ${title} - ${artist}`);
                await session.execute(`${config.commandName} -n 1 "${title} ${artist}"`);
                return;
              }
            }
          }
        } catch (error) {
          logger.warn("音乐卡片解析失败", error);
        }
        return next();
      });
    }
  });
  ctx.command(`${config.commandName} <keyword:text>`, "搜索和点播音乐。").option("number", "-n <value:posint>").action(async ({ session, options }, keyword) => {
    if (!config.apilink) {
      return "API 链接未配置，请联系管理员在插件配置中设置 `apilink`。";
    }
    if (!keyword) return "请输入要搜索的歌曲关键词。";
    if (!options.number) {
      await session.send("正在搜索，请稍候...");
    }
    let songs;
    try {
      const searchUrl = `https://${config.apilink}/api/web/cloudsearch?keywords=${encodeURIComponent(keyword)}&limit=${config.searchLimit}&type=1&offset=0`;
      logInfo(`[Request] Search URL: ${searchUrl}`);
      const response = await retryableGet(searchUrl, createHttpOptions({ headers: customHeaders }), "Search API");
      if (response.code !== 200 || !response.result?.songs?.length) {
        if (options.number) return;
        return "未能找到任何相关歌曲，请试试更换关键词。";
      }
      songs = response.result.songs;
    } catch (error) {
      logger.error("Search API request failed:", error);
      if (options.number) return;
      return "歌曲列表获取失败，可能是网络问题或API暂时不可用。";
    }
    let selectedSong;
    if (options.number) {
      if (options.number > 0 && options.number <= songs.length) {
        selectedSong = songs[options.number - 1];
      } else {
        return `序号无效。搜索结果共有 ${songs.length} 首歌曲。`;
      }
    } else {
      const songList = songs.map(
        (song) => `${song.name} - ${song.ar.map((a) => a.name).join("/")}`
      );
      const exitCommands = config.exitCommand.split(",");
      const prompt = `请在 ${config.waitTimeout} 秒内输入序号选择歌曲，输入“${exitCommands[0]}”可退出。`;
      if (config.imageMode) {
        if (!ctx.puppeteer) return "`puppeteer` 服务未启用，无法生成图片列表。";
        const image = await generateSongListImage(songList);
        if (!image) {
          return "歌曲列表图片生成失败，请检查后台日志。";
        }
        await session.send((0, import_koishi.h)("p", {}, [import_koishi.h.image(image, "image/png"), import_koishi.h.text(prompt)]));
      } else {
        const songListText = songList.map((song, index2) => `${index2 + 1}. ${song}`).join("\n");
        await session.send(`${songListText}

${prompt}`);
      }
      const userInput = await session.prompt(config.waitTimeout * 1e3);
      if (!userInput) return "选择超时，已自动退出点歌。";
      if (exitCommands.some((cmd) => userInput.trim() === cmd)) {
        return "已退出点歌。";
      }
      const index = parseInt(userInput, 10);
      if (isNaN(index) || index < 1 || index > songs.length) {
        return "无效的序号，请重新点歌。";
      }
      selectedSong = songs[index - 1];
    }
    let musicUrl;
    try {
      const level = (config.musicLevel || 'RS').toLowerCase();
      const urlApi = `https://${config.apilink}/api/web/song/url/v1?id=${selectedSong.id}&level=${level}&tamp=${Date.now()}`;
      ctx.logger.warn(urlApi);
      logInfo(`[Request] Song URL: ${urlApi}`);
      const response = await retryableGet(urlApi, createHttpOptions({ headers: customHeaders }), "Song URL API");
      if (response.code !== 200 || !response.data?.[0]?.url) {
        if (options.number) return;
        return "获取歌曲播放链接失败。";
      }
      musicUrl = response.data[0].url;
      logger.info(`[Song URL] 获取到音频链接: ${musicUrl}`);
    } catch (error) {
      logger.error("Song URL API request failed:", error);
      if (options.number) return;
      return "获取歌曲播放链接失败。";
    }
    const finalData = {
      name: selectedSong.name,
      artist: selectedSong.ar.map((a) => a.name).join("/"),
      album: selectedSong.al.name,
      coverUrl: selectedSong.al.picUrl,
      musicUrl
    };
    return generateResponse(session, finalData);
  });
  function logInfo(message) {
    if (config.loggerInfo) {
      logger.info(message);
    }
  }
  __name(logInfo, "logInfo");
  async function generateSongListImage(songs) {
    const styles = config.darkMode ? {
      bodyBg: "#2c2c2e",
      cardBg: "#1c1c1e",
      borderColor: config.cardBorderColor,
      titleColor: "#f5f5f7",
      textColor: "#e0e0e0",
      listNumberColor: "#888",
      listDivider: "rgba(255, 255, 255, 0.1)"
    } : {
      bodyBg: "#f0f2f5",
      cardBg: "white",
      borderColor: config.cardBorderColor,
      titleColor: "#333",
      textColor: "#555",
      listNumberColor: "#999",
      listDivider: "#eee"
    };
    const songListHtml = songs.map(
      (song, index) => `<li><span class="index">${index + 1}.</span> ${import_koishi.h.escape(song)}</li>`
    ).join("");
    const page = await ctx.puppeteer.page();
    try {
      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;700&family=Poppins:wght@500;700&display=swap" rel="stylesheet">
    <style>
        :root {
            /* 可以在这里调整主色调 */
            --primary-color: #6366f1; /* 蓝紫色 */
            --accent-color: #8b5cf6;  /* 紫色 */
            --bg-gradient: linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%);
        }

        body {
            font-family: 'Poppins', 'Noto Sans SC', sans-serif;
            background: var(--bg-gradient);
            margin: 0;
            padding: 40px;
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
        }

        .card {
            width: 480px;
            background: rgba(255, 255, 255, 0.95); /* 轻微透明 */
            border-radius: 24px;
            /* 更有层次的阴影 */
            box-shadow: 
                0 10px 30px -5px rgba(0, 0, 0, 0.1),
                0 4px 6px -2px rgba(0, 0, 0, 0.05);
            padding: 0;
            overflow: hidden;
            position: relative;
        }

        /* 顶部装饰条 */
        .card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 6px;
            background: linear-gradient(90deg, var(--primary-color), var(--accent-color));
        }

        .title {
            font-size: 22px;
            font-weight: 700;
            color: #1f2937;
            padding: 30px 30px 10px 30px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        /* 标题旁边加个小装饰图标 */
        .title::before {
            content: '🎵'; 
            font-size: 24px;
        }

        .song-list {
            list-style: none;
            padding: 10px 30px 35px 30px;
            margin: 0;
        }

        .song-list li {
            padding: 12px 0;
            border-bottom: 1px dashed rgba(0,0,0,0.08);
            display: flex;
            align-items: center;
            transition: all 0.2s;
        }

        .song-list li:last-child {
            border-bottom: none;
        }

        /* 序号样式美化 */
        .song-list .index {
            font-family: 'Poppins', sans-serif;
            font-weight: 600;
            font-size: 14px;
            color: var(--primary-color);
            background: rgba(99, 102, 241, 0.1);
            width: 28px;
            height: 28px;
            border-radius: 8px;
            display: flex;
            justify-content: center;
            align-items: center;
            margin-right: 15px;
            flex-shrink: 0;
        }

        .song-name {
            font-size: 16px;
            color: #374151;
            font-weight: 500;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
    </style>
</head>
<body>
    <div class="card">
        <div class="title">请选择歌曲</div>
        <ul class="song-list">
            <!-- 我假设 songListHtml 生成的内容包含简单的 li，如果包含结构可以调整 -->
            <!-- 这里为了演示效果，修改了 li 内部结构，你需要调整你的生成逻辑或样式匹配 -->
            ${songListHtml} 
        </ul>
    </div>
</body>
</html>`;
      await page.setContent(htmlContent, { waitUntil: "networkidle0" });
      const cardElement = await page.$(".card");
      if (!cardElement) {
        logger.warn("无法在 Puppeteer 页面中找到 .card 元素。");
        return null;
      }
      const image = await cardElement.screenshot({ encoding: "binary" });
      return image;
    } catch (error) {
      logger.error("生成图片时出错:", error);
      return null;
    } finally {
      await page.close();
    }
  }
  __name(generateSongListImage, "generateSongListImage");
  async function generateResponse(session, data) {
    const elements = [];
    const audioElements = [];
    for (const field of config.return_data_Field) {
      if (!field.enable || !data[field.data]) continue;
      const value = data[field.data];
      const describe = field.describe;
      switch (field.type) {
        case "text":
          elements.push(import_koishi.h.text(`${describe}: ${value}
`));
          break;
        case "image":
          elements.push(import_koishi.h.image(value));
          break;
        case "audio": {
          if (!proxyConfig) {
            logger.warn(`[Audio] 未配置 proxyUrl，音频 URL 在国内有访问限制，跳过音频发送。`);
            elements.push(import_koishi.h.text(`${describe}: 音频需配置国内代理方可下载，请联系管理员在插件配置中设置 \`proxyUrl\`。\n`));
            break;
          }
          try {
            logInfo(`[Audio] 开始下载音频: ${value}`);
            const buf = await downloadMediaBuffer(value, "Audio");
            logInfo(`[Audio] 下载完成，大小: ${buf.length} 字节`);
            let mimeType = "audio/mpeg";
            if (value.includes(".flac")) mimeType = "audio/flac";
            else if (value.includes(".ogg")) mimeType = "audio/ogg";
            else if (value.includes(".wav")) mimeType = "audio/wav";
            else if (value.includes(".m4a") || value.includes(".aac")) mimeType = "audio/mp4";
            
            // OneBot adapter requires string src (data URI or URL), cannot use Buffer directly
            const base64Url = `data:${mimeType};base64,${buf.toString("base64")}`;
            audioElements.push(import_koishi.h.audio(base64Url));
          } catch (e) {
            logger.warn(`音频下载失败:`, e?.message || e);
            elements.push(import_koishi.h.text(`${describe}: 音频下载失败（${e?.response?.status ? `HTTP ${e.response.status}` : e?.message || "未知错误"}），请检查代理配置是否正确。\n`));
          }
          break;
        }
        case "video":
          elements.push(import_koishi.h.video(value));
          break;
        case "file": {
          try {
            logInfo(`[File] 开始下载文件: ${value}`);
            const buf = await downloadMediaBuffer(value, "File");
            logInfo(`[File] 下载完成，大小: ${buf.length} 字节`);
            let ext = "mp3";
            try {
              const parsedPath = new URL(value).pathname;
              const match = parsedPath.match(/\.([a-z0-9]+)$/i);
              if (match) ext = match[1].toLowerCase();
            } catch (e) {}
            const filename = data.name && data.artist ? `${data.name} - ${data.artist}.${ext}` : `music.${ext}`;
            const base64Url = `data:application/octet-stream;base64,${buf.toString("base64")}`;
            audioElements.push((0, import_koishi.h)("file", { src: base64Url, title: filename, name: filename }));
          } catch (e) {
            const status = e?.response?.status;
            logger.warn(`文件下载失败(status=${status ?? "unknown"})，不发送下载地址:`, e?.response?.data || e?.message || e);
            elements.push(import_koishi.h.text(`${describe}: 下载失败，请稍后重试。\n`));
          }
          break;
        }
      }
    }
    if (config.isFigure && (session.platform === "onebot" || session.platform === "red")) {
      const nickname = session.author?.nickname || session.username || session.bot.nickname || session.bot.username;
      const userId = session.author?.userId || session.bot.selfId;
      const figureMessages = elements.map((el) => {
        return (0, import_koishi.h)("message", { userId, nickname }, el);
      });
      // 先发合并转发（文本/图片），再单独发音频
      if (figureMessages.length > 0) {
        await session.send((0, import_koishi.h)("figure", {}, figureMessages));
      }
      for (const audioEl of audioElements) {
        await session.send(audioEl);
      }
      return;
    } else {
      const allElements = [...elements, ...audioElements];
      return (0, import_koishi.h)("div", {}, allElements);
    }
  }
  __name(generateResponse, "generateResponse");
}
__name(apply, "apply");
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Config,
  apply,
  inject,
  name,
  usage
});
