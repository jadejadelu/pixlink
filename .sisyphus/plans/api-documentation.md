# PixLink API 接口文档

**版本:** 2.0  
**日期:** 2026-02-24  
**格式:** OpenAPI 3.0  
**Base URL:** `http://localhost:3000/api`

---

## 1. 概述

### 1.1 认证方式

**JWT Bearer Token:**
```
Authorization: Bearer <token>
```

Token 获取方式：
- 注册用户：登录接口返回
- 游客：加入房间接口返回（临时 Token）

### 1.2 响应格式

**标准成功响应:**
```json
{
  "success": true,
  "data": { ... },
  "message": "操作成功"
}
```

**标准错误响应:**
```json
{
  "success": false,
  "error": "错误描述",
  "code": "ERROR_CODE"
}
```

### 1.3 HTTP 状态码

| 状态码 | 含义 | 使用场景 |
|--------|------|----------|
| 200 | OK | 成功响应 |
| 201 | Created | 创建成功 |
| 400 | Bad Request | 请求参数错误 |
| 401 | Unauthorized | 未认证/Token 过期 |
| 403 | Forbidden | 无权操作 |
| 404 | Not Found | 资源不存在 |
| 409 | Conflict | 资源冲突（如房间号重复）|
| 429 | Too Many Requests | 请求频率过高 |
| 500 | Server Error | 服务器内部错误 |

---

## 2. 房间管理 API

### 2.1 创建房间

**POST** `/rooms`

创建新房间，自动生成或指定房间号。

#### Request

```json
{
  "name": "Minecraft 生存服",
  "roomNumber": "9527",        // 可选，不传则自动生成
  "password": "123456",        // 可选
  "maxPlayers": 8,             // 可选，默认 8
  "gameType": "minecraft",     // 可选，默认 other
  "connectionMode": "QUICK"    // 可选，默认 QUICK
}
```

#### Response 201

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "roomNumber": "9527",
    "name": "Minecraft 生存服",
    "ownerId": "user-uuid",
    "maxPlayers": 8,
    "gameType": "minecraft",
    "connectionMode": "QUICK",
    "visibility": "PUBLIC",
    "status": "ACTIVE",
    "createdAt": "2026-02-24T10:00:00Z"
  },
  "message": "房间创建成功！房间号：9527"
}
```

#### Error Codes

- `ROOM_001`: 房间号格式错误（必须为 4-6 位数字）
- `ROOM_002`: 房间号已被使用
- `VALIDATION_ERROR`: 参数校验失败

---

### 2.2 通过房间号查询房间

**GET** `/rooms/by-number/{roomNumber}`

查询房间基本信息（加入前预览）。

#### Path Parameters

| 参数 | 类型 | 说明 |
|------|------|------|
| roomNumber | string | 房间号（4-6 位数字）|

#### Response 200

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "roomNumber": "9527",
    "name": "Minecraft 生存服",
    "owner": {
      "id": "user-uuid",
      "nickname": "老王"
    },
    "maxPlayers": 8,
    "currentPlayers": 3,
    "gameType": "minecraft",
    "connectionMode": "QUICK",
    "visibility": "PUBLIC",
    "hasPassword": true  // 是否设置了密码
  }
}
```

#### Error Codes

- `ROOM_003`: 房间不存在

---

### 2.3 通过房间号加入房间

**POST** `/rooms/join-by-number`

使用房间号加入房间（支持游客模式）。

#### Request

```json
{
  "roomNumber": "9527",
  "password": "123456",        // 如房间有密码则必填
  "nickname": "小明"           // 游客必填，注册用户可选
}
```

#### Response 200（注册用户）

```json
{
  "success": true,
  "data": {
    "membership": {
      "id": "membership-uuid",
      "roomId": "room-uuid",
      "userId": "user-uuid",
      "role": "MEMBER",
      "joinedAt": "2026-02-24T10:05:00Z"
    },
    "token": "jwt-token",        // 新的房间会话 Token
    "room": {
      // 完整房间信息
    }
  },
  "message": "成功加入房间"
}
```

#### Response 200（游客）

```json
{
  "success": true,
  "data": {
    "membership": {
      "id": "membership-uuid",
      "roomId": "room-uuid",
      "userId": "guest_xxx",      // 临时游客 ID
      "role": "MEMBER",
      "joinedAt": "2026-02-24T10:05:00Z"
    },
    "token": "guest-jwt-token",   // 游客 Token（24h 过期）
    "guestId": "guest_xxx",
    "nickname": "小明",
    "room": {
      // 完整房间信息
    }
  },
  "message": "加入成功！建议注册账号以保存数据。"
}
```

#### Error Codes

