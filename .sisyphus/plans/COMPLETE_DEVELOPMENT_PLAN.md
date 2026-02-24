# PixLink 完整开发规划（整合版）

**版本:** 2.0  
**日期:** 2026-02-24  
**执行周期:** 6-8 周  
**状态:** 设计完成，准备实施

---

## 执行摘要

本规划整合了所有设计文档，包含完整的实施路线图。采用**前后端并行开发**策略，使用 **Mock Service** 使前端不受后端进度阻塞。

**关键里程碑：**
- **Week 1:** 数据库迁移 + 后端核心 API + 前端 Mock Service
- **Week 2-3:** 房间系统完整实现 + 前端房间功能
- **Week 4:** WebSocket 实时通信 + 聊天功能
- **Week 5:** 快速模式 + 设备自动配置
- **Week 6:** 分享码 + 游客模式
- **Week 7-8:** 测试优化 + 文档完善

---

## 1. 现状分析

### 1.1 已完成（Before）

**后端现有 API（26 个）：**
- ✅ 认证系统（17 个接口）：注册/登录/激活/密码重置等
- ✅ 证书管理（4 个接口）：签发/查询/吊销
- ✅ 设备管理（5 个接口）：CRUD 操作

**缺失（Blocking）：**
- ❌ 房间管理 API（9 个接口）
- ❌ 隧道/连接 API（5 个接口）
- ❌ 消息/聊天 API（2 个接口）
- ❌ WebSocket 支持

### 1.2 新设计目标（After）

**核心优化（基于 Astral 启发）：**
1. **房间号系统** - 4-6 位数字，便于口头分享
2. **快速模式** - 类似 Astral 的极简连接体验
3. **自动配置** - 一键完成设备配置（5-8 秒）
4. **分享码** - JWT 格式，一键分享加入
5. **游客模式** - 零注册体验

**预期效果：**
- 首次联机时间：10+ 分钟 → **< 3 分钟**
- 分享成功率：60% → **> 90%**
- 设备配置成功率：70% → **> 85%**

---

## 2. 技术架构总览

### 2.1 系统架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        PixLink System                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐         ┌──────────────┐         ┌─────────┐ │
│  │   Frontend   │◀───────▶│    Backend   │◀───────▶│  MySQL  │ │
│  │  Vue3+Pinia  │  HTTP   │ Node+Express │  Prisma │  DB     │ │
│  │   Tauri      │◀───────▶│  Socket.io   │         │         │ │
│  └──────────────┘   WS    └──────────────┘         └─────────┘ │
│         │                                                       │
│         ▼                                                       │
│  ┌──────────────┐                                               │
│  │   ZTM Agent  │                                               │
│  │  (Local)     │                                               │
│  └──────────────┘                                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 数据库 Schema（关键表）

```prisma
// Room - 房间表（核心）
model Room {
  id        String   @id @default(uuid())
  roomNumber String  @unique           // ⭐ 对外房间号
  name      String
  ownerId   String
  password  String?
  maxPlayers Int     @default(8)
  gameType  String   @default("other")
  connectionMode String @default("QUICK")  // ⭐ 快速/引导模式
  visibility String @default("PUBLIC")
  status    String @default("ACTIVE")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  memberships  Membership[]
  tunnels      Tunnel[]
  messages     Message[]
}

// Membership - 房间成员
model Membership {
  id        String   @id @default(uuid())
  roomId    String
  userId    String
  role      String @default("MEMBER")   // OWNER/MEMBER
  state     String @default("OFFLINE")  // ONLINE/OFFLINE/GAMING/READY
  joinedAt  DateTime @default(now())
  lastSeen  DateTime @default(now())
  
  @@unique([roomId, userId])
}

// Message - 聊天消息
model Message {
  id        String   @id @default(uuid())
  roomId    String
  userId    String?
  content   String
  type      String @default("TEXT")     // TEXT/SYSTEM
  createdAt DateTime @default(now())
}

// Tunnel - 网络隧道
model Tunnel {
  id        String   @id @default(uuid())
  roomId    String
  type      String                      // TCP/UDP
  port      Int
  mode      String @default("RELAY")    // P2P/RELAY
  state     String @default("CREATED")
  rttMs     Int?
}

// RoomShareCode - 分享码
model RoomShareCode {
  id        String   @id @default(uuid())
  roomId    String
  code      String   @unique
  expiresAt DateTime?
  createdBy String
  createdAt DateTime @default(now())
}
```

