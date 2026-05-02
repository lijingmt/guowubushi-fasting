# PartyKit 实时服务

## 服务器信息

| 项目 | 值 |
|------|-----|
| 服务地址 | `https://guowu-fasting-leaderboard.lijingmt.partykit.dev` |
| Cloudflare 账号 | `lijingmt` |
| 服务名称 | `guowu-fasting-leaderboard` |
| 服务器入口 | `partykit/server.ts` |
| 配置文件 | `partykit.json` |
| PartyKit 版本 | 0.0.115 |

## 已实现功能

- 排行榜同步（Top 1000，按连胜天数排序）
- WebSocket 实时通信

## 消息协议

### 客户端 → 服务器

```json
{ "type": "publish", "payload": { "userId": "...", "nickname": "...", "streak": 0, "completedDays": 0, "totalMerit": 0, "lastUpdate": 0 } }
{ "type": "getLeaderboard" }
{ "type": "removeUser", "userId": "..." }
```

### 服务器 → 客户端

```json
{ "type": "leaderboardUpdate", "payload": [...] }
```

## 常用命令

```bash
# 部署
npx partykit deploy

# 查看登录状态
npx partykit whoami

# 本地开发
npx partykit dev
```

## 待开发功能

- 实时在线打坐人数统计
