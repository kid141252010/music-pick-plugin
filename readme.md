# koishi-plugin-music-pick

[![npm](https://img.shields.io/npm/v/koishi-plugin-music-pick?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-music-pick)

基于 MET + 网易云 API 的点歌插件。

## 主要特性

- 同群支持并发点歌，不再按会话串行排队。
- 同一用户重复发起点歌会覆盖上一条待选歌单。
- 支持 `点歌 -n <序号>` 直接点歌。
- 默认并行搜索 MET + 网易云，两源各取前 5 首并合并去重（同名同歌手时 MET 优先）。
- 支持 `-163` / `-wyy` 显式切换到网易云单源搜索。
- 支持自动解析音乐卡片并按来源分流点歌：QQ 卡片 -> MET 源，网易云卡片 -> 网易云源。

## 使用说明

- 发送 `点歌 关键词` 时，默认并行搜索 MET + 网易云（各取前 5）并去重，重复歌曲保留 MET 结果。
- 发送 `点歌 -163 关键词` 或 `点歌 -wyy 关键词` 时，仅走网易云单源搜索。
- 自动解析音乐卡片时：QQ 卡片走 MET 源，网易云卡片走网易云源。
- 网易云源需要在插件配置中额外填写 `neteaseApiLink`；未配置时，使用网易云卡片或选择网易云源都会提示未配置。
- 如需携带账号态请求网易云源，可配置 `neteaseCookie`，插件会仅在网易云 API 请求时通过 `Cookie` 请求头发送。

## 配置示例

```ts
{
  apilink: 'https://example.com/met',
  neteaseApiLink: 'https://example.com/netease',
  neteaseCookie: 'MUSIC_U=your_cookie_value',
}
```

`neteaseCookie` 支持填写最小值（如 `MUSIC_U=...`），也支持直接填写完整 Cookie 串（如 `MUSIC_U=...; __csrf=...; NMTID=...`）。