### 2.3 API 架构

**REST API（HTTP）：**
```
/api/auth/*        - 认证（已有）
/api/rooms/*       - 房间管理（⭐ 新增）
/api/rooms/:id/tunnels  - 隧道管理（⭐ 新增）
/api/devices/*     - 设备管理（已有+扩展）
/api/certs/*       - 证书管理（已有）
/api/connection/*  - 连接状态（⭐ 新增）
```

**WebSocket（Socket.io）：**
```
Event: join_room         - 加入房间
Event: leave_room        - 离开房间
Event: send_message      - 发送消息
Event: update_status     - 更新状态
Event: user_joined       - 用户加入通知
Event: user_left         - 用户离开通知
Event: new_message       - 新消息通知
Event: user_status_changed - 状态变更通知
```

---

## 3. 实施路线图

### Phase 0: 基础准备（Week 1）

#### Day 1-2: 数据库迁移

**执行命令：**
```bash
# 1. 创建 .env 文件
cd /home/me/pixlink/pixlink-server
cat > .env << 'EOF'
PORT=3000
NODE_ENV=development
DATABASE_URL="mysql://root:password@localhost:3306/pixlink"
JWT_SECRET=dev-jwt-secret
SHARE_CODE_SECRET=dev-share-code-secret
EOF

# 2. 更新 Prisma Schema
# 添加 Room, Membership, Message, Tunnel, RoomShareCode 表

# 3. 执行迁移
npx prisma migrate dev --name add_room_system
npx prisma generate
```

**交付物：**
- [ ] `.env` 文件
- [ ] Migration 文件
- [ ] 更新后的 Prisma Client

#### Day 2-3: 后端核心 API

**文件清单：**
```
pixlink-server/src/
├── services/
│   └── roomService.ts          # ⭐ 新增
├── controllers/
│   └── roomController.ts       # ⭐ 新增
├── routes/
│   ├── roomRoutes.ts           # ⭐ 新增
│   └── tunnelRoutes.ts         # ⭐ 新增
└── socket/
    ├── index.ts                # ⭐ 新增
    └── handlers/
        └── roomHandler.ts      # ⭐ 新增
```

**必须实现的 API（阻塞前端）：**
| 优先级 | 接口 | 说明 |
|--------|------|------|
| 🔴 P0 | `POST /api/rooms` | 创建房间 |
| 🔴 P0 | `GET /api/rooms/by-number/:roomNumber` | 查询房间 |
| 🔴 P0 | `POST /api/rooms/join-by-number` | 加入房间 |
| 🔴 P0 | `GET /api/rooms/:id` | 房间详情 |
| 🟡 P1 | Socket.io 基础连接 | WebSocket 初始化 |

**依赖安装：**
```bash
npm install socket.io
```

#### Day 3-5: 前端 Mock Service

**文件清单：**
```
pixlink-client/src/
├── services/
│   ├── mock/
│   │   ├── mockRoomService.ts    # ⭐ 新增
│   │   └── mockSocket.ts         # ⭐ 新增
│   └── apiSwitcher.ts            # ⭐ 新增
└── .env                          # ⭐ 修改
```

**Mock Service 功能：**
- 模拟所有房间相关 API
- 模拟 WebSocket 事件
- 本地存储 Mock 数据
- 模拟网络延迟（300-500ms）

**环境变量：**
```
VITE_API_BASE_URL=http://localhost:3000/api
VITE_USE_MOCK=true
```

**交付物：**
- [ ] Mock Room Service
- [ ] Mock Socket.io
- [ ] API 切换器
- [ ] Mock 数据示例

---

### Phase 1: 房间系统（Week 1-2）

#### Week 1 后端任务

