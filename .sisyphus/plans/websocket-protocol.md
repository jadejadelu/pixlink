# PixLink WebSocket 协议规范

**版本:** 1.0  
**日期:** 2026-02-24  
**协议:** WebSocket (Socket.io)  
**编码:** JSON

---

## 1. 概述

WebSocket 用于实时通信，包括：
- 房间成员状态同步
- 聊天消息实时推送
- 连接状态变更通知
- 游戏事件广播

### 1.1 连接 URL

```
ws://localhost:3000/socket.io/?token={jwt-token}&EIO=4&transport=websocket
```

### 1.2 认证

连接时通过 query 参数传递 Token：
- `token`: JWT Token（注册用户或游客）

连接成功后，服务端会验证 Token 有效性，无效则断开连接。

### 1.3 消息格式

所有消息使用 JSON 格式：

```typescript
interface WebSocketMessage {
  type: string;        // 消息类型
  payload: any;        // 消息负载
  timestamp: number;   // 时间戳（Unix ms）
  messageId?: string;  // 消息唯一ID（可选，用于确认）
}
```

---

## 2. 连接生命周期

### 2.1 连接流程

```
Client                                      Server
  │                                           │
  ├────────── WebSocket Handshake ──────────▶│
  │  Headers:                                 │
  │  Authorization: Bearer {token}            │
  │                                           │
  │◀────────── Connection Ack ──────────────┤
  │  { "type": "connect_ack",                 │
  │    "payload": { "userId": "xxx" } }       │
  │                                           │
  ├────────── Join Room Request ────────────▶│
  │  { "type": "join_room",                   │
  │    "payload": { "roomId": "xxx" } }       │
  │                                           │
  │◀────────── Room Joined Ack ─────────────┤
  │  { "type": "room_joined",                 │
  │    "payload": { "room": {...} } }         │
  │                                           │
  │◀────────── Member List Sync ────────────┤
  │  { "type": "member_list",                 │
  │    "payload": { "members": [...] } }      │
  │                                           │
```

### 2.2 心跳机制

**客户端心跳：**
- 每 30 秒发送一次 `ping`
- 服务端 60 秒内未收到 `ping` 视为断线

**服务端心跳：**
- 服务端定期发送 `ping`
- 客户端必须在 10 秒内回复 `pong`

```json
// Client -> Server
{ "type": "ping", "timestamp": 1700000000000 }

// Server -> Client
{ "type": "pong", "timestamp": 1700000000000 }
```

### 2.3 断线重连

**断线检测：**
- 网络断开：立即触发 `disconnect` 事件
- 心跳超时：60 秒后触发

**重连策略：**
```javascript
const reconnectOptions = {
  maxRetries: 5,           // 最大重试次数
  initialDelay: 1000,      // 初始延迟 1s
  maxDelay: 30000,         // 最大延迟 30s
  backoffMultiplier: 2,    // 指数退避倍数
};
```

**重连流程：**
1. 检测到断线
2. 显示"正在重连..."
3. 按策略重试连接
4. 重连成功后自动加入原房间
5. 同步断线期间的消息和状态

**重连成功响应：**
```json
{
  "type": "reconnect_success",
  "payload": {
    "missedMessages": [...],    // 断线期间的消息
    "currentMembers": [...],    // 当前成员列表
    "myStatus": "ONLINE"        // 恢复后的状态
  }
}
```

---

## 3. 客户端事件（Client -> Server）

### 3.1 加入房间

**事件类型:** `join_room`

客户端加入房间时发送。

**Payload:**
```json
{
  "type": "join_room",
  "payload": {
    "roomId": "room-uuid"
  },
  "timestamp": 1700000000000
}
```

**服务端响应:**
- 成功: `room_joined`
- 失败: `error`

---

### 3.2 离开房间

**事件类型:** `leave_room`

客户端离开房间时发送。

**Payload:**
```json
{
  "type": "leave_room",
  "payload": {
    "roomId": "room-uuid"
  },
  "timestamp": 1700000000000
}
```

