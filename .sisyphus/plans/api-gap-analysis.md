# PixLink 后端 API 现状与差距分析

**日期:** 2026-02-24  
**分析范围:** pixlink-server 现有 API vs 新设计需求  
**状态:** ⚠️ **严重缺失** - 核心功能 API 未实现

---

## 1. 现有 API 清单

### 1.1 认证接口 (Auth) ✅ 已完整

**路由:** `/api/auth`

| 方法 | 路径 | 功能 | 状态 |
|------|------|------|------|
| POST | `/register` | 用户注册 | ✅ |
| POST | `/login` | 用户登录 | ✅ |
| POST | `/logout` | 退出登录 | ✅ |
| POST | `/magic-link` | 请求魔法链接 | ✅ |
| POST | `/otp` | 请求 OTP | ✅ |
| POST | `/enroll/token` | 兑换注册令牌 | ✅ |
| POST | `/password-reset/request` | 请求密码重置 | ✅ |
| POST | `/password-reset/reset` | 重置密码 | ✅ |
| POST | `/activate` | 激活账户 | ✅ |
| POST | `/resend-activation` | 重新发送激活邮件 | ✅ |
| GET | `/profile` | 获取用户信息 | ✅ |
| PUT | `/profile` | 更新用户信息 | ✅ |
| POST | `/upload-identity` | 上传身份信息 | ✅ |
| POST | `/send-permit` | 发送 Permit | ✅ |
| POST | `/leave-mesh` | 离开 Mesh 网络 | ✅ |
| POST | `/device-settings` | 更新设备设置 | ✅ |

**小计: 17 个接口**

---

### 1.2 证书接口 (Certificates) ✅ 已完整

**路由:** `/api/certs`

| 方法 | 路径 | 功能 | 状态 |
|------|------|------|------|
| POST | `/issue` | 签发证书 | ✅ |
| GET | `/` | 获取证书列表 | ✅ |
| GET | `/:certificateId/status` | 获取证书状态 | ✅ |
| DELETE | `/:certificateId` | 吊销证书 | ✅ |

**小计: 4 个接口**

---

### 1.3 设备接口 (Devices) ✅ 已完整

**路由:** `/api/devices`

| 方法 | 路径 | 功能 | 状态 |
|------|------|------|------|
| POST | `/` | 创建设备 | ✅ |
| GET | `/` | 获取设备列表 | ✅ |
| GET | `/:deviceNonce` | 获取设备详情 | ✅ |
| PUT | `/:deviceNonce` | 更新设备 | ✅ |
| DELETE | `/:deviceId` | 删除/吊销设备 | ✅ |

**小计: 5 个接口**

---

## 2. ❌ 缺失的核心 API

### 2.1 🚨 严重缺失：房间管理 API

**当前状态:** 完全缺失！数据库表不存在，API 未实现

**需要实现的接口:**

| 优先级 | 方法 | 路径 | 功能 | 依赖 |
|--------|------|------|------|------|
| 🔴 P0 | POST | `/api/rooms` | 创建房间 | 需新增 Room 表 |
| 🔴 P0 | GET | `/api/rooms` | 获取房间列表 | 需新增 Room 表 |
| 🔴 P0 | GET | `/api/rooms/:id` | 获取房间详情 | 需新增 Room 表 |
| 🔴 P0 | GET | `/api/rooms/by-number/:roomNumber` | 通过房间号查询 | 需 roomNumber 字段 |
| 🔴 P0 | POST | `/api/rooms/join-by-number` | 通过房间号加入 | 需 Membership 表 |
| 🔴 P0 | POST | `/api/rooms/:id/join` | 加入房间 | 需 Membership 表 |
| 🟡 P1 | PUT | `/api/rooms/:id` | 更新房间设置 | 需 Room 表 |
| 🟡 P1 | DELETE | `/api/rooms/:id` | 解散房间 | 需 Room 表 |
| 🟡 P1 | DELETE | `/api/rooms/:id/membership` | 离开房间 | 需 Membership 表 |