**房间管理 API：**
- `POST /api/rooms` - 创建房间（支持自定义房间号）
- `GET /api/rooms` - 公开房间列表（分页）
- `GET /api/rooms/:id` - 房间详情
- `PUT /api/rooms/:id` - 更新房间设置
- `DELETE /api/rooms/:id` - 解散房间
- `POST /api/rooms/:id/join` - 加入房间
- `DELETE /api/rooms/:id/membership` - 离开房间

**房间号生成逻辑：**
```typescript
private async generateRoomNumber(): Promise<string> {
  const min = 1000;
  const max = 999999;
  let roomNumber: string;
  let exists = true;
  
  while (exists) {
    roomNumber = Math.floor(Math.random() * (max - min + 1) + min).toString();
    const existing = await prisma.room.findUnique({
      where: { roomNumber }
    });
    exists = !!existing;
  }
  
  return roomNumber!;
}
```

**交付物：**
- [ ] 完整的 Room CRUD API
- [ ] 房间号唯一性保证
- [ ] API 测试通过

#### Week 1-2 前端任务

**使用 Mock 数据开发：**

**组件清单：**
```
pixlink-client/src/components/room/
├── CreateRoomModal.vue        # 创建房间弹窗
├── JoinRoomModal.vue          # 加入房间弹窗
├── RoomList.vue               # 房间列表
├── RoomCard.vue               # 房间卡片
├── RoomHeader.vue             # 房间头部
├── PlayerList.vue             # 玩家列表
├── PlayerCard.vue             # 玩家卡片
├── ChatPanel.vue              # 聊天面板
├── MessageList.vue            # 消息列表
├── ChatInput.vue              # 聊天输入
└── QuickModePanel.vue         # 快速模式面板
```

**Store 实现：**
```typescript
// stores/roomStore.ts
export const useRoomStore = defineStore('room', () => {
  // State
  const currentRoom = ref<Room | null>(null);
  const members = ref<Member[]>([]);
  const messages = ref<Message[]>([]);
  
  // Actions
  const createRoom = async (data) => { ... };
  const joinRoom = async (roomNumber) => { ... };
  const leaveRoom = async () => { ... };
  const sendMessage = async (content) => { ... };
  const updateStatus = async (state) => { ... };
  
  // Getters
  const isOwner = computed(() => ...);
  const onlineMembers = computed(() => ...);
  
  return { ... };
});
```

**交付物：**
- [ ] 房间列表页面
- [ ] 创建/加入房间弹窗
- [ ] 房间内界面（三栏布局）
- [ ] 玩家列表和状态
- [ ] 聊天界面（静态消息）

---

### Phase 2: 实时通信（Week 2-3）

#### Week 2 后端任务

**WebSocket 实现：**

**Socket.io 初始化：**
```typescript
// socket/index.ts
import { Server } from 'socket.io';

export function initSocketIO(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: '*' }
  });
  
  io.use(socketAuthMiddleware);
  
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    
    socket.on('join_room', handleJoinRoom);
    socket.on('leave_room', handleLeaveRoom);
    socket.on('send_message', handleSendMessage);
    socket.on('update_status', handleUpdateStatus);
    
    socket.on('disconnect', handleDisconnect);
  });
  
  return io;
}
```

**事件处理：**
- `join_room` - 加入房间广播
- `leave_room` - 离开房间广播
- `send_message` - 消息广播
- `update_status` - 状态同步

**交付物：**
- [ ] Socket.io 服务器
- [ ] 房间事件处理
- [ ] 消息广播机制
- [ ] 状态同步

#### Week 2-3 前端任务

**WebSocket 集成：**

**Composable：**
```typescript
// composables/useWebSocket.ts
export function useWebSocket() {
  const socket = ref<Socket | null>(null);
  const isConnected = ref(false);
  
  function connect() {
    socket.value = io('ws://localhost:3000', {
      query: { token: userStore.token }
    });
    
    socket.value.on('connect', () => {
      isConnected.value = true;
    });
    
    socket.value.on('user_joined', (data) => {
      roomStore.handleUserJoined(data);
    });
    
    socket.value.on('new_message', (data) => {
      roomStore.messages.push(data);
    });
    
    // ... 其他事件
  }
  
  return { socket, isConnected, connect };
}
```

**实时功能：**
- 用户加入/离开实时显示
- 聊天消息实时推送
- 玩家状态实时更新
- 连接断开重连