---

### 3.3 发送消息

**事件类型:** `send_message`

发送聊天消息。

**Payload:**
```json
{
  "type": "send_message",
  "payload": {
    "content": "大家好！",
    "type": "TEXT",           // TEXT / SYSTEM
    "replyTo": "msg-uuid"     // 回复某条消息（可选）
  },
  "timestamp": 1700000000000,
  "messageId": "client-msg-id"  // 客户端生成的ID，用于确认
}
```

**服务端确认:**
```json
{
  "type": "message_ack",
  "payload": {
    "clientMessageId": "client-msg-id",
    "serverMessageId": "server-msg-uuid",
    "status": "delivered"
  }
}
```

---

### 3.4 更新状态

**事件类型:** `update_status`

更新用户在房间内的状态。

**Payload:**
```json
{
  "type": "update_status",
  "payload": {
    "state": "READY",         // OFFLINE / ONLINE / READY / GAMING
    "gameInfo": {             // 游戏信息（可选，state=GAMING时）
      "gameName": "Minecraft",
      "serverIp": "10.126.126.1",
      "playTime": 3600        // 游戏时长（秒）
    }
  },
  "timestamp": 1700000000000
}
```

**状态说明:**
- `OFFLINE`: 离线（网络断开）
- `ONLINE`: 在线但未准备
- `READY`: 已准备
- `GAMING`: 游戏中

---

### 3.5 更新连接信息

**事件类型:** `update_connection`

更新网络连接信息。

**Payload:**
```json
{
  "type": "update_connection",
  "payload": {
    "virtualIp": "10.126.126.5",
    "latency": 15,            // ms
    "packetLoss": 0,          // %
    "tunnelStatus": "connected"  // disconnected/connecting/connected
  },
  "timestamp": 1700000000000
}
```

---

### 3.6 游戏控制（房主）

**事件类型:** `game_control`

房主控制游戏会话。

**Payload - 开始游戏:**
```json
{
  "type": "game_control",
  "payload": {
    "action": "start",
    "serverIp": "10.126.126.1",
    "port": 25565
  }
}
```

**Payload - 结束游戏:**
```json
{
  "type": "game_control",
  "payload": {
    "action": "end"
  }
}
```

---

### 3.7 房主管理

**事件类型:** `owner_action`

房主管理房间成员。

**Payload - 踢出成员:**
```json
{
  "type": "owner_action",
  "payload": {
    "action": "kick",
    "targetUserId": "user-uuid",
    "reason": "长时间无响应"
  }
}
```

**Payload - 转让房主:**
```json
{
  "type": "owner_action",
  "payload": {
    "action": "transfer_owner",
    "targetUserId": "user-uuid"
  }
}
```

**Payload - 禁言:**
```json
{
  "type": "owner_action",
  "payload": {
    "action": "mute",
    "targetUserId": "user-uuid",
    "duration": 300    // 秒，0表示永久
  }
}
```

---

### 3.8 Ping

**事件类型:** `ping`

心跳检测。

**Payload:**
```json
{
  "type": "ping",
  "timestamp": 1700000000000
}
```

---

## 4. 服务端事件（Server -> Client）

### 4.1 连接确认

**事件类型:** `connect_ack`

连接成功后发送。

**Payload:**
```json
{
  "type": "connect_ack",
  "payload": {
    "userId": "user-uuid",
    "nickname": "小明",
    "isGuest": false,
    "serverTime": 1700000000000
  },
  "timestamp": 1700000000000
}
```

---

### 4.2 房间加入确认

**事件类型:** `room_joined`

成功加入房间后发送。

**Payload:**
```json
{
  "type": "room_joined",
  "payload": {
    "room": {
      "id": "room-uuid",
      "roomNumber": "9527",
      "name": "Minecraft 服务器",
      "connectionMode": "QUICK"
    },
    "myRole": "MEMBER",        // OWNER / MEMBER
    "members": [
      {
        "userId": "user-1",
        "nickname": "老王",
        "role": "OWNER",
        "state": "ONLINE",
        "virtualIp": "10.126.126.1"
      }
    ]
  },
  "timestamp": 1700000000000
}
```

