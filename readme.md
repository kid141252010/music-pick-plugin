# koishi-plugin-music-pick

[![npm](https://img.shields.io/npm/v/koishi-plugin-music-pick?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-music-pick)

基于 MET MUSIC API 的点歌插件。

## 主要特性

- 同群支持并发点歌，不再按会话串行排队。
- 同一用户重复发起点歌会覆盖上一条待选歌单。
- 支持 `点歌 -n <序号>` 直接点歌。
- 支持自动解析 QQ 音乐卡片并点歌。