**交付物：**
- [ ] WebSocket 连接
- [ ] 实时消息接收
- [ ] 状态实时同步
- [ ] 断线重连处理

---

### Phase 3: 快速模式（Week 3-4）

#### Week 3 后端任务

**快速模式 API：**

**连接管理：**
```typescript
// GET /api/connection/status
{
  "status": "connected",
  "virtualIp": "10.126.126.5",
  "latency": 15,
  "packetLoss": 0,
  "tunnelCount": 2
}

// GET /api/connection/diagnostics
{
  "checks": [
    { "name": "本地网络", "status": "pass" },
    { "name": "ZTM Agent", "status": "pass" },
    { "name": "服务器连接", "status": "pass" },
    { "name": "NAT 类型", "status": "warn", "message": "Symmetric" }
  ],
  "overall": "good"
}
```

**隧道管理：**
- `POST /api/rooms/:id/tunnels` - 创建隧道
- `GET /api/rooms/:id/tunnels` - 获取隧道列表

**交付物：**
- [ ] 连接状态 API
- [ ] 网络诊断 API
- [ ] 隧道管理 API

#### Week 3-4 前端任务

**快速模式界面：**

**组件：** `QuickModePanel.vue`

```vue
<template>
  <div class="quick-mode-panel">
    <!-- 连接状态卡片 -->
    <ConnectionCard 
      :status="connectionStatus"
      @connect="handleConnect"
    />
    
    <!-- 虚拟 IP 显示 -->
    <VirtualIpDisplay 
      v-if="virtualIp"
      :ip="virtualIp"
      @copy="copyToClipboard"
    />
    
    <!-- 网络统计 -->
    <NetworkStats 
      :latency="latency"
      :packet-loss="packetLoss"
    />
    
    <!-- 在线玩家 -->
    <PlayerStatusList :players="onlinePlayers" />
    
    <!-- 操作按钮 -->
    <div class="actions">
      <button @click="launchGame" :disabled="!isConnected">
        🎮 启动游戏
      </button>
      <button @click="copyVirtualIp">
        📋 复制 IP
      </button>
    </div>
  </div>
</template>
```

**功能：**
- 一键连接
- 虚拟 IP 显示
- 网络延迟实时显示
- 启动游戏按钮

**交付物：**
- [ ] 快速模式界面
- [ ] 连接状态显示
- [ ] 虚拟 IP 复制
- [ ] 网络统计

---

### Phase 4: 设备自动配置（Week 4）

#### Week 4 后端任务

**自动配置 API：**

```typescript
// POST /api/devices/auto-configure
async function autoConfigure(req, res) {
  const steps = [
    { name: '生成身份', status: 'running' },
    { name: '上传身份', status: 'pending' },
    { name: '获取证书', status: 'pending' },
    { name: '导入 Permit', status: 'pending' }
  ];
  
  try {
    // 步骤 1: 生成身份
    const identity = await generateIdentity();
    steps[0].status = 'completed';
    
    // 步骤 2: 上传
    const device = await uploadIdentity(identity);
    steps[1].status = 'completed';
    
    // 步骤 3: 获取证书
    const certificate = await createCertificate(device.id);
    steps[2].status = 'completed';
    
    // 步骤 4: 返回 Permit（前端导入）
    const permit = await generatePermit(certificate);
    steps[3].status = 'completed';
    
    res.json({
      success: true,
      data: { deviceId: device.id, virtualIp: permit.virtualIp, steps }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      steps
    });
  }
}
```

**交付物：**
- [ ] 自动配置 API
- [ ] 步骤进度追踪
- [ ] 错误处理和回滚

#### Week 4 前端任务

**自动配置界面：**

**组件：** `AutoConfiguration.vue`