- `ROOM_003`: 房间不存在
- `ROOM_004`: 房间密码错误
- `ROOM_005`: 房间已满
- `ROOM_006`: 房间已关闭

---

### 2.4 获取房间列表

**GET** `/rooms`

获取公开房间列表（分页）。

#### Query Parameters

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | integer | 否 | 页码，默认 1 |
| limit | integer | 否 | 每页数量，默认 20，最大 50 |
| gameType | string | 否 | 按游戏类型筛选 |
| search | string | 否 | 按房间名称搜索 |

#### Response 200

```json
{
  "success": true,
  "data": {
    "rooms": [
      {
        "id": "uuid",
        "roomNumber": "9527",
        "name": "Minecraft 生存服",
        "owner": {
          "nickname": "老王"
        },
        "maxPlayers": 8,
        "currentPlayers": 3,
        "gameType": "minecraft",
        "hasPassword": false,
        "createdAt": "2026-02-24T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}
```

---

### 2.5 获取房间详情

**GET** `/rooms/{roomId}`

获取房间详细信息（加入后）。

#### Path Parameters

| 参数 | 类型 | 说明 |
|------|------|------|
| roomId | string | 房间 UUID |

#### Response 200

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "roomNumber": "9527",
    "name": "Minecraft 生存服",
    "owner": {
      "id": "user-uuid",
      "nickname": "老王"
    },
    "maxPlayers": 8,
    "gameType": "minecraft",
    "connectionMode": "QUICK",
    "visibility": "PUBLIC",
    "status": "ACTIVE",
    "members": [
      {
        "userId": "user-uuid",
        "nickname": "老王",
        "role": "OWNER",
        "state": "ONLINE",
        "virtualIp": "10.126.126.1"
      },
      {
        "userId": "user-uuid-2",
        "nickname": "小明",
        "role": "MEMBER",
        "state": "GAMING",
        "virtualIp": "10.126.126.2"
      }
    ],
    "createdAt": "2026-02-24T10:00:00Z"
  }
}
```

---

### 2.6 离开房间

**DELETE** `/rooms/{roomId}/membership`

离开当前房间。

#### Response 200

```json
{
  "success": true,
  "message": "已离开房间"
}
```

---

### 2.7 更新房间设置（房主）

**PUT** `/rooms/{roomId}`

房主更新房间设置。

#### Request

```json
{
  "name": "新的房间名称",       // 可选
  "password": "newpassword",    // 可选，传 null 清除密码
  "maxPlayers": 10,             // 可选
  "connectionMode": "GUIDED"    // 可选
}
```

#### Response 200

```json
{
  "success": true,
  "data": {
    // 更新后的房间信息
  },
  "message": "房间设置已更新"
}
```

#### Error Codes

- `ROOM_007`: 无权操作（非房主）

---

### 2.8 解散房间（房主）

**DELETE** `/rooms/{roomId}`

房主解散房间。

#### Response 200

```json
{
  "success": true,
  "message": "房间已解散"
}
```

---

## 3. 分享码 API

### 3.1 生成分享码

**POST** `/rooms/{roomId}/share-codes`

房主生成分享码。

#### Request

```json
{
  "expiresIn": 24    // 过期时间（小时），可选，默认 24，传 null 表示永久
}
```

#### Response 201

```json
{
  "success": true,
  "data": {
    "shareCode": "eyJhbGciOiJIUzI1NiIs...",  // JWT 格式分享码
    "roomNumber": "9527",
    "expiresAt": "2026-02-25T10:00:00Z",      // 过期时间，null 表示永久
    "createdAt": "2026-02-24T10:00:00Z"
  }
}
```

#### Error Codes

- `SHARE_001`: 无权生成分享码（非房主）

---

### 3.2 使用分享码加入

**POST** `/rooms/join-by-share-code`

使用分享码快速加入房间。

#### Request

```json
{
  "shareCode": "eyJhbGciOiJIUzI1NiIs...",
  "nickname": "小明"    // 游客必填
}
```

#### Response 200

```json
{
  "success": true,
  "data": {
    "membership": {
      "id": "membership-uuid",
      "roomId": "room-uuid",
      // ...
    },
    "token": "jwt-token",
    "room": {
      // 房间信息
    }
  },
  "message": "成功加入房间"
}
```

#### Error Codes

- `SHARE_002`: 分享码无效或已过期
- `SHARE_003`: 房间已解散

---

### 3.3 获取房间分享码列表

**GET** `/rooms/{roomId}/share-codes`

房主获取房间的所有分享码。

#### Response 200

```json
{
  "success": true,
  "data": {
    "shareCodes": [
      {
        "id": "uuid",
        "code": "eyJhbGciOiJIUzI1NiIs...",
        "expiresAt": "2026-02-25T10:00:00Z",
        "createdAt": "2026-02-24T10:00:00Z",
        "useCount": 5           // 使用次数（可选统计）
      }
    ]
  }
}
```

---

### 3.4 删除分享码

**DELETE** `/rooms/{roomId}/share-codes/{codeId}`

房主删除分享码（撤销分享）。

#### Response 200

```json
{
  "success": true,
  "message": "分享码已删除"
}
```

---

## 4. 设备管理 API

### 4.1 自动配置设备

**POST** `/devices/auto-configure`

一键自动配置设备（简化版）。

#### Request

```json
{
  "os": "Windows",
  "arch": "x64"
}
```

#### Response 200

```json
{
  "success": true,
  "data": {
    "deviceId": "device-uuid",
    "virtualIp": "10.126.126.5",
    "status": "configured",
    "steps": [
      { "name": "生成安全身份", "status": "completed" },
      { "name": "上传到服务器", "status": "completed" },
      { "name": "获取连接证书", "status": "completed" },
      { "name": "导入到本地代理", "status": "completed" }
    ]
  },
  "message": "设备配置完成"
}
```

#### Response 202（异步处理）

```json
{
  "success": true,
  "data": {
    "jobId": "job-uuid"
  },
  "message": "配置任务已启动，请查询状态"
}
```

---

### 4.2 查询配置状态

**GET** `/devices/config-status/{jobId}`

查询自动配置任务状态。

#### Response 200（进行中）

```json
{
  "success": true,
  "data": {
    "status": "processing",
    "progress": 75,
    "currentStep": "获取连接证书",
    "steps": [
      { "name": "生成安全身份", "status": "completed" },
      { "name": "上传到服务器", "status": "completed" },
      { "name": "获取连接证书", "status": "running" },
      { "name": "导入到本地代理", "status": "pending" }
    ]
  }
}
```

#### Response 200（完成）

```json
{
  "success": true,
  "data": {
    "status": "completed",
    "deviceId": "device-uuid",
    "virtualIp": "10.126.126.5"
  }
}
```

#### Response 200（失败）

```json
{
  "success": true,  // 注意：请求成功，但配置失败
  "data": {
    "status": "failed",
    "failedStep": "获取连接证书",
    "error": "ZTM 服务暂时不可用",
    "errorCode": "ZTM_001"
  }
}
```

---

### 4.3 获取设备列表

**GET** `/devices`

获取当前用户的设备列表。

#### Response 200

```json
{
  "success": true,
  "data": {
    "devices": [
      {
        "id": "device-uuid",
        "os": "Windows",
        "arch": "x64",
        "deviceNonce": "nonce-string",
        "lastSeen": "2026-02-24T10:00:00Z",
        "isCurrent": true,           // 是否是当前设备
        "virtualIp": "10.126.126.5",
        "status": "online"
      }
    ]
  }
}
```

---

## 5. 网络连接 API

### 5.1 创建隧道

**POST** `/rooms/{roomId}/tunnels`

创建网络隧道。

#### Request

```json
{
  "type": "TCP",
  "port": 25565
}
```

#### Response 201

```json
{
  "success": true,
  "data": {
    "tunnelId": "tunnel-uuid",
    "type": "TCP",
    "port": 25565,
    "virtualIp": "10.126.126.5",
    "state": "CREATED"
  }
}
```

---

### 5.2 获取连接状态

**GET** `/connection/status`

获取当前连接状态。

#### Response 200

```json
{
  "success": true,
  "data": {
    "status": "connected",           // disconnected/connecting/connected/error
    "virtualIp": "10.126.126.5",
    "latency": 15,                   // ms
    "packetLoss": 0,                 // %
    "tunnelCount": 2,
    "connectedAt": "2026-02-24T10:00:00Z"
  }
}
```

---

### 5.3 网络诊断

**GET** `/connection/diagnostics`

运行网络诊断。

#### Response 200

```json
{
  "success": true,
  "data": {
    "checks": [
      { "name": "本地网络", "status": "pass", "message": "正常" },
      { "name": "ZTM Agent", "status": "pass", "message": "运行中" },
      { "name": "服务器连接", "status": "pass", "message": "延迟 15ms" },
      { "name": "NAT 类型", "status": "warn", "message": "Symmetric（可能较慢）" },
      { "name": "虚拟 IP", "status": "pass", "message": "10.126.126.5" }
    ],
    "overall": "good",               // good/fair/poor
    "suggestions": [
      "关闭防火墙可能改善连接质量"
    ]
  }
}
```

---

## 6. 消息 API

### 6.1 获取历史消息

**GET** `/rooms/{roomId}/messages`

获取房间历史消息（分页）。

#### Query Parameters

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| before | string | 否 | 游标（messageId），获取此 ID 之前的消息 |
| limit | integer | 否 | 数量，默认 50，最大 100 |

#### Response 200

```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": "msg-uuid",
        "userId": "user-uuid",
        "nickname": "老王",
        "content": "大家准备好了吗？",
        "type": "TEXT",
        "createdAt": "2026-02-24T10:05:00Z"
      },
      {
        "id": "msg-uuid-2",
        "type": "SYSTEM",
        "content": "小明已加入房间",
        "createdAt": "2026-02-24T10:04:00Z"
      }
    ],
    "pagination": {
      "hasMore": true,
      "nextCursor": "msg-uuid-100"
    }
  }
}
```

---

### 6.2 发送消息（WebSocket 优先）

**POST** `/rooms/{roomId}/messages`

HTTP 方式发送消息（备用，WebSocket 不可用时）。

#### Request

```json
{
  "content": "我准备好了！",
  "type": "TEXT"    // TEXT/SYSTEM
}
```

#### Response 201

```json
{
  "success": true,
  "data": {
    "messageId": "msg-uuid",
    "createdAt": "2026-02-24T10:06:00Z"
  }
}
```

---

## 7. 用户 API

### 7.1 用户注册

**POST** `/auth/register`

用户注册。

#### Request

```json
{
  "email": "user@example.com",
  "nickname": "小明",
  "password": "password123"
}
```

#### Response 201

```json
{
  "success": true,
  "data": {
    "userId": "user-uuid",
    "email": "user@example.com",
    "nickname": "小明",
    "status": "PENDING"
  },
  "message": "注册成功，请查收激活邮件"
}
```

---

### 7.2 用户登录

**POST** `/auth/login`

用户登录。

#### Request

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

#### Response 200

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-uuid",
      "email": "user@example.com",
      "nickname": "小明"
    },
    "token": "jwt-token"
  }
}
```

