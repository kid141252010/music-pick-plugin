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
var fileCache = new Map();
var inject = {
  required: ["http"],
  optional: ["puppeteer", "server"]
};
var logger = new import_koishi.Logger(name);
var sanitizeDownloadFilename = /* @__PURE__ */ __name((filename, fallback = "download.bin") => {
  const sanitized = String(filename || "").trim().replace(/[\u0000-\u001f\u007f]/g, "").replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, " ");
  return sanitized || fallback;
}, "sanitizeDownloadFilename");
var guessFilenameByMimeType = /* @__PURE__ */ __name((mimeType) => {
  const normalized = String(mimeType || "").toLowerCase().split(";")[0].trim();
  switch (normalized) {
    case "audio/mpeg":
      return "music.mp3";
    case "audio/flac":
      return "music.flac";
    case "audio/ogg":
      return "music.ogg";
    case "audio/wav":
      return "music.wav";
    case "audio/mp4":
      return "music.m4a";
    case "image/jpeg":
      return "image.jpg";
    case "image/png":
      return "image.png";
    case "application/pdf":
      return "file.pdf";
    case "application/zip":
      return "file.zip";
    default:
      return "file.bin";
  }
}, "guessFilenameByMimeType");
var createContentDisposition = /* @__PURE__ */ __name((filename) => {
  const safeFilename = sanitizeDownloadFilename(filename, "download.bin");
  const asciiFilename = safeFilename.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_").trim() || "download.bin";
  const encodedFilename = encodeURIComponent(safeFilename).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
  return `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodedFilename}`;
}, "createContentDisposition");
var usage = `
## Met-API 点歌插件

基于可配置 API 的点歌插件。

### 主要功能
- 使用 \`点歌 [关键词]\` 指令搜索音乐。
- 支持通过序号选择歌曲，或使用 \`-n\` 选项直接点歌。
- 支持同群并发点歌；同一用户重复发起会覆盖上一条待选请求。
- 自动解析聊天中的 QQ 音乐卡片并进行点歌。
- 默认并行搜索 MET + 网易云并自动去重（同名同歌手时 MET 优先）。
- 将歌曲信息以合并转发的形式发送，提供更佳的展示效果。
`;
var DEFAULT_SOURCE = "met";
var SOURCE_NETEASE = "netease";
var SEARCH_MODE_SINGLE = "single";
var SEARCH_MODE_MIXED = "mixed";
var NETEASE_LEVEL_MAP = {
  HQ: "higher",
  SQ: "lossless",
  RS: "hires",
  DA: "dolby",
  QAI: "hires"
};
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
    neteaseApiLink: import_koishi.Schema.string().default("").description("网易云 API 域名，可选。"),
    neteaseCookie: import_koishi.Schema.string().default("").description("网易云请求附带的 Cookie（可选），仅对网易云源生效。"),
    proxyUrl: import_koishi.Schema.string().role("link").default("").description("插件独立代理地址（可选），例如 `http://127.0.0.1:7890`。仅影响本插件内网络请求。"),
    waitTimeout: import_koishi.Schema.number().role("s").default(60).description("等待用户选择歌曲序号的超时时间（秒）。"),
    exitCommand: import_koishi.Schema.string().default("算了,不听了,退出").description("退出选择的指令，多个关键词用英文逗号隔开。"),
    searchLimit: import_koishi.Schema.number().min(1).max(20).default(10).description("单次搜索返回的歌曲列表长度。"),
    musicLevel: import_koishi.Schema.union(["HQ", "SQ", "RS", "DA", "QAI"]).role("radio").default("RS").description("下载链接音质"),
    retryCount: import_koishi.Schema.number().min(0).max(5).default(3).description("HTTP 请求失败时的最大重试次数。"),
    retryDelay: import_koishi.Schema.number().min(100).max(1e4).default(1e3).description("HTTP 请求重试间隔（毫秒）。"),
    sendRetryCount: import_koishi.Schema.number().min(0).max(8).default(5).description("消息发送失败时的最大重试次数。"),
    sendRetryDelay: import_koishi.Schema.number().min(100).max(1e4).default(1200).description("消息发送重试基础间隔（毫秒）。"),
    sendRetryBackoff: import_koishi.Schema.number().min(1).max(3).step(0.1).default(1.6).description("消息发送失败后的重试退避倍数。"),
    onebotResponseTimeout: import_koishi.Schema.number().role("time").min(3e4).max(6e5).default(18e4).description("OneBot 请求超时时间（毫秒），用于 download_file/upload_group_file 等动作。"),
    onebotDirectUploadThresholdMB: import_koishi.Schema.number().min(10).max(500).step(1).default(40).description("OneBot 大文件改为远程下载上传的阈值（MB）。超过该值时不再内联 base64。"),
    onebotStrictRemoteUpload: import_koishi.Schema.boolean().default(true).description("OneBot 大文件远程上传严格模式。开启后若无可用远程 URL 将直接报错，不回退为内联。"),
    onebotRemoteUploadBaseUrl: import_koishi.Schema.string().role("link").default("").description("OneBot 远程上传专用下载基址（可选）。当 OneBot 无法访问 server 插件的 selfUrl 时，可在这里填写 OneBot 实际可访问的地址，例如局域网地址或 `http://127.0.0.1:5140`。优先级高于 selfUrl。"),
    inlineMediaMaxSizeMB: import_koishi.Schema.number().min(1).max(200).step(1).default(8).description("媒体内联发送的最大体积（MB）。超出后自动降级为文本+下载链接。"),
    oversizeFallbackTip: import_koishi.Schema.string().default("文件体积较大，已改为发送下载链接。").description("媒体超限时的提示文案。")
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
  if (ctx.server) {
    const handleCachedMediaRequest = /* @__PURE__ */ __name((koaCtx) => {
      const data = fileCache.get(koaCtx.params.id);
      if (!data) {
        koaCtx.status = 404;
        koaCtx.body = "File not found or expired";
        return;
      }
      const downloadFilename = sanitizeDownloadFilename(data.filename || koaCtx.params.filename || koaCtx.query?.filename, guessFilenameByMimeType(data.mimeType));
      koaCtx.set("Content-Disposition", createContentDisposition(downloadFilename));
      koaCtx.set("Accept-Ranges", "bytes");
      koaCtx.set("X-Content-Type-Options", "nosniff");
      koaCtx.type = data.mimeType;
      koaCtx.body = data.buf;
      koaCtx.set("Content-Length", String(data.buf.length));
      koaCtx.set("Cache-Control", "no-store");
    }, "handleCachedMediaRequest");
    ctx.server.get("/music-pick/:id", handleCachedMediaRequest);
    ctx.server.get("/music-pick/:id/:filename", handleCachedMediaRequest);
  }
  const customHeaders = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
  };
  const neteaseCookie = String(config.neteaseCookie ?? "").trim();
  const createApiHeaders = /* @__PURE__ */ __name((source) => {
    if (source !== SOURCE_NETEASE || !neteaseCookie) return customHeaders;
    return {
      ...customHeaders,
      Cookie: neteaseCookie
    };
  }, "createApiHeaders");
  const rawProxyUrl = config.proxyUrl?.trim() || "";
  const isSocksProxy = rawProxyUrl && /^socks/i.test(rawProxyUrl);
  const proxyConfig = (() => {
    if (!rawProxyUrl || isSocksProxy) return void 0;
    try {
      const parsed = new URL(rawProxyUrl);
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
      logger.warn(`代理地址格式无效，将忽略代理设置: ${rawProxyUrl}`, error);
      return void 0;
    }
  })();
  // 尝试加载 undici（Koishi 运行时内置）为 API 请求提供全协议代理支持
  let undiciDispatcher = void 0;
  if (rawProxyUrl) {
    try {
      const { ProxyAgent } = require("undici");
      undiciDispatcher = new ProxyAgent(rawProxyUrl);
      logger.info(`[Proxy] 使用 undici ProxyAgent: ${rawProxyUrl}`);
    } catch (e) {
      if (isSocksProxy) {
        logger.warn(`[Proxy] undici 不可用，SOCKS5 代理对 API 请求不生效（下载不受影响）`);
      }
    }
  }
  function createHttpOptions(extra = {}) {
    if (!rawProxyUrl) return extra;
    if (undiciDispatcher) return { ...extra, dispatcher: undiciDispatcher };
    if (proxyConfig) return { ...extra, proxy: proxyConfig };
    return extra;
  }
  const retryCount = Math.max(0, config.retryCount ?? 3);
  const retryDelay = Math.max(100, config.retryDelay ?? 1e3);
  const sendRetryCount = Math.max(0, config.sendRetryCount ?? 5);
  const sendRetryDelay = Math.max(100, config.sendRetryDelay ?? 1200);
  const sendRetryBackoff = Math.min(3, Math.max(1, config.sendRetryBackoff ?? 1.6));
  const onebotResponseTimeout = Math.min(6e5, Math.max(3e4, config.onebotResponseTimeout ?? 18e4));
  const onebotDirectUploadThresholdMB = Math.min(500, Math.max(10, Math.floor(config.onebotDirectUploadThresholdMB ?? 40)));
  const onebotDirectUploadThresholdBytes = onebotDirectUploadThresholdMB * 1024 * 1024;
  const onebotStrictRemoteUpload = config.onebotStrictRemoteUpload !== false;
  const onebotRemoteUploadBaseUrl = String(config.onebotRemoteUploadBaseUrl ?? "").trim();
  const inlineMediaMaxSizeMB = Math.min(200, Math.max(1, Math.floor(config.inlineMediaMaxSizeMB ?? 8)));
  const inlineMediaMaxBytes = inlineMediaMaxSizeMB * 1024 * 1024;
  const oversizeFallbackTip = String(config.oversizeFallbackTip ?? "文件体积较大，已改为发送下载链接。").trim() || "文件体积较大，已改为发送下载链接。";
  const sleep = /* @__PURE__ */ __name((ms) => new Promise((resolve) => setTimeout(resolve, ms)), "sleep");
  const shouldRetryError = /* @__PURE__ */ __name((error) => {
    if (error?.code === "MEDIA_TOO_LARGE" || error?.noRetry) return false;
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
  const sendRetryableCodes = /* @__PURE__ */ new Set([
    "ETIMEDOUT",
    "ESOCKETTIMEDOUT",
    "ECONNRESET",
    "ECONNABORTED",
    "EPIPE",
    "EAI_AGAIN",
    "ENETDOWN",
    "ENETUNREACH",
    "ECONNREFUSED",
    "UND_ERR_CONNECT_TIMEOUT",
    "UND_ERR_HEADERS_TIMEOUT",
    "UND_ERR_BODY_TIMEOUT"
  ]);
  const shouldRetrySendError = /* @__PURE__ */ __name((error) => {
    const status = error?.response?.status ?? error?.status;
    const message = String(error?.message ?? error ?? "").toLowerCase();
    if (message.includes("upload_group_file") || message.includes("download_file")) {
      // 文件上传/下载是重操作，超时后保守处理，避免继续重试导致接口雪崩
      return false;
    }
    if (typeof status === "number") {
      if (status === 408 || status === 429) return true;
      if (status >= 500) return true;
    }
    const code = String(error?.code ?? error?.errno ?? "").toUpperCase();
    if (sendRetryableCodes.has(code)) return true;
    if (!message) return false;
    return [
      "timeout",
      "timed out",
      "socket hang up",
      "connection reset",
      "econnreset",
      "etimedout",
      "temporarily unavailable",
      "rate limit",
      "network error",
      "网络",
      "超时",
      "连接重置",
      "暂时不可用",
      "请求过于频繁"
    ].some((keyword) => message.includes(keyword));
  }, "shouldRetrySendError");
  async function retryableSend(session, content, tag) {
    let lastError;
    for (let attempt = 0; attempt <= sendRetryCount; attempt++) {
      try {
        return await session.send(content);
      } catch (error) {
        lastError = error;
        if (attempt >= sendRetryCount || !shouldRetrySendError(error)) throw error;
        const delay = Math.min(15e3, Math.round(sendRetryDelay * Math.pow(sendRetryBackoff, attempt)));
        logger.warn(`[Retry] ${tag} 发送失败，第 ${attempt + 1}/${sendRetryCount} 次重试，${delay}ms 后重试:`, error?.message || error);
        await sleep(delay);
      }
    }
    throw lastError;
  }
  __name(retryableSend, "retryableSend");
  const normalizeMessageIds = /* @__PURE__ */ __name((value) => {
    if (Array.isArray(value)) return value;
    if (typeof value === "string" && value) return [value];
    return [];
  }, "normalizeMessageIds");
  const isOneBotLikePlatform = /* @__PURE__ */ __name((platform) => platform === "onebot" || platform === "red", "isOneBotLikePlatform");
  function createMediaDownloadOptions(headers) {
    return createHttpOptions({
      responseType: "arraybuffer",
      headers,
      timeout: 3e4
    });
  }
  function createMediaTooLargeError(tag, size, limit, reason) {
    const err = new Error(`[${tag}] media too large: ${size} > ${limit}${reason ? ` (${reason})` : ""}`);
    err.code = "MEDIA_TOO_LARGE";
    err.noRetry = true;
    err.mediaSize = size;
    err.limit = limit;
    err.reason = reason;
    return err;
  }
  __name(createMediaTooLargeError, "createMediaTooLargeError");
  const formatSize = /* @__PURE__ */ __name((bytes) => {
    if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }, "formatSize");
  const isInvalidHostnameToken = /* @__PURE__ */ __name((hostname) => {
    const normalized = String(hostname || "").trim().toLowerCase();
    return !normalized || normalized === "undefined" || normalized === "null" || normalized === "nan";
  }, "isInvalidHostnameToken");
  const parseHttpUrl = /* @__PURE__ */ __name((url) => {
    if (!url || typeof url !== "string") return false;
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
      if (isInvalidHostnameToken(parsed.hostname)) return false;
      return parsed;
    } catch {
      return false;
    }
  }, "parseHttpUrl");
  const isHttpUrl = /* @__PURE__ */ __name((url) => {
    return !!parseHttpUrl(url);
  }, "isHttpUrl");
  const isLoopbackHostname = /* @__PURE__ */ __name((hostname) => {
    const normalized = String(hostname || "").toLowerCase();
    return !normalized || normalized === "localhost" || normalized === "127.0.0.1" || normalized === "0.0.0.0" || normalized === "::1" || normalized === "[::1]";
  }, "isLoopbackHostname");
  const trimSlashUrl = /* @__PURE__ */ __name((url) => String(url || "").replace(/\/+$/, ""), "trimSlashUrl");
  const resolveServerDownloadBaseUrl = /* @__PURE__ */ __name((options = {}) => {
    const requirePublic = !!options.requirePublic;
    const forOneBotRemoteUpload = !!options.forOneBotRemoteUpload;
    if (forOneBotRemoteUpload && onebotRemoteUploadBaseUrl) {
      const parsedRemoteBaseUrl = parseHttpUrl(onebotRemoteUploadBaseUrl);
      if (parsedRemoteBaseUrl) {
        return trimSlashUrl(parsedRemoteBaseUrl.href);
      }
      logger.warn(`[File] onebotRemoteUploadBaseUrl 无效，将忽略: ${onebotRemoteUploadBaseUrl}`);
    }
    const configuredSelfUrl = ctx.server?.config?.selfUrl;
    const parsedConfiguredSelfUrl = parseHttpUrl(configuredSelfUrl);
    if (parsedConfiguredSelfUrl) {
      const parsed = parsedConfiguredSelfUrl;
      if (!requirePublic || !isLoopbackHostname(parsed.hostname)) {
        return trimSlashUrl(parsed.href);
      }
    }
    const serverSelfUrl = ctx.server?.selfUrl;
    const parsedServerSelfUrl = parseHttpUrl(serverSelfUrl);
    if (parsedServerSelfUrl) {
      if (!requirePublic || !isLoopbackHostname(parsedServerSelfUrl.hostname)) {
        return trimSlashUrl(parsedServerSelfUrl.href);
      }
    }
    const koishiPort = ctx.server?.port || ctx.server?.config?.port || ctx.root?.config?.port || process.env.PORT || 5140;
    const koishiHost = ctx.server?.host || ctx.server?.config?.host || ctx.root?.config?.host || "127.0.0.1";
    const normalizedHost = isInvalidHostnameToken(koishiHost) ? "127.0.0.1" : String(koishiHost);
    const resolvedHost = normalizedHost === "0.0.0.0" ? "127.0.0.1" : normalizedHost;
    const normalizedPort = Number.parseInt(String(koishiPort || ""), 10);
    const resolvedPort = Number.isFinite(normalizedPort) && normalizedPort > 0 ? normalizedPort : 5140;
    const fallbackUrl = `http://${resolvedHost}:${resolvedPort}`;
    if (requirePublic) {
      const parsedFallbackUrl = parseHttpUrl(fallbackUrl);
      if (parsedFallbackUrl && !isLoopbackHostname(parsedFallbackUrl.hostname)) {
        return trimSlashUrl(parsedFallbackUrl.href);
      }
      return trimSlashUrl(fallbackUrl);
    }
    return fallbackUrl;
  }, "resolveServerDownloadBaseUrl");
  const isPublicHttpUrl = /* @__PURE__ */ __name((url) => {
    const parsed = parseHttpUrl(url);
    if (!parsed) return false;
    return !isLoopbackHostname(parsed.hostname);
  }, "isPublicHttpUrl");
  const createCachedMediaUrl = /* @__PURE__ */ __name((buf, mimeType = "application/octet-stream", filename = "", options = {}) => {
    if (!ctx.server) return "";
    const baseUrl = resolveServerDownloadBaseUrl(options);
    if (!baseUrl) return "";
    const id = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    const resolvedFilename = sanitizeDownloadFilename(filename, guessFilenameByMimeType(mimeType));
    fileCache.set(id, { buf, mimeType, filename: resolvedFilename });
    setTimeout(() => fileCache.delete(id), 5 * 60 * 1000);
    return `${baseUrl}/music-pick/${id}/${encodeURIComponent(resolvedFilename)}`;
  }, "createCachedMediaUrl");
  const selectRemoteUploadUrl = /* @__PURE__ */ __name((sourceUrl, buf, mimeType, filename, tag) => {
    const cachedUrl = createCachedMediaUrl(buf, mimeType, filename, { requirePublic: true, forOneBotRemoteUpload: true });
    if (cachedUrl) {
      logger.info(`[${tag}] 大文件远程上传使用插件缓存链接: ${cachedUrl}`);
      return cachedUrl;
    }
    if (isPublicHttpUrl(sourceUrl)) {
      logger.info(`[${tag}] 插件缓存链接不可用，回退使用原始直链: ${sourceUrl}`);
      return sourceUrl;
    }
    logger.info(`[${tag}] 未找到可用远程上传链接：请配置 OneBot 可访问的 selfUrl 或 onebotRemoteUploadBaseUrl。`);
    return "";
  }, "selectRemoteUploadUrl");
  __name(createHttpOptions, "createHttpOptions");
  async function _downloadMediaBuffer(url, tag, options = {}) {
    logger.info(`[${tag}] 开始下载: ${url}${rawProxyUrl ? ` (通过代理 ${rawProxyUrl})` : ""}`);
    let agent;
    if (rawProxyUrl) {
      if (isSocksProxy) {
        const { SocksProxyAgent } = require("socks-proxy-agent");
        agent = new SocksProxyAgent(rawProxyUrl);
      } else {
        const { HttpsProxyAgent } = require("https-proxy-agent");
        agent = new HttpsProxyAgent(rawProxyUrl);
      }
    }
    const maxBytes = Number.isFinite(options?.maxBytes) && options.maxBytes > 0 ? options.maxBytes : 0;
    return new Promise((resolve, reject) => {
      const parsed = new URL(url);
      const mod = parsed.protocol === "https:" ? require("node:https") : require("node:http");
      const reqOptions = {
        hostname: parsed.hostname,
        port: parsed.port || (parsed.protocol === "https:" ? 443 : 80),
        path: parsed.pathname + parsed.search,
        headers: customHeaders,
        timeout: 3e4,
        ...(agent ? { agent } : {})
      };
      let settled = false;
      const finish = (fn, value) => {
        if (settled) return;
        settled = true;
        fn(value);
      };
      const req = mod.get(reqOptions, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume();
          const nextUrl = new URL(res.headers.location, url).toString();
          _downloadMediaBuffer(nextUrl, tag, options).then(resolve).catch(reject);
          return;
        }
        if (res.statusCode < 200 || res.statusCode >= 300) {
          res.resume();
          const err = new Error(`HTTP ${res.statusCode}`);
          err.response = { status: res.statusCode };
          finish(reject, err);
          return;
        }
        const contentLength = Number.parseInt(String(res.headers["content-length"] || ""), 10);
        if (maxBytes > 0 && Number.isFinite(contentLength) && contentLength > maxBytes) {
          res.resume();
          req.destroy();
          finish(reject, createMediaTooLargeError(tag, contentLength, maxBytes, "content-length"));
          return;
        }
        const chunks = [];
        let total = 0;
        res.on("data", (chunk) => {
          if (settled) return;
          total += chunk.length;
          if (maxBytes > 0 && total > maxBytes) {
            res.destroy();
            req.destroy();
            finish(reject, createMediaTooLargeError(tag, total, maxBytes, "stream"));
            return;
          }
          chunks.push(chunk);
        });
        res.on("end", () => {
          if (settled) return;
          const buf = Buffer.concat(chunks);
          if (!buf.length) {
            finish(reject, new Error("empty download body"));
            return;
          }
          logger.info(`[${tag}] 下载成功，大小: ${buf.length} 字节`);
          finish(resolve, buf);
        });
        res.on("error", (error) => finish(reject, error));
        res.on("aborted", () => finish(reject, new Error("aborted")));
      });
      req.on("error", (error) => finish(reject, error));
      req.on("timeout", () => {
        req.destroy();
        finish(reject, new Error("download timeout"));
      });
    });
  }
  async function downloadMediaBuffer(url, tag, options = {}) {
    let lastError;
    for (let attempt = 0; attempt <= retryCount; attempt++) {
      try {
        return await _downloadMediaBuffer(url, tag, options);
      } catch (error) {
        lastError = error;
        if (attempt >= retryCount || !shouldRetryError(error)) throw error;
        logger.warn(`[Retry] ${tag} 下载失败，第 ${attempt + 1}/${retryCount} 次重试:`, error?.message || error);
        await sleep(retryDelay);
      }
    }
    throw lastError;
  }
  const pendingSongSelections = /* @__PURE__ */ new Map();
  const defaultExitCommands = String(config.exitCommand ?? "").split(",").map((cmd) => cmd.trim()).filter(Boolean);
  if (!defaultExitCommands.length) defaultExitCommands.push("退出");
  const normalizeApiBase = /* @__PURE__ */ __name((rawValue) => {
    const value = String(rawValue ?? "").trim();
    if (!value) return "";
    if (/^https?:\/\//i.test(value)) {
      return value.replace(/\/+$/, "");
    }
    return `https://${value.replace(/^\/+/, "").replace(/\/+$/, "")}`;
  }, "normalizeApiBase");
  const resolveRequestSource = /* @__PURE__ */ __name((options = {}) => {
    return options.netease163 || options.wyy ? SOURCE_NETEASE : DEFAULT_SOURCE;
  }, "resolveRequestSource");
  const resolveNeteaseLevel = /* @__PURE__ */ __name((quality) => {
    const normalized = String(quality || "").toUpperCase();
    return NETEASE_LEVEL_MAP[normalized] || "exhigh";
  }, "resolveNeteaseLevel");
  const getSearchApiUrl = /* @__PURE__ */ __name((source, keyword, limit = config.searchLimit) => {
    const safeLimit = Math.max(1, Number.parseInt(String(limit || config.searchLimit || 10), 10) || 10);
    if (source === SOURCE_NETEASE) {
      const neteaseBase = normalizeApiBase(config.neteaseApiLink);
      if (!neteaseBase) return "";
      return `${neteaseBase}/cloudsearch?keywords=${encodeURIComponent(keyword)}&limit=${safeLimit}&type=1&offset=0&randomCNIP=true`;
    }
    const metBase = normalizeApiBase(config.apilink);
    if (!metBase) return "";
    return `${metBase}/api/web/cloudsearch?keywords=${encodeURIComponent(keyword)}&limit=${safeLimit}&type=1&offset=0`;
  }, "getSearchApiUrl");
  const addSongSource = /* @__PURE__ */ __name((songs, source) => {
    return Array.isArray(songs) ? songs.map((song) => ({ ...song, source })) : [];
  }, "addSongSource");
  const normalizeSongIdentityPart = /* @__PURE__ */ __name((value) => {
    return String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  }, "normalizeSongIdentityPart");
  const buildSongDedupKey = /* @__PURE__ */ __name((song) => {
    const normalizedName = normalizeSongIdentityPart(song?.name);
    const normalizedArtists = (Array.isArray(song?.ar) ? song.ar : []).map((artist) => normalizeSongIdentityPart(artist?.name)).filter(Boolean).join("/");
    return `${normalizedName}::${normalizedArtists}`;
  }, "buildSongDedupKey");
  const mergeSongsWithMetPriority = /* @__PURE__ */ __name((metSongs, neteaseSongs) => {
    const mergedSongs = [];
    const seenKeys = /* @__PURE__ */ new Set();
    for (const song of metSongs) {
      const dedupKey = buildSongDedupKey(song);
      if (!dedupKey || seenKeys.has(dedupKey)) continue;
      seenKeys.add(dedupKey);
      mergedSongs.push(song);
    }
    for (const song of neteaseSongs) {
      const dedupKey = buildSongDedupKey(song);
      if (!dedupKey || seenKeys.has(dedupKey)) continue;
      seenKeys.add(dedupKey);
      mergedSongs.push(song);
    }
    return mergedSongs;
  }, "mergeSongsWithMetPriority");
  const getSongUrlApi = /* @__PURE__ */ __name((source, songId) => {
    if (source === SOURCE_NETEASE) {
      const neteaseBase = normalizeApiBase(config.neteaseApiLink);
      if (!neteaseBase) return "";
      const neteaseLevel = resolveNeteaseLevel(config.musicLevel);
      const osParam = neteaseLevel === "dolby" ? "&os=pc" : "";
      return `${neteaseBase}/song/url/v1?id=${songId}&level=${neteaseLevel}${osParam}&unblock=false&timestamp=${Date.now()}&randomCNIP=true`;
    }
    const metBase = normalizeApiBase(config.apilink);
    if (!metBase) return "";
    const metLevel = (config.musicLevel || "RS").toLowerCase();
    return `${metBase}/api/web/song/url/v1?id=${songId}&level=${metLevel}&tamp=${Date.now()}`;
  }, "getSongUrlApi");
  function getSessionScopeKey(session) {
    return session.fid || `${session.platform}:${session.channelId || ""}`;
  }
  __name(getSessionScopeKey, "getSessionScopeKey");
  function getRequesterUserKey(session) {
    return session.userId || session.author?.userId || session.username || session.author?.name || "unknown-user";
  }
  __name(getRequesterUserKey, "getRequesterUserKey");
  function getPendingSelectionKey(session) {
    return `${getSessionScopeKey(session)}:${getRequesterUserKey(session)}`;
  }
  __name(getPendingSelectionKey, "getPendingSelectionKey");
  function getRequesterTag(session) {
    const display = session.author?.nickname || session.author?.name || session.username || session.userId || "未知用户";
    const uid = session.userId || session.author?.userId;
    if (!uid || uid === display) return `【${display}】`;
    return `【${display}(${uid})】`;
  }
  __name(getRequesterTag, "getRequesterTag");
  const parseSessionInput = /* @__PURE__ */ __name((session) => {
    const strippedContent = session.stripped?.content;
    if (typeof strippedContent === "string" && strippedContent.trim()) {
      return strippedContent.trim();
    }
    const rawContent = session.content;
    if (typeof rawContent === "string" && rawContent.trim()) {
      return rawContent.trim();
    }
    return "";
  }, "parseSessionInput");
  const escapeRegExp = /* @__PURE__ */ __name((value) => {
    return String(value ?? "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }, "escapeRegExp");
  const extractRequestMetaFromRawInput = /* @__PURE__ */ __name((session, commandName) => {
    const rawInput = parseSessionInput(session);
    if (!rawInput) {
      return {
        keyword: "",
        forceNetease: false,
        number: void 0,
        hasLeadingNumberOption: false
      };
    }
    const normalizedCommandName = String(commandName ?? "").trim();
    const commandPrefixPattern = normalizedCommandName ? new RegExp(`^\\s*(?:[!/！。.]\\s*)?${escapeRegExp(normalizedCommandName)}(?:\\s+|$)`) : null;
    const remainingText = commandPrefixPattern ? rawInput.replace(commandPrefixPattern, "").trim() : rawInput.trim();
    if (!remainingText) {
      return {
        keyword: "",
        forceNetease: false,
        number: void 0,
        hasLeadingNumberOption: false
      };
    }
    const tokenMatches = Array.from(remainingText.matchAll(/\S+/g));
    if (!tokenMatches.length) {
      return {
        keyword: "",
        forceNetease: false,
        number: void 0,
        hasLeadingNumberOption: false
      };
    }
    let forceNetease = false;
    let hasLeadingNumberOption = false;
    let parsedNumber;
    let keywordStartTokenIndex = 0;
    while (keywordStartTokenIndex < tokenMatches.length) {
      const token = tokenMatches[keywordStartTokenIndex][0];
      if (token === "-163" || token === "-wyy") {
        forceNetease = true;
        keywordStartTokenIndex += 1;
        continue;
      }
      if (token === "-n") {
        hasLeadingNumberOption = true;
        keywordStartTokenIndex += 1;
        if (keywordStartTokenIndex < tokenMatches.length) {
          const rawNumberValue = tokenMatches[keywordStartTokenIndex][0];
          if (/^[1-9]\d*$/.test(rawNumberValue)) {
            parsedNumber = Number(rawNumberValue);
          }
          keywordStartTokenIndex += 1;
        }
        continue;
      }
      break;
    }
    const keywordStartCharIndex = keywordStartTokenIndex < tokenMatches.length ? tokenMatches[keywordStartTokenIndex].index ?? 0 : remainingText.length;
    return {
      keyword: remainingText.slice(keywordStartCharIndex).trim(),
      forceNetease,
      number: parsedNumber,
      hasLeadingNumberOption
    };
  }, "extractRequestMetaFromRawInput");
  async function takePendingSongSelection(pendingKey, options = {}) {
    const state = pendingSongSelections.get(pendingKey);
    if (!state) return null;
    if (options.expected && options.expected !== state) return null;
    pendingSongSelections.delete(pendingKey);
    if (state.timeout) {
      clearTimeout(state.timeout);
    }
    if (options.recallPrompt !== false && state.promptMsgIds?.length) {
      await safeRecall(state.session, state.promptMsgIds);
    }
    return state;
  }
  __name(takePendingSongSelection, "takePendingSongSelection");
  async function fetchSongsByKeyword(session, keyword, requesterTag, source, options = {}) {
    if (source !== SOURCE_NETEASE && !config.apilink) {
      return { error: `${requesterTag}API 链接未配置，请联系管理员在插件配置中设置 \`apilink\`。`, reason: "config-missing" };
    }
    if (source === SOURCE_NETEASE && !String(config.neteaseApiLink || "").trim()) {
      return { error: `${requesterTag}网易云源未配置，请联系管理员。`, reason: "config-missing" };
    }
    if (!keyword) {
      return { error: `${requesterTag}请输入要搜索的歌曲关键词。`, reason: "invalid-keyword" };
    }
    let searchMsgIds = [];
    if (options.showSearchHint) {
      try {
        searchMsgIds = normalizeMessageIds(await retryableSend(session, `${requesterTag}正在搜索，请稍候...`, "搜索提示"));
      } catch (error) {
        logger.warn("搜索提示消息发送失败，继续执行搜索流程:", error?.message || error);
      }
    }
    try {
      const searchUrl = getSearchApiUrl(source, keyword, options.limit);
      if (!searchUrl) {
        return { error: `${requesterTag}搜索服务未配置，请联系管理员。`, reason: "config-missing" };
      }
      logInfo(`[Request] Search URL: ${searchUrl}`);
      const response = await retryableGet(searchUrl, createHttpOptions({ headers: createApiHeaders(source) }), "Search API");
      if (response.code !== 200 || !response.result?.songs?.length) {
        return { error: `${requesterTag}未能找到任何相关歌曲，请试试更换关键词。`, reason: "no-result" };
      }
      return { songs: response.result.songs };
    } catch (error) {
      logger.error("Search API request failed:", error);
      return { error: `${requesterTag}歌曲列表获取失败，可能是网络问题或 API 暂时不可用。`, reason: "request-failed" };
    } finally {
      if (searchMsgIds.length) {
        await safeRecall(session, searchMsgIds);
      }
    }
  }
  __name(fetchSongsByKeyword, "fetchSongsByKeyword");
  async function fetchSongsByMixedSources(session, keyword, requesterTag, options = {}) {
    if (!keyword) {
      return { error: `${requesterTag}请输入要搜索的歌曲关键词。`, reason: "invalid-keyword" };
    }
    let searchMsgIds = [];
    if (options.showSearchHint) {
      try {
        searchMsgIds = normalizeMessageIds(await retryableSend(session, `${requesterTag}正在搜索，请稍候...`, "搜索提示"));
      } catch (error) {
        logger.warn("搜索提示消息发送失败，继续执行搜索流程:", error?.message || error);
      }
    }
    try {
      const [metResult, neteaseResult] = await Promise.all([
        fetchSongsByKeyword(session, keyword, requesterTag, DEFAULT_SOURCE, { limit: 5 }),
        fetchSongsByKeyword(session, keyword, requesterTag, SOURCE_NETEASE, { limit: 5 })
      ]);
      const metSongs = addSongSource((metResult.songs || []).slice(0, 5), DEFAULT_SOURCE);
      const neteaseSongs = addSongSource((neteaseResult.songs || []).slice(0, 5), SOURCE_NETEASE);
      const mergedSongs = mergeSongsWithMetPriority(metSongs, neteaseSongs);
      if (mergedSongs.length) {
        return { songs: mergedSongs };
      }
      const hasConfigMissingSource = metResult.reason === "config-missing" || neteaseResult.reason === "config-missing";
      if (hasConfigMissingSource) {
        return { error: `${requesterTag}双源不可用：某源未配置，请检查 MET/网易云配置。`, reason: "config-missing" };
      }
      const hasRequestFailedSource = metResult.reason === "request-failed" || neteaseResult.reason === "request-failed";
      if (hasRequestFailedSource) {
        return { error: `${requesterTag}双源不可用：某源暂不可用，请稍后重试。`, reason: "request-failed" };
      }
      const hasNoResultSource = metResult.reason === "no-result" || neteaseResult.reason === "no-result";
      if (hasNoResultSource) {
        return { error: `${requesterTag}未能找到任何相关歌曲，请试试更换关键词。`, reason: "no-result" };
      }
      return { error: `${requesterTag}双源搜索暂不可用，请检查 MET/网易云配置或稍后重试。`, reason: "sources-unavailable" };
    } finally {
      if (searchMsgIds.length) {
        await safeRecall(session, searchMsgIds);
      }
    }
  }
  __name(fetchSongsByMixedSources, "fetchSongsByMixedSources");
  async function fetchSongsForRequest(session, keyword, requesterTag, request, options = {}) {
    const source = request?.source === SOURCE_NETEASE ? SOURCE_NETEASE : DEFAULT_SOURCE;
    const searchMode = request?.searchMode === SEARCH_MODE_MIXED ? SEARCH_MODE_MIXED : SEARCH_MODE_SINGLE;
    if (searchMode === SEARCH_MODE_MIXED) {
      return fetchSongsByMixedSources(session, keyword, requesterTag, options);
    }
    const result = await fetchSongsByKeyword(session, keyword, requesterTag, source, options);
    if (result.error) return result;
    return { songs: addSongSource(result.songs || [], source) };
  }
  __name(fetchSongsForRequest, "fetchSongsForRequest");
  async function sendSongSelectionPrompt(session, requesterTag, songs) {
    const songList = songs.map((song) => `${song.name} - ${song.ar.map((a) => a.name).join("/")}`);
    const exitHint = defaultExitCommands[0] || "退出";
    const prompt = `${requesterTag}请在 ${config.waitTimeout} 秒内输入序号选择歌曲，输入"${exitHint}"可退出。`;
    let promptMsgIds = [];
    if (config.imageMode) {
      if (!ctx.puppeteer) return { error: `${requesterTag}\`puppeteer\` 服务未启用，无法生成图片列表。` };
      const image = await generateSongListImage(songList);
      if (!image) {
        return { error: `${requesterTag}歌曲列表图片生成失败，请检查后台日志。` };
      }
      try {
        promptMsgIds = normalizeMessageIds(await retryableSend(session, (0, import_koishi.h)("p", {}, [import_koishi.h.image(image, "image/png"), import_koishi.h.text(prompt)]), "歌曲选择列表图片"));
      } catch (error) {
        logger.error("歌曲选择列表图片发送失败:", error);
        return { error: `${requesterTag}发送歌曲选择列表失败，请稍后重试。` };
      }
    } else {
      const songListText = songList.map((song, index2) => `${index2 + 1}. ${song}`).join("\n");
      try {
        promptMsgIds = normalizeMessageIds(await retryableSend(session, `${requesterTag}候选歌曲如下：\n${songListText}\n\n${prompt}`, "歌曲选择列表文本"));
      } catch (error) {
        logger.error("歌曲选择列表文本发送失败:", error);
        return { error: `${requesterTag}发送歌曲选择列表失败，请稍后重试。` };
      }
    }
    return { promptMsgIds };
  }
  __name(sendSongSelectionPrompt, "sendSongSelectionPrompt");
  async function registerPendingSongSelection(session, requesterTag, keyword, songs, promptMsgIds) {
    const pendingKey = getPendingSelectionKey(session);
    const timeoutMs = Math.max(1, Number(config.waitTimeout) || 60) * 1e3;
    const pendingState = {
      session,
      requesterTag,
      keyword,
      songs,
      promptMsgIds,
      exitCommands: [...defaultExitCommands],
      timeout: null
    };
    pendingState.timeout = setTimeout(() => {
      void (async () => {
        const removed = await takePendingSongSelection(pendingKey, {
          expected: pendingState,
          recallPrompt: true
        });
        if (!removed) return;
        try {
          await retryableSend(removed.session, `${removed.requesterTag}选择超时，已自动退出点歌。`, "点歌选择超时提示");
        } catch (error) {
          logger.warn("点歌选择超时提示发送失败:", error?.message || error);
        }
      })();
    }, timeoutMs);
    pendingSongSelections.set(pendingKey, pendingState);
    logInfo(`[Pending] ${requesterTag} 等待选歌，key=${pendingKey}`);
  }
  __name(registerPendingSongSelection, "registerPendingSongSelection");
  async function beginInteractiveSongRequest(session, request) {
    const { keyword, requesterTag } = request;
    const pendingKey = getPendingSelectionKey(session);
    const previous = await takePendingSongSelection(pendingKey, { recallPrompt: true });
    if (previous) {
      try {
        await retryableSend(session, `${requesterTag}上一条点歌已被新的请求覆盖。`, "点歌覆盖提示");
      } catch (error) {
        logger.warn("点歌覆盖提示发送失败:", error?.message || error);
      }
    }
    const searchResult = await fetchSongsForRequest(session, keyword, requesterTag, request, { showSearchHint: true });
    if (searchResult.error) return searchResult.error;
    const songs = searchResult.songs;
    const promptResult = await sendSongSelectionPrompt(session, requesterTag, songs);
    if (promptResult.error) return promptResult.error;
    await registerPendingSongSelection(session, requesterTag, keyword, songs, promptResult.promptMsgIds || []);
    return;
  }
  __name(beginInteractiveSongRequest, "beginInteractiveSongRequest");
  async function resolveSelectedSongResponse(session, requesterTag, selectedSong) {
    const source = selectedSong?.source === SOURCE_NETEASE ? SOURCE_NETEASE : DEFAULT_SOURCE;
    let musicUrl;
    try {
      if (source === SOURCE_NETEASE && !String(config.neteaseApiLink || "").trim()) {
        return `${requesterTag}网易云源未配置，请联系管理员。`;
      }
      const urlApi = getSongUrlApi(source, selectedSong.id);
      if (!urlApi) {
        return `${requesterTag}歌曲链接服务未配置，请联系管理员。`;
      }
      logInfo(`[Request] Song URL: ${urlApi}`);
      const response = await retryableGet(urlApi, createHttpOptions({ headers: createApiHeaders(source) }), "Song URL API");
      if (response.code !== 200 || !response.data?.[0]?.url) {
        if (source === SOURCE_NETEASE) {
          return `${requesterTag}该歌曲暂无可用播放链接，可能暂无版权。`;
        }
        return `${requesterTag}获取歌曲播放链接失败。`;
      }
      musicUrl = response.data[0].url;
      logger.info(`[Song URL] 获取到音频链接: ${musicUrl}`);
    } catch (error) {
      logger.error("Song URL API request failed:", error);
      return `${requesterTag}获取歌曲播放链接失败。`;
    }
    const finalData = {
      name: selectedSong.name,
      artist: selectedSong.ar.map((a) => a.name).join("/"),
      album: selectedSong.al.name,
      coverUrl: selectedSong.al.picUrl,
      musicUrl
    };
    return generateResponse(session, finalData);
  }
  __name(resolveSelectedSongResponse, "resolveSelectedSongResponse");
  async function executeSongRequest(session, request) {
    const { keyword, number, requesterTag } = request;
    const source = request.source === SOURCE_NETEASE ? SOURCE_NETEASE : DEFAULT_SOURCE;
    const searchMode = request.searchMode === SEARCH_MODE_MIXED ? SEARCH_MODE_MIXED : SEARCH_MODE_SINGLE;
    const normalizedRequest = { ...request, source, searchMode };
    if (!number) {
      return beginInteractiveSongRequest(session, { ...normalizedRequest, keyword, requesterTag });
    }
    const searchResult = await fetchSongsForRequest(session, keyword, requesterTag, normalizedRequest);
    if (searchResult.error) return searchResult.error;
    const songs = searchResult.songs;
    if (number <= 0 || number > songs.length) {
      return `${requesterTag}序号无效。搜索结果共有 ${songs.length} 首歌曲。`;
    }
    return resolveSelectedSongResponse(session, requesterTag, songs[number - 1]);
  }
  __name(executeSongRequest, "executeSongRequest");
  ctx.middleware(async (session, next) => {
    const pendingKey = getPendingSelectionKey(session);
    const pending = pendingSongSelections.get(pendingKey);
    if (!pending) return next();
    const userInput = parseSessionInput(session);
    if (!userInput) return next();
    if (pending.exitCommands.some((cmd) => userInput === cmd)) {
      await takePendingSongSelection(pendingKey, { expected: pending, recallPrompt: true });
      try {
        await retryableSend(session, `${pending.requesterTag}已退出点歌。`, "点歌退出提示");
      } catch (error) {
        logger.warn("点歌退出提示发送失败:", error?.message || error);
      }
      return;
    }
    if (!/^\d+$/.test(userInput)) return next();
    const removed = await takePendingSongSelection(pendingKey, { expected: pending, recallPrompt: true });
    if (!removed) return next();
    const index = parseInt(userInput, 10);
    if (isNaN(index) || index < 1 || index > removed.songs.length) {
      try {
        await retryableSend(session, `${removed.requesterTag}无效的序号，请重新点歌。`, "点歌序号错误提示");
      } catch (error) {
        logger.warn("点歌序号错误提示发送失败:", error?.message || error);
      }
      return;
    }
    try {
      const result = await resolveSelectedSongResponse(session, removed.requesterTag, removed.songs[index - 1]);
      if (result) {
        await retryableSend(session, result, "点歌结果");
      }
    } catch (error) {
      logger.error("点歌选择处理失败:", error);
      const fallback = `${removed.requesterTag}点歌处理失败，请稍后重试。`;
      try {
        await retryableSend(session, fallback, "点歌选择错误提示");
      } catch (sendError) {
        logger.error("点歌选择错误提示发送失败:", sendError);
      }
    }
    return;
  });
  ctx.on("ready", async () => {
    for (const bot of Object.values(ctx.bots)) {
      if (!isOneBotLikePlatform(bot.platform)) continue;
      const current = Number(bot?.config?.responseTimeout);
      if (!Number.isFinite(current) || current >= onebotResponseTimeout) continue;
      try {
        bot.config.responseTimeout = onebotResponseTimeout;
        logger.info(`[Timeout] 已将 ${bot.selfId}(${bot.platform}) responseTimeout 从 ${current}ms 调整为 ${onebotResponseTimeout}ms`);
      } catch (error) {
        logger.warn(`[Timeout] 无法调整 ${bot.selfId}(${bot.platform}) responseTimeout`, error?.message || error);
      }
    }
    if (config.enableMiddleware) {
      ctx.middleware(async (session, next) => {
        if (!config.enableMiddleware) return next();
        try {
          const elements = import_koishi.h.parse(session.content);
          for (const element of elements) {
            if (element.type === "json" && element.attrs?.data) {
              const data = JSON.parse(element.attrs.data);
              const musicMeta = data?.meta?.music;
              const musicTag = typeof musicMeta?.tag === "string" ? musicMeta.tag : "";
              if (musicTag.includes("音乐")) {
                const title = musicMeta.title || "";
                const artist = musicMeta.desc || "";
                const keyword = `${title} ${artist}`.trim();
                if (!keyword) break;
                const source = musicTag.includes("网易云") ? SOURCE_NETEASE : DEFAULT_SOURCE;
                const requesterTag = getRequesterTag(session);
                logInfo(`[Middleware] 检测到音乐卡片: ${title} - ${artist} | tag=${musicTag || "unknown"} | source=${source}`);
                try {
                  const result = await executeSongRequest(session, {
                    keyword,
                    number: 1,
                    source,
                    requesterTag
                  });
                  if (result) {
                    await retryableSend(session, result, "点歌结果");
                  }
                } catch (error) {
                  logger.error("音乐卡片点歌处理失败:", error);
                  const fallback = `${requesterTag}点歌处理失败，请稍后重试。`;
                  try {
                    await retryableSend(session, fallback, "音乐卡片点歌错误提示");
                  } catch (sendError) {
                    logger.error("音乐卡片点歌错误提示发送失败:", sendError);
                  }
                }
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
  async function safeRecall(session, messageIds) {
    if (!messageIds || !messageIds.length) return;
    for (const id of messageIds) {
      try {
        await session.bot.deleteMessage(session.channelId, id);
      } catch (e) {
        // 忽略撤回失败
      }
    }
  }
  __name(safeRecall, "safeRecall");

  ctx.command(`${config.commandName} <keyword:text>`, "搜索和点播音乐。").option("number", "-n <value:posint>").option("netease163", "-163").option("wyy", "-wyy").action(async ({ session, options }, keyword) => {
    const requesterTag = getRequesterTag(session);
    const parsedKeyword = typeof keyword === "string" ? keyword.trim() : "";
    const rawMeta = extractRequestMetaFromRawInput(session, config.commandName);
    const resolvedKeyword = parsedKeyword || rawMeta.keyword;
    const forceNetease = rawMeta.forceNetease || options.netease163 || options.wyy;
    const source = forceNetease ? SOURCE_NETEASE : DEFAULT_SOURCE;
    const searchMode = forceNetease ? SEARCH_MODE_SINGLE : SEARCH_MODE_MIXED;
    const canTrustParsedNumber = parsedKeyword && parsedKeyword === rawMeta.keyword && !rawMeta.hasLeadingNumberOption;
    const number = typeof rawMeta.number === "number" ? rawMeta.number : canTrustParsedNumber ? options.number : void 0;
    return executeSongRequest(session, {
      keyword: resolvedKeyword,
      number,
      source,
      searchMode,
      requesterTag
    });
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
    const oneBotLike = isOneBotLikePlatform(session.platform);
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
          if (!rawProxyUrl) {
            logger.warn(`[Audio] 未配置 proxyUrl，音频 URL 在国内有访问限制，跳过音频发送。`);
            elements.push(import_koishi.h.text(`${describe}: 音频需配置国内代理方可下载，请联系管理员在插件配置中设置 \`proxyUrl\`。\n`));
            break;
          }
          try {
            logInfo(`[Audio] 开始下载音频: ${value}`);
            const actualMaxBytes = ctx.server ? 200 * 1024 * 1024 : inlineMediaMaxBytes;
            const buf = await downloadMediaBuffer(value, "Audio", { maxBytes: actualMaxBytes });
            logInfo(`[Audio] 下载完成，大小: ${buf.length} 字节`);
            let mimeType = "audio/mpeg";
            if (value.includes(".flac")) mimeType = "audio/flac";
            else if (value.includes(".ogg")) mimeType = "audio/ogg";
            else if (value.includes(".wav")) mimeType = "audio/wav";
            else if (value.includes(".m4a") || value.includes(".aac")) mimeType = "audio/mp4";
            const safeName = (data.name || "").replace(/[\\/:*?"<>|]/g, "_");
            const safeArtist = (data.artist || "").replace(/[\\/:*?"<>|]/g, "_");
            const audioExt = value.includes(".flac") ? "flac" : value.includes(".ogg") ? "ogg" : value.includes(".wav") ? "wav" : value.includes(".m4a") || value.includes(".aac") ? "m4a" : "mp3";
            const audioFilename = safeName && safeArtist ? `${safeName} - ${safeArtist}.${audioExt}` : `music.${audioExt}`;

            let fileUrl;
            if (oneBotLike && buf.length > onebotDirectUploadThresholdBytes) {
              const remoteUrl = selectRemoteUploadUrl(value, buf, mimeType, audioFilename, "Audio");
              if (!remoteUrl) {
                const failMsg = `[Audio] 大文件(${formatSize(buf.length)})远程上传失败：请配置 OneBot 可访问的 selfUrl 或 onebotRemoteUploadBaseUrl。`;
                if (onebotStrictRemoteUpload) {
                  throw new Error(failMsg);
                }
                logger.warn(failMsg);
                elements.push(import_koishi.h.text(`${describe}: ${oversizeFallbackTip}（大小 ${formatSize(buf.length)}，阈值 ${formatSize(onebotDirectUploadThresholdBytes)}）\n下载链接: ${value}\n`));
                break;
              }
              logInfo(`[Audio] 大文件使用 OneBot 远程上传: ${remoteUrl}`);
              audioElements.push((0, import_koishi.h)("file", { src: remoteUrl, title: audioFilename, name: audioFilename }));
              break;
            } else if (oneBotLike) {
              fileUrl = `base64://${buf.toString("base64")}`;
            } else if (ctx.server && buf.length > inlineMediaMaxBytes) {
              fileUrl = createCachedMediaUrl(buf, mimeType, audioFilename);
              if (!fileUrl) {
                logger.warn(`[Audio] 文件超过内联阈值，但未配置可被 OneBot 访问的下载地址（selfUrl / onebotRemoteUploadBaseUrl），降级为文本链接发送。`);
                elements.push(import_koishi.h.text(`${describe}: ${oversizeFallbackTip}（大小 ${formatSize(buf.length)}，阈值 ${formatSize(inlineMediaMaxBytes)}）\n下载链接: ${value}\n`));
                break;
              }
            } else {
              fileUrl = `data:${mimeType};base64,${buf.toString("base64")}`;
            }
            audioElements.push(import_koishi.h.audio(fileUrl, mimeType));
          } catch (e) {
            if (e?.code === "MEDIA_TOO_LARGE") {
              logInfo(`[Audio] 命中超限降级，size=${e?.mediaSize ?? "unknown"} limit=${e?.limit ?? inlineMediaMaxBytes}`);
              elements.push(import_koishi.h.text(`${describe}: ${oversizeFallbackTip}（大小 ${formatSize(e?.mediaSize || 0)}，阈值 ${formatSize(e?.limit || inlineMediaMaxBytes)}）\n下载链接: ${value}\n`));
            } else {
              logger.warn(`音频下载失败:`, e?.message || e);
              elements.push(import_koishi.h.text(`${describe}: 音频下载失败（${e?.response?.status ? `HTTP ${e.response.status}` : e?.message || "未知错误"}），请检查代理配置是否正确。\n`));
            }
          }
          break;
        }
        case "video":
          elements.push(import_koishi.h.video(value));
          break;
        case "file": {
          let ext = "mp3";
          try {
            const parsedPath = new URL(value).pathname;
            const match = parsedPath.match(/\.([a-z0-9]+)$/i);
            if (match) ext = match[1].toLowerCase();
          } catch (e) {}
          const safeName = (data.name || "").replace(/[\\/:*?"<>|]/g, "_");
          const safeArtist = (data.artist || "").replace(/[\\/:*?"<>|]/g, "_");
          const filename = safeName && safeArtist ? `${safeName} - ${safeArtist}.${ext}` : `music.${ext}`;
          if (!rawProxyUrl) {
            logger.warn(`[File] 未配置 proxyUrl，文件 URL 在国内有访问限制，跳过文件发送。`);
            elements.push(import_koishi.h.text(`${describe}: 文件需配置国内代理方可下载，请联系管理员在插件配置中设置 \`proxyUrl\`。\n`));
            break;
          }
          try {
            logInfo(`[File] 开始下载文件: ${value}`);
            const actualMaxBytes = ctx.server ? 200 * 1024 * 1024 : inlineMediaMaxBytes;
            const buf = await downloadMediaBuffer(value, "File", { maxBytes: actualMaxBytes });
            logInfo(`[File] 下载完成，大小: ${buf.length} 字节`);
            
            let fileUrl;
            if (oneBotLike && buf.length > onebotDirectUploadThresholdBytes) {
              const remoteUrl = selectRemoteUploadUrl(value, buf, "application/octet-stream", filename, "File");
              if (!remoteUrl) {
                const failMsg = `[File] 大文件(${formatSize(buf.length)})远程上传失败：请配置 OneBot 可访问的 selfUrl 或 onebotRemoteUploadBaseUrl。`;
                if (onebotStrictRemoteUpload) {
                  throw new Error(failMsg);
                }
                logger.warn(failMsg);
                elements.push(import_koishi.h.text(`${describe}: ${oversizeFallbackTip}（文件 ${filename}，大小 ${formatSize(buf.length)}，阈值 ${formatSize(onebotDirectUploadThresholdBytes)}）\n下载链接: ${value}\n`));
                break;
              }
              logInfo(`[File] 大文件使用 OneBot 远程上传: ${remoteUrl}`);
              audioElements.push((0, import_koishi.h)("file", { src: remoteUrl, title: filename, name: filename }));
              break;
            } else if (oneBotLike) {
              fileUrl = `base64://${buf.toString("base64")}`;
            } else if (ctx.server && buf.length > inlineMediaMaxBytes) {
              fileUrl = createCachedMediaUrl(buf, "application/octet-stream", filename);
              if (!fileUrl) {
                logger.warn(`[File] 文件超过内联阈值，但未配置可被 OneBot 访问的下载地址（selfUrl / onebotRemoteUploadBaseUrl），降级为文本链接发送。`);
                elements.push(import_koishi.h.text(`${describe}: ${oversizeFallbackTip}（文件 ${filename}，大小 ${formatSize(buf.length)}，阈值 ${formatSize(inlineMediaMaxBytes)}）\n下载链接: ${value}\n`));
                break;
              }
            } else {
              fileUrl = `data:application/octet-stream;base64,${buf.toString("base64")}`;
            }
            logInfo(`[File] 使用内联文件源发送: ${filename}`);
            audioElements.push((0, import_koishi.h)("file", { src: fileUrl, title: filename, name: filename }));
          } catch (e) {
            if (e?.code === "MEDIA_TOO_LARGE") {
              logInfo(`[File] 命中超限降级，name=${filename} size=${e?.mediaSize ?? "unknown"} limit=${e?.limit ?? inlineMediaMaxBytes}`);
              elements.push(import_koishi.h.text(`${describe}: ${oversizeFallbackTip}（文件 ${filename}，大小 ${formatSize(e?.mediaSize || 0)}，阈值 ${formatSize(e?.limit || inlineMediaMaxBytes)}）\n下载链接: ${value}\n`));
            } else {
              const status = e?.response?.status;
              logger.warn(`文件下载失败(status=${status ?? "unknown"})，不发送下载地址:`, e?.response?.data || e?.message || e);
              elements.push(import_koishi.h.text(`${describe}: 文件下载失败（${status ? `HTTP ${status}` : e?.message || "未知错误"}），请稍后重试。\n`));
            }
          }
          break;
        }
      }
    }
    if (oneBotLike) {
      const nickname = session.author?.nickname || session.username || session.bot.nickname || session.bot.username;
      const userId = session.author?.userId || session.bot.selfId;
      try {
        if (config.isFigure) {
          const figureMessages = elements.map((el) => {
            return (0, import_koishi.h)("message", { userId, nickname }, el);
          });
          // 先发合并转发（文本/图片），再单独发音频/文件
          if (figureMessages.length > 0) {
            await retryableSend(session, (0, import_koishi.h)("figure", {}, figureMessages), "歌曲信息合并转发");
          }
          for (const audioEl of audioElements) {
            await retryableSend(session, audioEl, "音频或文件消息");
          }
        } else {
          const allElements = [...elements, ...audioElements];
          if (allElements.length > 0) {
            await retryableSend(session, (0, import_koishi.h)("div", {}, allElements), "歌曲消息");
          }
        }
      } catch (error) {
        logger.error("歌曲消息发送失败:", error);
        return `歌曲消息发送失败（${error?.message || "未知错误"}），请稍后重试。`;
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