**缺失的数据表:**
- `Room` - 房间表
- `Membership` - 房间成员关系表
- `RoomShareCode` - 分享码表（Phase 4）

---

### 2.2 🚨 严重缺失：隧道管理 API

**当前状态:** 完全缺失！

**需要实现的接口:**

| 优先级 | 方法 | 路径 | 功能 |
|--------|------|------|------|
| 🔴 P0 | POST | `/api/rooms/:id/tunnels` | 创建隧道 |
| 🔴 P0 | GET | `/api/rooms/:id/tunnels` | 获取隧道列表 |
| 🔴 P0 | GET | `/api/connection/status` | 获取连接状态 |
| 🟡 P1 | GET | `/api/connection/diagnostics` | 网络诊断 |
| 🟡 P1 | DELETE | `/api/tunnels/:id` | 删除隧道 |

**缺失的数据表:**
- `Tunnel` - 隧道表

---

### 2.3 🚨 严重缺失：消息/聊天 API

**当前状态:** 完全缺失！

**需要实现的接口:**

| 优先级 | 方法 | 路径 | 功能 | 备注 |
|--------|------|------|------|------|
| 🔴 P0 | GET | `/api/rooms/:id/messages` | 获取历史消息 | 需 Message 表 |
| 🔴 P0 | POST | `/api/rooms/:id/messages` | 发送消息 | WebSocket 优先 |

**缺失的数据表:**
- `Message` - 消息表

**注意:** 聊天功能主要依赖 WebSocket，但 HTTP API 作为备选需要实现。

---

### 2.4 🟡 中度缺失：分享码 API (Phase 4)

**当前状态:** 未实现

| 优先级 | 方法 | 路径 | 功能 |
|--------|------|------|------|
| 🟡 P1 | POST | `/api/rooms/:id/share-codes` | 生成分享码 |
| 🟡 P1 | GET | `/api/rooms/:id/share-codes` | 获取分享码列表 |
| 🟡 P1 | DELETE | `/api/rooms/:id/share-codes/:codeId` | 删除分享码 |
| 🟡 P1 | POST | `/api/rooms/join-by-share-code` | 使用分享码加入 |

---

### 2.5 🟡 中度缺失：设备自动配置 API (Phase 3)

**当前状态:** 需要扩展

现有 `/api/devices` 是手动配置，需要新增自动配置接口：

| 优先级 | 方法 | 路径 | 功能 |
|--------|------|------|------|
| 🟡 P1 | POST | `/api/devices/auto-configure` | 自动配置设备 |
| 🟡 P1 | GET | `/api/devices/config-status/:jobId` | 查询配置状态 |

---

### 2.6 🔴 严重缺失：WebSocket 支持

**当前状态:** 完全缺失！

**需要实现:**
- Socket.io 服务器初始化
- 连接认证中间件
- 房间事件处理（加入/离开）
- 消息广播
- 状态同步

---

## 3. API 差距总结

### 3.1 数量统计

| 类别 | 现有 | 需要新增 | 差距 |
|------|------|----------|------|
| 认证相关 | 17 | 0 | ✅ 完整 |
| 证书相关 | 4 | 0 | ✅ 完整 |
| 设备相关 | 5 | 2 | ⚠️ 需扩展 |
| **房间相关** | **0** | **9** | **❌ 严重缺失** |
| **隧道相关** | **0** | **5** | **❌ 严重缺失** |
| **消息相关** | **0** | **2** | **❌ 严重缺失** |
| 分享码相关 | 0 | 4 | 🟡 Phase 4 |
| **WebSocket** | **0** | **N/A** | **❌ 严重缺失** |
| **总计** | **26** | **22+** | **❌ 核心功能未实现** |

### 3.2 关键差距影响

**❌ 阻塞性问题（无法开发前端）：**
1. **无房间管理 API** - 前端无法创建/加入房间
2. **无隧道管理 API** - 无法实现联机功能
3. **无 WebSocket** - 无法实现实时聊天和状态同步