---

## 8. WebSocket 事件

### 8.1 连接

```javascript
const ws = new WebSocket('ws://localhost:3000/ws?token=jwt-token');
```

### 8.2 客户端事件

**加入房间：**
```json
{
  "type": "join_room",
  "payload": {
    "roomId": "room-uuid"
  }
}
```

**发送消息：**
```json
{
  "type": "send_message",
  "payload": {
    "content": "大家好！",
    "type": "TEXT"
  }
}
```

**更新状态：**
```json
{
  "type": "update_status",
  "payload": {
    "state": "READY"    // READY/GAMING/OFFLINE
  }
}
```

### 8.3 服务端事件

**用户加入：**
```json
{
  "type": "user_joined",
  "payload": {
    "userId": "user-uuid",
    "nickname": "小明",
    "joinedAt": "2026-02-24T10:00:00Z"
  }
}
```

**新消息：**
```json
{
  "type": "new_message",
  "payload": {
    "messageId": "msg-uuid",
    "userId": "user-uuid",
    "nickname": "老王",
    "content": "大家好！",
    "type": "TEXT",
    "createdAt": "2026-02-24T10:00:00Z"
  }
}
```

**用户状态变更：**
```json
{
  "type": "user_status_changed",
  "payload": {
    "userId": "user-uuid",
    "state": "READY",
    "updatedAt": "2026-02-24T10:00:00Z"
  }
}
```