```vue
<template>
  <div class="auto-config">
    <div v-if="status === 'configuring'">
      <h3>正在配置...</h3>
      
      <div class="steps">
        <div 
          v-for="step in steps" 
          :key="step.name"
          :class="['step', step.status]"
        >
          <span>{{ step.status === 'completed' ? '✓' : step.status === 'running' ? '🔄' : '○' }}</span>
          <span>{{ step.name }}</span>
        </div>
      </div>
      
      <div class="progress-bar">
        <div class="fill" :style="{ width: progress + '%' }"></div>
      </div>
    </div>
    
    <div v-else-if="status === 'completed'">
      <div class="success">🎉</div>
      <h3>配置完成！</h3>
      <p>虚拟 IP: {{ virtualIp }}</p>
      <button @click="$emit('complete')">进入应用</button>
    </div>
  </div>
</template>
```

**交付物：**
- [ ] 自动配置组件
- [ ] 步骤进度显示
- [ ] 完成/错误状态

---

### Phase 5: 分享码 + 游客模式（Week 5）

#### Week 5 后端任务

**分享码 API：**

```typescript
// POST /api/rooms/:id/share-codes
function generateShareCode(data) {
  const payload = {
    rn: room.roomNumber,
    pw: room.password,
    exp: Date.now() + (expiresIn * 60 * 60 * 1000)
  };
  
  return jwt.sign(payload, process.env.SHARE_CODE_SECRET);
}
```

**游客认证：**

```typescript
// POST /api/guests/join
function guestJoin(req, res) {
  const guestId = `guest_${Date.now()}_${random()}`;
  const token = generateGuestToken(guestId);
  
  // 不存储到数据库！
  res.json({
    token,
    guestId,
    expiresIn: '24h'
  });
}
```

**交付物：**
- [ ] 分享码生成/解析
- [ ] 游客 Token 生成
- [ ] 游客权限控制

#### Week 5 前端任务

**分享功能：**

**组件：** `ShareMenu.vue`

```vue
<template>
  <div class="share-menu">
    <button @click="showMenu = true">分享</button>
    
    <div v-if="showMenu" class="dropdown">
      <div @click="copyShareCode">📋 复制分享码</div>
      <div @click="copyRoomInfo">ℹ️ 复制房间信息</div>
      <div @click="showQRCode">📱 二维码</div>
    </div>
  </div>
</template>
```

**游客加入：**

**组件：** `GuestJoinModal.vue`

- 输入昵称（无需注册）
- 输入房间号
- 一键加入
- 提示注册

**交付物：**
- [ ] 分享菜单
- [ ] 二维码生成
- [ ] 游客加入界面

---

### Phase 6: 测试优化（Week 6-8）

#### Week 6: 测试

**单元测试：**
- 组件单元测试（Vitest）
- Store 测试
- Service 测试

**集成测试：**
- API 集成测试
- WebSocket 测试
- 房间流程测试

**E2E 测试：**
- 创建房间流程
- 加入房间流程
- 聊天功能测试
- 游戏联机测试（手动）

#### Week 7-8: 优化文档

**性能优化：**
- 虚拟滚动（消息列表）
- 懒加载（房间列表）
- 图片压缩

**文档：**
- API 文档完善
- 用户手册
- 开发者文档
- README 更新

---

## 4. 前后端协作流程

### 4.1 并行开发策略

**Week 1:**
```
后端              前端
  │                │
  ├─ DB Migration  │
  ├─ Core API ─────┼─ Mock Service
  │                ├─ Room UI (Mock)
  │                │
  └─ WebSocket ────┼─ Static UI
```

**Week 2-3:**
```
后端              前端
  │                │
  ├─ API Expand ───┼─ Integrate API
  ├─ WebSocket ────┼─ Real-time Chat
  │                │
  └─ Bug Fix ──────┼─ Bug Fix
```

### 4.2 API 契约

**接口文档：** `.sisyphus/plans/api-documentation.md`

**变更管理：**
1. 后端修改 API → 更新文档
2. 通知前端开发者
3. 前端同步修改
4. 联调验证

### 4.3 沟通机制

**每日同步：**
- 进度更新
- 阻塞问题
- 接口变更

**每周回顾：**
- 完成度检查
- 计划调整
- 技术债务

---

## 5. 关键决策记录

| 决策 | 选择 | 原因 |
|------|------|------|
| 房间号 | 随机生成 | 简化实现，无需自定义逻辑 |
| 分享码 | JWT | 自包含，无需数据库查询验证 |
| 游客模式 | 不存储 | 简化设计，Token 包含所有信息 |
| 默认模式 | 快速模式 | 对标 Astral，降低门槛 |
| 断线重连 | 自动 | 提升用户体验 |
| 移动端 | 不考虑 | 专注桌面端 MVP |