---

### 4.3 成员加入通知

**事件类型:** `user_joined`

广播给房间所有成员（包括自己）。

**Payload:**
```json
{
  "type": "user_joined",
  "payload": {
    "userId": "user-uuid",
    "nickname": "小明",
    "role": "MEMBER",
    "joinedAt": 1700000000000
  },
  "timestamp": 1700000000000
}
```

---

### 4.4 成员离开通知

**事件类型:** `user_left`

广播给房间所有成员。

**Payload - 正常离开:**
```json
{
  "type": "user_left",
  "payload": {
    "userId": "user-uuid",
    "nickname": "小明",
    "reason": "leave"    // leave / kick / disconnect
  },
  "timestamp": 1700000000000
}
```

**Payload - 断开连接（可能重连）:**
```json
{
  "type": "user_left",
  "payload": {
    "userId": "user-uuid",
    "nickname": "小明",
    "reason": "disconnect",
    "willRetry": true,     // 是否会重连
    "retryTimeout": 300    // 重连超时（秒）
  },
  "timestamp": 1700000000000
}
```

---

### 4.5 成员状态变更

**事件类型:** `user_status_changed`

广播给房间所有成员。

**Payload:**
```json
{
  "type": "user_status_changed",
  "payload": {
    "userId": "user-uuid",
    "nickname": "小明",
    "previousState": "ONLINE",
    "currentState": "READY",
    "updatedAt": 1700000000000
  },
  "timestamp": 1700000000000
}
```

---

### 4.6 新消息通知

**事件类型:** `new_message`

广播给房间所有成员。

**Payload - 普通消息:**
```json
{
  "type": "new_message",
  "payload": {
    "messageId": "msg-uuid",
    "userId": "user-uuid",
    "nickname": "小明",
    "content": "大家好！",
    "type": "TEXT",
    "createdAt": 1700000000000
  },
  "timestamp": 1700000000000
}
```

**Payload - 系统消息:**
```json
{
  "type": "new_message",
  "payload": {
    "messageId": "msg-uuid",
    "type": "SYSTEM",
    "content": "小明已准备",
    "createdAt": 1700000000000
  },
  "timestamp": 1700000000000
}
```

**Payload - @提及消息（仅发送给被提及者和发送者）:**
```json
{
  "type": "new_message",
  "payload": {
    "messageId": "msg-uuid",
    "userId": "user-1",
    "nickname": "老王",
    "content": "@小明 准备好了吗？",
    "type": "TEXT",
    "mentions": ["user-2"],    // 被提及的用户ID列表
    "createdAt": 1700000000000
  },
  "timestamp": 1700000000000
}
```

---

### 4.7 连接状态更新

**事件类型:** `connection_update`

广播用户的网络连接状态。

**Payload:**
```json
{
  "type": "connection_update",
  "payload": {
    "userId": "user-uuid",
    "nickname": "小明",
    "virtualIp": "10.126.126.5",
    "latency": 15,
    "packetLoss": 0,
    "tunnelStatus": "connected"
  },
  "timestamp": 1700000000000
}
```

---

### 4.8 游戏会话控制

**事件类型:** `game_session`

广播游戏会话状态变更。

**Payload - 游戏开始:**
```json
{
  "type": "game_session",
  "payload": {
    "action": "started",
    "startedBy": "user-uuid",
    "nickname": "老王",
    "serverIp": "10.126.126.1",
    "port": 25565,
    "startedAt": 1700000000000
  },
  "timestamp": 1700000000000
}
```

**Payload - 游戏结束:**
```json
{
  "type": "game_session",
  "payload": {
    "action": "ended",
    "endedBy": "user-uuid",
    "endedAt": 1700000000000
  },
  "timestamp": 1700000000000
}
```

---

### 4.9 房主变更

**事件类型:** `owner_changed`

房主权限转让时广播。