**连接断开通知：**
```json
{
  "type": "user_disconnected",
  "payload": {
    "userId": "user-uuid",
    "nickname": "小明",
    "willRetry": true
  }
}
```

---

## 9. 速率限制

### 9.1 限制规则

| 接口 | 限制 | 说明 |
|------|------|------|
| 房间号查询 | 10次/分钟/IP | 防止暴力扫描 |
| 加入房间 | 5次/分钟/用户 | 防止滥用 |
| 发送消息 | 30条/分钟/用户 | 防刷屏 |
| 创建房间 | 3次/小时/用户 | 防止刷房间 |
| 分享码生成 | 10次/小时/房间 | 合理限制 |

### 9.2 限制响应

```json
{
  "success": false,
  "error": "请求过于频繁，请稍后重试",
  "code": "RATE_LIMIT",
  "retryAfter": 60    // 秒
}
```

---

## 10. 完整 OpenAPI 规范

完整的 OpenAPI 3.0 YAML 规范文件位置：
`docs/openapi.yaml`

（此处省略完整 YAML，实际项目中使用 Swagger Editor 维护）

---

## 11. 文档结束

**下一步：** 继续创建：
- WebSocket 协议详细文档
- 错误码手册
- 组件架构图

**测试建议：**
- 使用 Postman 或 Insomnia 导入 OpenAPI 规范
- 使用 `curl` 命令行测试
- 编写自动化 API 测试