**⚠️ 限制性问题（影响体验）：**
1. **无自动配置 API** - 设备配置仍需手动（4 步）
2. **无分享码 API** - 无法一键分享
3. **无网络诊断 API** - 无法排查连接问题

---

## 4. 建议实施顺序

### Phase 0: 基础准备（必须优先）

**数据库迁移:**
```bash
cd pixlink-server
# 1. 创建 Migration
npx prisma migrate dev --name add_room_system

# 2. 生成 Prisma Client
npx prisma generate
```

**新增依赖:**
```bash
npm install socket.io
npm install @types/socket.io --save-dev
```

### Phase 1: 核心房间 API（Week 1）

**必须实现（阻塞前端开发）：**
1. `POST /api/rooms` - 创建房间
2. `GET /api/rooms/by-number/:roomNumber` - 查询房间
3. `POST /api/rooms/join-by-number` - 加入房间
4. `GET /api/rooms/:id` - 房间详情

**文件需要创建：**
- `src/services/roomService.ts` - 房间服务
- `src/controllers/roomController.ts` - 房间控制器
- `src/routes/roomRoutes.ts` - 房间路由
- `src/routes/tunnelRoutes.ts` - 隧道路由
- `src/services/tunnelService.ts` - 隧道服务

### Phase 1.5: WebSocket 基础（Week 1-2）

**必须实现：**
1. Socket.io 服务器初始化
2. 连接认证
3. 房间加入/离开事件
4. 基础消息广播

**文件需要创建：**
- `src/socket/index.ts` - Socket.io 初始化
- `src/socket/handlers/roomHandler.ts` - 房间事件处理
- `src/socket/middleware/auth.ts` - WebSocket 认证

### Phase 2: 连接和消息 API（Week 2）

**实现接口：**
1. `GET /api/connection/status` - 连接状态
2. `GET /api/rooms/:id/messages` - 历史消息
3. WebSocket 消息事件完善

### Phase 3-5: 其他功能（Week 3-4）

按原计划的 Phase 3-5 实施。

---

## 5. 前端开发临时方案

如果后端 API 未准备好，前端可以使用以下临时方案：

### 方案 A：Mock API

使用 Mock 数据开发前端：
```typescript
// services/mock/roomService.ts
export const mockRoomService = {
  createRoom: async (data) => {
    return Promise.resolve({
      id: 'mock-room-id',
      roomNumber: '9527',
      ...data
    });
  },
  // ... 其他 Mock 方法
};
```

### 方案 B：先实现 UI 静态原型

不依赖 API，先实现界面和交互：
- 创建房间弹窗（无提交功能）
- 房间列表（静态数据）
- 房间内界面（静态数据）

### 方案 C：并行开发

1. 前端开发人员使用 Mock API
2. 后端开发人员并行实现真实 API
3. 约定好 API 契约（已在 API 文档中定义）
4. 后期联调替换

**推荐：方案 C（并行开发）**

---

## 6. 立即行动项

### 对于后端开发者：

**今天必须完成：**
1. ✅ 运行数据库 Migration
2. ✅ 创建 Room Service 基础结构
3. ✅ 实现 `POST /api/rooms` 和 `GET /api/rooms/by-number/:roomNumber`

**本周必须完成：**
1. 完整的房间 CRUD API
2. Socket.io 基础架构
3. 房间加入/离开事件

### 对于前端开发者：

**今天可以开始：**
1. 使用 Mock 数据开发房间列表界面
2. 使用 Mock 数据创建房间弹窗
3. 使用 Mock 数据开发房间内界面框架

**等待后端完成：**
1. 真实的创建/加入房间功能
2. 真实的 WebSocket 连接
3. 真实的消息发送/接收

---

## 7. 结论

**⚠️ 严重警告：** 当前后端 API **无法支撑前端开发**。核心功能（房间管理、实时通信）的 API 完全缺失。

**建议措施：**
1. **立即暂停前端功能开发**，先完成后端核心 API
2. 或者前端使用 **Mock 数据** 并行开发界面
3. **优先完成：** 房间管理 API + WebSocket 基础架构