**Payload:**
```json
{
  "type": "owner_changed",
  "payload": {
    "previousOwner": {
      "userId": "user-1",
      "nickname": "老王"
    },
    "newOwner": {
      "userId": "user-2",
      "nickname": "小明"
    },
    "changedAt": 1700000000000
  },
  "timestamp": 1700000000000
}
```

---

### 4.10 被踢出通知

**事件类型:** `kicked`

被房主踢出时发送给目标用户。

**Payload:**
```json
{
  "type": "kicked",
  "payload": {
    "byUser": {
      "userId": "user-1",
      "nickname": "老王"
    },
    "reason": "长时间无响应",
    "kickedAt": 1700000000000
  },
  "timestamp": 1700000000000
}
```

---

### 4.11 错误通知

**事件类型:** `error`

发生错误时发送。

**Payload:**
```json
{
  "type": "error",
  "payload": {
    "code": "WS_001",
    "message": "操作失败，无权限",
    "details": {
      "action": "kick",
      "reason": "只有房主可以踢出成员"
    }
  },
  "timestamp": 1700000000000
}
```

---

### 4.12 Pong

**事件类型:** `pong`

服务端心跳响应。

**Payload:**
```json
{
  "type": "pong",
  "payload": {
    "latency": 50    // 服务端计算的延迟（ms）
  },
  "timestamp": 1700000000000
}
```

---

## 5. 状态同步策略

### 5.1 状态同步流程

```
用户 A 更新状态（READY）
    │
    ├─WebSocket──┐
    │            ▼
    │      ┌─────────────┐
    │      │   Server    │
    │      │  1. 验证    │
    │      │  2. 更新DB  │
    │      │  3. 广播    │
    │      └──────┬──────┘
    │             │
    │◀────────────┤
    │  ack        │
    │             ├─WebSocket──┐
    │             │            ▼
    │             │      ┌─────────────┐
    │             │      │   用户 B    │
    │             │      │  更新UI     │
    │             │      └─────────────┘
    │             │
    │             ├─WebSocket──┐
    │             │            ▼
    │             │      ┌─────────────┐
    │             │      │   用户 C    │
    │             └─────▶│  更新UI     │
    │                    └─────────────┘
```

### 5.2 状态一致性保证

**乐观更新:**
1. 客户端立即更新本地状态
2. 发送 WebSocket 事件
3. 服务端验证并广播
4. 如失败，服务端发送纠正事件

**纠正事件示例:**
```json
{
  "type": "state_correction",
  "payload": {
    "field": "state",
    "expectedValue": "READY",
    "actualValue": "ONLINE",
    "reason": "状态变更被拒绝：不在房间内"
  }
}
```

### 5.3 批量同步

**场景:** 用户重连后同步状态

**事件类型:** `batch_sync`

**Payload:**
```json
{
  "type": "batch_sync",
  "payload": {
    "members": [
      // 完整的成员列表
    ],
    "messages": [
      // 最近的 50 条消息
    ],
    "roomState": {
      "connectionMode": "QUICK",
      "gameSession": {
        "isRunning": true,
        "startedAt": 1700000000000
      }
    }
  }
}
```

---

## 6. 错误处理

### 6.1 WebSocket 错误码

| 错误码 | 说明 | 处理建议 |
|--------|------|----------|
| `WS_001` | 无权限操作 | 提示用户无权限 |
| `WS_002` | 房间不存在 | 跳转回房间列表 |
| `WS_003` | 不在房间内 | 重新加入房间 |
| `WS_004` | 消息发送过快 | 限制发送频率 |
| `WS_005` | 无效的消息格式 | 检查消息格式 |
| `WS_006` | 被禁言 | 提示禁言剩余时间 |
| `WS_007` | 房间已满 | 提示房间已满 |

### 6.2 连接错误

**Token 无效:**
```json
{
  "type": "error",
  "payload": {
    "code": "AUTH_001",
    "message": "Token 无效或已过期"
  }
}
// 连接断开，需要重新登录
```

