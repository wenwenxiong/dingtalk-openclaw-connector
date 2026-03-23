# Agent 路由规则详解

本文档梳理 DingTalk OpenClaw Connector 中 Agent 路由（bindings）的完整工作机制，以及与会话隔离配置的交互关系。

---

## 一、路由流程概览

每条钉钉消息到达后，connector 按以下顺序确定目标 Agent：

```
消息到达
  ↓
buildSessionContext()        ← 构建会话上下文（含 peerId / sessionPeerId）
  ↓
遍历 cfg.bindings[]          ← 按顺序逐条匹配
  ↓ 命中第一条
matchedAgentId               ← 使用该 agentId
  ↓ 全部未命中
cfg.defaultAgent || 'main'   ← 回退到默认 Agent
```

---

## 二、Binding 匹配规则

每条 binding 的 `match` 字段支持三个维度，**所有指定的维度必须同时满足**（AND 关系）：

| 字段 | 类型 | 说明 |
|------|------|------|
| `match.channel` | `string?` | 频道名，固定为 `"dingtalk-connector"`，省略则匹配所有频道 |
| `match.accountId` | `string?` | 钉钉账号 ID（对应 `accounts` 配置中的 key），省略则匹配所有账号 |
| `match.peer.kind` | `"direct" \| "group"?` | 会话类型，省略则匹配单聊和群聊 |
| `match.peer.id` | `string?` | Peer 标识，群聊为 `conversationId`，单聊为 `senderId`，`"*"` 表示通配 |

### 匹配逻辑伪代码

```typescript
for (const binding of cfg.bindings) {
  const match = binding.match;
  if (match.channel && match.channel !== "dingtalk-connector") continue;
  if (match.accountId && match.accountId !== accountId) continue;
  if (match.peer) {
    if (match.peer.kind && match.peer.kind !== chatType) continue;
    // ⚠️ 关键：使用 peerId（真实 peer 标识），而非 sessionPeerId
    if (match.peer.id && match.peer.id !== '*' && match.peer.id !== peerId) continue;
  }
  // 命中，使用此 agentId
  matchedAgentId = binding.agentId;
  break;
}
```

### 优先级

- **顺序优先**：bindings 数组按顺序遍历，**第一条命中的规则生效**，后续规则不再检查
- **精确优先于通配**：建议将精确规则（指定 `peer.id`）放在通配规则（`peer.id: "*"`）之前

---

## 三、典型配置示例

### 3.1 多群分配不同 Agent

```json
{
  "bindings": [
    {
      "agentId": "main",
      "match": {
        "channel": "dingtalk-connector",
        "accountId": "groupbot",
        "peer": { "kind": "group", "id": "cid3RKewszsVbXZYCYmbybVNw==" }
      }
    },
    {
      "agentId": "organizer",
      "match": {
        "channel": "dingtalk-connector",
        "accountId": "groupbot",
        "peer": { "kind": "group", "id": "cidqO7Ne7e+myoRu67AguW+HQ==" }
      }
    },
    {
      "agentId": "atlas",
      "match": {
        "channel": "dingtalk-connector",
        "accountId": "groupbot",
        "peer": { "kind": "group", "id": "cidekzhmRmaKaJ6vnQezRFZWA==" }
      }
    }
  ]
}
```

### 3.2 单聊走一个 Agent，群聊走另一个

```json
{
  "bindings": [
    {
      "agentId": "personal-assistant",
      "match": {
        "channel": "dingtalk-connector",
        "peer": { "kind": "direct" }
      }
    },
    {
      "agentId": "group-bot",
      "match": {
        "channel": "dingtalk-connector",
        "peer": { "kind": "group" }
      }
    }
  ]
}
```

### 3.3 特定群精确路由 + 其余群通配兜底

```json
{
  "bindings": [
    {
      "agentId": "vip-agent",
      "match": {
        "channel": "dingtalk-connector",
        "peer": { "kind": "group", "id": "cidVIP..." }
      }
    },
    {
      "agentId": "main",
      "match": {
        "channel": "dingtalk-connector",
        "peer": { "kind": "group", "id": "*" }
      }
    }
  ]
}
```

---

## 四、peerId vs rawPeerId：关键区别

`buildSessionContext()` 返回的 `SessionContext` 包含两个 peer 标识字段：