**预计完成时间：**
- 后端核心 API（房间+WebSocket）：3-5 天
- 完整后端 API（所有 Phase）：2-3 周
- 前端开发（依赖后端）：3-4 周

**总计：5-7 周完成 MVP**

---

## 附录：数据库 Migration 预览

```sql
-- 立即需要的 Migration
-- 文件: 20260224000000_add_core_tables/migration.sql

-- 1. 添加 Room 表
CREATE TABLE `Room` (
    `id` VARCHAR(36) NOT NULL PRIMARY KEY,
    `roomNumber` VARCHAR(20) NOT NULL UNIQUE,
    `name` VARCHAR(100) NOT NULL,
    `ownerId` VARCHAR(36) NOT NULL,
    `password` VARCHAR(255) NULL,
    `maxPlayers` INT NOT NULL DEFAULT 8,
    `gameType` VARCHAR(50) NOT NULL DEFAULT 'other',
    `connectionMode` ENUM('QUICK', 'GUIDED') NOT NULL DEFAULT 'QUICK',
    `visibility` ENUM('PUBLIC', 'PRIVATE') NOT NULL DEFAULT 'PUBLIC',
    `status` ENUM('ACTIVE', 'INACTIVE', 'DISSOLVED') NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` DATETIME NOT NULL,
    
    INDEX `Room_ownerId_idx` (`ownerId`),
    INDEX `Room_visibility_idx` (`visibility`),
    FOREIGN KEY (`ownerId`) REFERENCES `User`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. 添加 Membership 表
CREATE TABLE `Membership` (
    `id` VARCHAR(36) NOT NULL PRIMARY KEY,
    `roomId` VARCHAR(36) NOT NULL,
    `userId` VARCHAR(36) NOT NULL,
    `role` ENUM('OWNER', 'MEMBER') NOT NULL DEFAULT 'MEMBER',
    `state` ENUM('ONLINE', 'OFFLINE', 'GAMING') NOT NULL DEFAULT 'OFFLINE',
    `joinedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `lastSeen` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE INDEX `Membership_roomId_userId_key` (`roomId`, `userId`),
    INDEX `Membership_roomId_idx` (`roomId`),
    INDEX `Membership_userId_idx` (`userId`),
    FOREIGN KEY (`roomId`) REFERENCES `Room`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. 添加 Message 表
CREATE TABLE `Message` (
    `id` VARCHAR(36) NOT NULL PRIMARY KEY,
    `roomId` VARCHAR(36) NOT NULL,
    `userId` VARCHAR(36) NULL,
    `content` TEXT NOT NULL,
    `type` ENUM('TEXT', 'SYSTEM') NOT NULL DEFAULT 'TEXT',
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    INDEX `Message_roomId_idx` (`roomId`),
    INDEX `Message_createdAt_idx` (`createdAt`),
    FOREIGN KEY (`roomId`) REFERENCES `Room`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. 添加 Tunnel 表
CREATE TABLE `Tunnel` (
    `id` VARCHAR(36) NOT NULL PRIMARY KEY,
    `roomId` VARCHAR(36) NOT NULL,
    `type` ENUM('TCP', 'UDP') NOT NULL,
    `port` INT NOT NULL,
    `mode` ENUM('P2P', 'RELAY') NOT NULL DEFAULT 'RELAY',
    `state` ENUM('CREATED', 'CONNECTING', 'CONNECTED', 'DISCONNECTED', 'FAILED') NOT NULL DEFAULT 'CREATED',
    `rttMs` INT NULL,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` DATETIME NOT NULL,
    
    INDEX `Tunnel_roomId_idx` (`roomId`),
    FOREIGN KEY (`roomId`) REFERENCES `Room`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**请立即执行此 Migration！**

---

**文档结束**

**紧急建议：** 当前项目后端 API **严重不足**，建议：
1. 先执行数据库 Migration
2. 实现核心房间 API（3 个端点）
3. 初始化 WebSocket
4. 然后前端才能开始功能开发