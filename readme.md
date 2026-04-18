# koishi-plugin-music-pick

[![npm](https://img.shields.io/npm/v/koishi-plugin-music-pick?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-music-pick)

基于 MET MUSIC API 的点歌插件。

## 主要特性

- 同群支持并发点歌，不再按会话串行排队。
- 同一用户重复发起点歌会覆盖上一条待选歌单。
- 支持 `点歌 -n <序号>` 直接点歌。
- 支持 `-163` / `-wyy` 切换到网易云源。
- 支持自动解析 QQ 音乐卡片并点歌。

## 使用说明

- 默认使用 MET 源。
- 发送 `点歌 关键词` 时，默认走 MET 源。
- 发送 `点歌 -163 关键词` 或 `点歌 -wyy 关键词` 时，走网易云源。
- 网易云源需要在插件配置中额外填写 `neteaseApiLink`。
- 如果未配置 `neteaseApiLink`，选择网易云源时会提示未配置。

## 配置示例

```ts
{
  apilink: 'https://example.com/met',
  neteaseApiLink: 'https://example.com/netease',
}
```