| 字段 | 用途 | 受配置影响 |
|------|------|-----------|
| `peerId` | session/memory 隔离键，用于构建 `sessionKey` | ✅ 受 `sharedMemoryAcrossConversations`、`separateSessionByConversation`、`groupSessionScope` 影响 |
| `rawPeerId` | **bindings 路由匹配专用**，始终是真实的 peer 标识 | ❌ 不受任何会话隔离配置影响 |

**路由匹配必须使用 `rawPeerId`**，原因见下节。

---

## 五、已知 Bug：sharedMemoryAcrossConversations 与多 Agent 路由冲突

### 现象

当配置 `sharedMemoryAcrossConversations: true` 时，多群分配不同 Agent 的 bindings 全部路由到同一个 Agent（通常是第一个或 defaultAgent）。

### 根因

`sharedMemoryAcrossConversations: true` 时，`buildSessionContext()` 将 `sessionPeerId` 设为 `accountId`（如 `"groupbot"`），以实现跨会话记忆共享。而修复前的代码将 `peerId` 直接用于路由匹配，导致问题：

```typescript
// src/utils/session.ts（修复前的错误逻辑）
if (sharedMemoryAcrossConversations === true) {
  return {
    peerId: accountId, // ← 所有群的 peerId 都变成 "groupbot"！
    // rawPeerId 字段不存在
  };
}
```

而 binding 匹配逻辑（修复前）使用 `sessionContext.peerId` 与 `match.peer.id` 比较：

```typescript
// 修复前：用 peerId 匹配（此时 peerId 已被覆盖为 accountId）
if (match.peer.id !== sessionContext.peerId) continue;
// 结果：match.peer.id = "cid3RKewszsVbXZYCYmbybVNw=="
//       sessionContext.peerId = "groupbot"
// → 永远不匹配，全部 fallback 到 defaultAgent
```

### 修复方案（已于 2026-03-23 修复）

将 `SessionContext` 重构为两个职责分离的字段：
- `peerId`：真实 peer 标识，不受任何会话隔离配置影响，专用于路由匹配
- `sessionPeerId`：session 隔离键，受会话隔离配置影响，用于构建 `sessionKey`

路由匹配改为使用 `peerId`：

```typescript
// 修复后：用 peerId 匹配（始终是真实的 conversationId/senderId）
if (match.peer.id !== sessionContext.peerId) continue;
// 结果：match.peer.id = "cid3RKewszsVbXZYCYmbybVNw=="
//       sessionContext.peerId = "cid3RKewszsVbXZYCYmbybVNw=="
// → 正确命中
```

涉及文件：
- `src/utils/session.ts`：`SessionContext` 接口字段 `peerId`（真实标识）+ `sessionPeerId`（session 隔离键），`buildSessionContext()` 所有分支均正确填充两个字段
- `src/core/message-handler.ts`：两处 binding 匹配逻辑均使用 `peerId`，sessionKey 构建使用 `sessionPeerId`

---

## 六、会话隔离配置对 sessionPeerId 的影响

以下配置影响 `sessionPeerId`（用于 session/memory 隔离），**不影响 `peerId`（路由匹配）**：

| 配置 | sessionPeerId 值 | 效果 |
|------|-----------------|------|
| `sharedMemoryAcrossConversations: true` | `accountId` | 所有会话共享同一记忆 |
| `separateSessionByConversation: false` | `senderId` | 按用户维度维护 session，不区分群/单聊 |
| `groupSessionScope: "group_sender"` | `${conversationId}:${senderId}` | 群内每个用户独立会话 |
| 默认（群聊） | `conversationId` | 整个群共享一个会话 |
| 默认（单聊） | `senderId` | 每个用户独立会话 |

---

## 七、设计原则总结

1. **路由匹配用 `peerId`**：binding 中的 `match.peer.id` 始终对应真实的 `conversationId`（群）或 `senderId`（单聊），与会话隔离策略无关
2. **session 隔离用 `sessionPeerId`**：`sessionKey` 的构建使用 `sessionPeerId`，受会话隔离配置影响，决定记忆/上下文的共享范围
3. **两者职责分离**：路由（去哪个 Agent）和记忆隔离（共享多大范围的上下文）是两个独立的维度，不应相互干扰