---

## 6. 风险管理

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| 房间号冲突 | 低 | 高 | 预生成 + 唯一性检查 |
| WebSocket 不稳定 | 中 | 高 | 重连机制 + 降级到 HTTP |
| 自动配置失败 | 中 | 中 | 降级到手动配置 |
| 进度延迟 | 中 | 中 | 分阶段交付，MVP 优先 |
| 性能问题 | 低 | 中 | 虚拟滚动 + 分页加载 |

---

## 7. 成功指标

### 定量指标

| 指标 | 优化前 | 目标 |
|------|--------|------|
| 首次联机时间 | 10+ 分钟 | **< 3 分钟** |
| 分享成功率 | 60% | **> 90%** |
| 配置成功率 | 70% | **> 85%** |
| 用户放弃率 | 40% | **< 20%** |

### 定性指标

- 用户反馈"简单好用"
- 口碑传播增长
- 复用率提升

---

## 8. 立即行动项

### 今天（紧急）

1. **执行数据库 Migration**
   ```bash
   cd pixlink-server
   # 创建 .env 文件
   # 更新 prisma/schema.prisma
   npx prisma migrate dev --name add_room_system
   ```

2. **创建 Mock Service**
   ```bash
   cd pixlink-client
   # 创建 src/services/mock/ 目录
   # 实现 mockRoomService.ts
   # 设置 VITE_USE_MOCK=true
   ```

3. **提交 Commit**
   ```bash
   git add -A
   git commit -m "chore: setup room system foundation
   
   - Add Room, Membership, Message, Tunnel models to Prisma schema
   - Create database migration
   - Setup Mock Service for parallel development
   - Add complete development planning documentation"
   ```

### 本周（Week 1）

**后端：**
- [ ] Room Service 基础实现
- [ ] 3 个核心 API（创建/查询/加入）
- [ ] Socket.io 初始化

**前端：**
- [ ] Mock Service 完整实现
- [ ] 房间列表页面
- [ ] 创建/加入房间弹窗
- [ ] 房间内界面框架

---

## 9. 相关文档

| 文档 | 路径 | 说明 |
|------|------|------|
| 技术实施计划 | `.sisyphus/plans/technical-implementation-plan.md` | Phase 1-5 详细计划 |
| 数据库 ERD | `.sisyphus/plans/database-erd-design.md` | 完整 Schema + Migration |
| API 接口文档 | `.sisyphus/plans/api-documentation.md` | OpenAPI 规范 |
| WebSocket 协议 | `.sisyphus/plans/websocket-protocol.md` | Socket.io 事件定义 |
| 错误码手册 | `.sisyphus/plans/error-code-handbook.md` | 错误处理规范 |
| 组件架构图 | `.sisyphus/plans/component-architecture.md` | Vue 组件设计 |
| Mock Service | `.sisyphus/plans/mock-service.md` | Mock 实现指南 |
| API 差距分析 | `.sisyphus/plans/api-gap-analysis.md` | 现状对比分析 |
| Astral 优化 | `.sisyphus/plans/astral-inspired-optimization.md` | 设计灵感来源 |
| 房间内界面 | `.sisyphus/plans/room-interface-design.md` | 详细 UI/UX 设计 |
| 用户用例 | `.sisyphus/plans/USER_STORIES_UI_UX.md` | 用户故事 |

---

## 10. 文档结束

**总计 11 份设计文档，涵盖：**
- ✅ 完整数据库设计
- ✅ 前后端 API 设计
- ✅ WebSocket 实时通信
- ✅ 错误处理规范
- ✅ 组件架构设计
- ✅ Mock Service 实现
- ✅ 6-8 周实施路线图

**项目已准备就绪，可以开始实施！**

**下一步：**
1. 执行数据库 Migration
2. 创建 Mock Service
3. 提交初始 Commit
4. 开始 Week 1 开发

**运行 `/start-work` 让 Sisyphus 代理执行实施，或手动按照本文档执行。**