**Token 即将过期（提前 5 分钟警告）:**
```json
{
  "type": "token_expiring",
  "payload": {
    "expiresIn": 300,    // 5 分钟后过期
    "refreshUrl": "/api/auth/refresh"
  }
}
```

---

## 7. 性能优化

### 7.1 消息压缩

大消息启用压缩：
```javascript
const socket = io({
  compress: true,        // 启用 per-message deflate
  threshold: 1024        // 超过 1KB 的消息压缩
});
```

### 7.2 房间隔离

服务端使用 Room 机制隔离广播：
```javascript
// Server (Node.js + Socket.io)
io.on('connection', (socket) => {
  socket.on('join_room', ({ roomId }) => {
    socket.join(roomId);    // 加入房间
  });
  
  // 广播给房间内所有人（除了发送者）
  socket.to(roomId).emit('new_message', message);
  
  // 广播给房间内所有人（包括发送者）
  io.to(roomId).emit('user_status_changed', status);
});
```

### 7.3 消息队列

防止消息风暴：
```javascript
// 客户端防抖
const debouncedStatusUpdate = debounce((status) => {
  socket.emit('update_status', status);
}, 500);
```

---

## 8. 安全考虑

### 8.1 身份验证

每个 WebSocket 消息都验证 Token：
```javascript
// Server middleware
io.use((socket, next) => {
  const token = socket.handshake.query.token;
  const user = verifyToken(token);
  
  if (!user) {
    return next(new Error('Authentication error'));
  }
  
  socket.userId = user.id;
  next();
});
```

### 8.2 权限验证

敏感操作验证权限：
```javascript
socket.on('owner_action', (data) => {
  const room = getRoom(data.payload.roomId);
  
  if (room.ownerId !== socket.userId) {
    socket.emit('error', {
      code: 'WS_001',
      message: '只有房主可以执行此操作'
    });
    return;
  }
  
  // 执行操作
});
```

### 8.3 消息大小限制

限制单条消息大小：
```javascript
io.engine.maxHttpBufferSize = 1e6;    // 1 MB
```

---

## 9. 客户端实现示例

### 9.1 基础连接

```typescript
import { io, Socket } from 'socket.io-client';

class PixLinkSocket {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  
  connect(token: string) {
    this.socket = io('ws://localhost:3000', {
      query: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000
    });
    
    this.setupEventHandlers();
  }
  
  private setupEventHandlers() {
    if (!this.socket) return;
    
    // 连接成功
    this.socket.on('connect', () => {
      console.log('Connected');
      this.reconnectAttempts = 0;
    });
    
    // 连接断开
    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected:', reason);
    });
    
    // 重连成功
    this.socket.on('reconnect', (attemptNumber) => {
      console.log('Reconnected after', attemptNumber, 'attempts');
    });
    
    // 房间事件
    this.socket.on('user_joined', (data) => {
      // 更新成员列表
    });
    
    this.socket.on('user_left', (data) => {
      // 更新成员列表
    });
    
    this.socket.on('new_message', (data) => {
      // 添加消息到列表
    });
    
    this.socket.on('user_status_changed', (data) => {
      // 更新用户状态
    });
  }
  
  // 加入房间
  joinRoom(roomId: string) {
    this.socket?.emit('join_room', { roomId });
  }
  
  // 发送消息
  sendMessage(content: string) {
    this.socket?.emit('send_message', {
      content,
      type: 'TEXT'
    });
  }
  
  // 更新状态
  updateStatus(state: 'ONLINE' | 'READY' | 'GAMING') {
    this.socket?.emit('update_status', { state });
  }
  
  // 断开连接
  disconnect() {
    this.socket?.disconnect();
  }
}

export const pixLinkSocket = new PixLinkSocket();
```

---

## 10. 文档结束

**下一步:** 继续创建：
- 错误码手册
- 组件架构图

**参考:**
- Socket.io 文档: https://socket.io/docs/
- WebSocket RFC: https://tools.ietf.org/html/rfc6455