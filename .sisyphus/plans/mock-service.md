# PixLink Mock Service 文档

**版本:** 1.0  
**日期:** 2026-02-24  
**用途:** 前端并行开发，模拟后端 API

---

## 1. 手动执行数据库 Migration

### 步骤 1：创建 .env 文件

```bash
cd /home/me/pixlink/pixlink-server

# 创建 .env 文件
cat > .env << 'EOF'
# Server Configuration
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL="mysql://root:password@localhost:3306/pixlink"

# JWT Secret
JWT_SECRET=dev-jwt-secret-change-in-production
JWT_EXPIRES_IN=7d

# Certificate Authority Configuration
CA_CERT_PATH=./certs/ca.crt
CA_KEY_PATH=./certs/ca.key
CERT_VALIDITY_DAYS=90

# Enrollment Token Configuration
ENROLLMENT_TOKEN_TTL=300

# Activation Token Configuration
ACTIVATION_TOKEN_TTL=180

# Email/SMS Configuration
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=test@example.com
SMTP_PASS=test-password

# Frontend URL
FRONTEND_URL=http://localhost:5173

# ZTM Hub Configuration
ZTM_HUB_ADDRESS=ztm-hub:8888
ZTM_ROOT_AGENT_URL=http://localhost:7777
ZTM_MESH_NAME=ztm-hub:8888

# Share Code Secret
SHARE_CODE_SECRET=dev-share-code-secret
EOF
```

### 步骤 2：更新 Prisma Schema

将以下内容 **追加** 到 `prisma/schema.prisma`：

```prisma
// ============ 新增表 ============

model Room {
  id        String   @id @default(uuid())
  roomNumber String  @unique
  name      String
  ownerId   String
  password  String?
  maxPlayers Int     @default(8)
  gameType  String   @default("other")
  connectionMode String @default("QUICK")
  visibility String @default("PUBLIC")
  status    String @default("ACTIVE")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  owner        User            @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  memberships  Membership[]
  tunnels      Tunnel[]
  messages     Message[]

  @@index([ownerId])
  @@index([visibility])
  @@index([status])
}

model Membership {
  id        String   @id @default(uuid())
  roomId    String
  userId    String
  role      String @default("MEMBER")
  state     String @default("OFFLINE")
  joinedAt  DateTime @default(now())
  lastSeen  DateTime @default(now())

  room      Room     @relation(fields: [roomId], references: [id], onDelete: Cascade)
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([roomId, userId])
  @@index([roomId])
  @@index([userId])
}

model Tunnel {
  id        String   @id @default(uuid())
  roomId    String
  type      String
  port      Int
  mode      String @default("RELAY")
  state     String @default("CREATED")
  rttMs     Int?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  room      Room     @relation(fields: [roomId], references: [id], onDelete: Cascade)

  @@index([roomId])
}

model Message {
  id        String   @id @default(uuid())
  roomId    String
  userId    String?
  content   String
  type      String @default("TEXT")
  createdAt DateTime @default(now())

  room      Room     @relation(fields: [roomId], references: [id], onDelete: Cascade)
  user      User?    @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([roomId])
  @@index([createdAt])
}
```

### 步骤 3：执行 Migration

```bash
cd /home/me/pixlink/pixlink-server

# 确保依赖已安装
npm install

# 执行迁移
npx prisma migrate dev --name add_room_system

# 生成客户端
npx prisma generate
```

**注意:** 需要确保 MySQL 数据库已运行。如果数据库未运行，可以使用：

```bash
# 使用 Docker 启动 MySQL
docker run -d \
  --name pixlink-mysql \
  -e MYSQL_ROOT_PASSWORD=password \
  -e MYSQL_DATABASE=pixlink \
  -p 3306:3306 \
  mysql:8.0
```

---

## 2. 前端 Mock Service

### 2.1 创建 Mock Service 文件

**文件:** `pixlink-client/src/services/mock/mockRoomService.ts`

```typescript
// src/services/mock/mockRoomService.ts
import type { Room, Membership, Member, Message } from '@/types';

// Mock 数据存储
let mockRooms: Room[] = [
  {
    id: 'room-1',
    roomNumber: '9527',
    name: 'Minecraft 生存服',
    ownerId: 'user-1',
    maxPlayers: 8,
    gameType: 'minecraft',
    connectionMode: 'QUICK',
    visibility: 'PUBLIC',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    owner: {
      id: 'user-1',
      nickname: '老王'
    },
    members: [
      {
        userId: 'user-1',
        nickname: '老王',
        role: 'OWNER',
        state: 'ONLINE',
        virtualIp: '10.126.126.1'
      },
      {
        userId: 'user-2',
        nickname: '小明',
        role: 'MEMBER',
        state: 'READY',
        virtualIp: '10.126.126.2'
      }
    ]
  }
];

let mockMemberships: Membership[] = [];
let mockMessages: Message[] = [
  {
    id: 'msg-1',
    roomId: 'room-1',
    userId: 'user-1',
    nickname: '老王',
    content: '欢迎大家！',
    type: 'TEXT',
    createdAt: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: 'msg-2',
    roomId: 'room-1',
    type: 'SYSTEM',
    content: '小明加入了房间',
    createdAt: new Date(Date.now() - 3000000).toISOString()
  },
  {
    id: 'msg-3',
    roomId: 'room-1',
    userId: 'user-2',
    nickname: '小明',
    content: '大家好！',
    type: 'TEXT',
    createdAt: new Date(Date.now() - 2400000).toISOString()
  }
];

// 模拟延迟
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const mockRoomService = {
  // 创建房间
  async createRoom(data: {
    name: string;
    roomNumber?: string;
    password?: string;
    maxPlayers?: number;
    gameType?: string;
    connectionMode?: 'QUICK' | 'GUIDED';
  }): Promise<Room> {
    await delay(500);
    
    const roomNumber = data.roomNumber || Math.floor(1000 + Math.random() * 899999).toString();
    
    const newRoom: Room = {
      id: `room-${Date.now()}`,
      roomNumber,
      name: data.name,
      ownerId: 'current-user',
      maxPlayers: data.maxPlayers || 8,
      gameType: data.gameType || 'other',
      connectionMode: data.connectionMode || 'QUICK',
      visibility: data.password ? 'PRIVATE' : 'PUBLIC',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      owner: {
        id: 'current-user',
        nickname: '我'
      },
      members: [
        {
          userId: 'current-user',
          nickname: '我',
          role: 'OWNER',
          state: 'ONLINE',
          virtualIp: '10.126.126.1'
        }
      ]
    };
    
    mockRooms.push(newRoom);
    return newRoom;
  },

  // 通过房间号查询
  async findByRoomNumber(roomNumber: string): Promise<Room | null> {
    await delay(300);
    
    const room = mockRooms.find(r => r.roomNumber === roomNumber);
    if (!room) return null;
    
    // 移除敏感信息
    const { password, ...roomData } = room;
    return roomData as Room;
  },

  // 加入房间
  async joinByNumber(data: {
    roomNumber: string;
    password?: string;
    nickname?: string;
  }): Promise<{ membership: Membership; room: Room }> {
    await delay(500);
    
    const room = mockRooms.find(r => r.roomNumber === data.roomNumber);
    if (!room) {
      throw new Error('房间不存在');
    }
    
    if (room.password && room.password !== data.password) {
      throw new Error('房间密码错误');
    }
    
    if (room.members.length >= room.maxPlayers) {
      throw new Error('房间已满');
    }
    
    const membership: Membership = {
      id: `membership-${Date.now()}`,
      roomId: room.id,
      userId: 'current-user',
      role: 'MEMBER',
      joinedAt: new Date().toISOString()
    };
    
    mockMemberships.push(membership);
    
    // 添加成员到房间
    room.members.push({
      userId: 'current-user',
      nickname: data.nickname || '我',
      role: 'MEMBER',
      state: 'ONLINE',
      virtualIp: `10.126.126.${room.members.length + 1}`
    });
    
    return { membership, room };
  },

  // 获取房间列表
  async getRooms(params?: { page?: number; limit?: number; gameType?: string }): Promise<{
    rooms: Room[];
    pagination: any;
  }> {
    await delay(300);
    
    let rooms = mockRooms.filter(r => r.visibility === 'PUBLIC');
    
    if (params?.gameType) {
      rooms = rooms.filter(r => r.gameType === params.gameType);
    }
    
    return {
      rooms: rooms.map(r => {
        const { password, ...roomData } = r;
        return roomData as Room;
      }),
      pagination: {
        page: params?.page || 1,
        limit: params?.limit || 20,
        total: rooms.length,
        totalPages: Math.ceil(rooms.length / (params?.limit || 20))
      }
    };
  },

  // 获取房间消息
  async getMessages(roomId: string): Promise<Message[]> {
    await delay(200);
    return mockMessages.filter(m => m.roomId === roomId);
  },

  // 发送消息（模拟 WebSocket）
  async sendMessage(roomId: string, content: string): Promise<Message> {
    await delay(100);
    
    const message: Message = {
      id: `msg-${Date.now()}`,
      roomId,
      userId: 'current-user',
      nickname: '我',
      content,
      type: 'TEXT',
      createdAt: new Date().toISOString()
    };
    
    mockMessages.push(message);
    return message;
  },

  // 更新状态（模拟）
  async updateStatus(roomId: string, state: string): Promise<void> {
    await delay(100);
    
    const room = mockRooms.find(r => r.id === roomId);
    if (room) {
      const member = room.members.find(m => m.userId === 'current-user');
      if (member) {
        member.state = state;
      }
    }
  },

  // 离开房间
  async leaveRoom(roomId: string): Promise<void> {
    await delay(300);
    
    const room = mockRooms.find(r => r.id === roomId);
    if (room) {
      room.members = room.members.filter(m => m.userId !== 'current-user');
    }
    
    mockMemberships = mockMemberships.filter(m => m.roomId !== roomId);
  }
};
```

### 2.2 Mock Socket.io Service

**文件:** `pixlink-client/src/services/mock/mockSocket.ts`

```typescript
// src/services/mock/mockSocket.ts
import { ref } from 'vue';
import type { Member, Message } from '@/types';

// Mock Socket.io 客户端
class MockSocket {
  private listeners: Map<string, Function[]> = new Map();
  private isConnected = ref(false);
  private mockLatency = 50; // ms

  connect() {
    setTimeout(() => {
      this.isConnected.value = true;
      this.emit('connect');
    }, this.mockLatency);
  }

  disconnect() {
    this.isConnected.value = false;
    this.emit('disconnect');
  }

  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback?: Function) {
    if (!callback) {
      this.listeners.delete(event);
      return;
    }
    
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  emit(event: string, ...args: any[]) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(cb => {
        setTimeout(() => cb(...args), this.mockLatency);
      });
    }
  }

  // 模拟发送事件到服务器
  emitToServer(event: string, payload: any) {
    setTimeout(() => {
      this.handleServerEvent(event, payload);
    }, this.mockLatency);
  }

  // 模拟服务器响应
  private handleServerEvent(event: string, payload: any) {
    switch (event) {
      case 'join_room':
        // 模拟加入成功
        this.emit('room_joined', {
          room: payload,
          members: []
        });
        
        // 模拟系统消息
        setTimeout(() => {
          this.emit('new_message', {
            id: `system-${Date.now()}`,
            type: 'SYSTEM',
            content: '我加入了房间',
            createdAt: new Date().toISOString()
          });
        }, 500);
        break;

      case 'send_message':
        // 模拟消息确认
        this.emit('message_ack', {
          clientMessageId: payload.messageId,
          serverMessageId: `server-${Date.now()}`,
          status: 'delivered'
        });
        
        // 模拟广播消息（如果是自己的消息，延迟后显示）
        setTimeout(() => {
          this.emit('new_message', {
            id: `server-${Date.now()}`,
            userId: 'current-user',
            nickname: '我',
            content: payload.content,
            type: 'TEXT',
            createdAt: new Date().toISOString()
          });
        }, 200);
        break;

      case 'update_status':
        this.emit('user_status_changed', {
          userId: 'current-user',
          previousState: 'ONLINE',
          currentState: payload.state,
          updatedAt: new Date().toISOString()
        });
        break;
    }
  }

  // 模拟接收其他用户的事件
  simulateOtherUserJoined(user: Member) {
    this.emit('user_joined', user);
    this.emit('new_message', {
      id: `system-${Date.now()}`,
      type: 'SYSTEM',
      content: `${user.nickname} 加入了房间`,
      createdAt: new Date().toISOString()
    });
  }

  simulateOtherUserLeft(userId: string, nickname: string) {
    this.emit('user_left', {
      userId,
      nickname,
      reason: 'leave'
    });
    this.emit('new_message', {
      id: `system-${Date.now()}`,
      type: 'SYSTEM',
      content: `${nickname} 离开了房间`,
      createdAt: new Date().toISOString()
    });
  }

  simulateReceiveMessage(message: Message) {
    this.emit('new_message', message);
  }
}

export const mockSocket = new MockSocket();
```

### 2.3 API Service 切换器

**文件:** `pixlink-client/src/services/apiSwitcher.ts`

```typescript
// src/services/apiSwitcher.ts
import { roomService as realRoomService } from './roomService';
import { mockRoomService } from './mock/mockRoomService';

// 环境变量控制是否使用 Mock
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

export const roomService = USE_MOCK ? mockRoomService : realRoomService;

// 导出其他服务...
```

### 2.4 环境变量配置

**文件:** `pixlink-client/.env`

```
VITE_API_BASE_URL=http://localhost:3000/api
VITE_USE_MOCK=true
```

---

## 3. Mock 数据示例

### 3.1 房间列表

```json
[
  {
    "id": "room-1",
    "roomNumber": "9527",
    "name": "Minecraft 生存服",
    "owner": { "id": "user-1", "nickname": "老王" },
    "maxPlayers": 8,
    "currentPlayers": 3,
    "gameType": "minecraft",
    "hasPassword": false
  },
  {
    "id": "room-2",
    "roomNumber": "6666",
    "name": "星露谷物语联机",
    "owner": { "id": "user-3", "nickname": "Alice" },
    "maxPlayers": 4,
    "currentPlayers": 2,
    "gameType": "stardew",
    "hasPassword": true
  }
]
```

### 3.2 房间内成员

```json
[
  {
    "userId": "user-1",
    "nickname": "老王",
    "role": "OWNER",
    "state": "ONLINE",
    "virtualIp": "10.126.126.1"
  },
  {
    "userId": "user-2",
    "nickname": "小明",
    "role": "MEMBER",
    "state": "READY",
    "virtualIp": "10.126.126.2"
  },
  {
    "userId": "current-user",
    "nickname": "我",
    "role": "MEMBER",
    "state": "ONLINE",
    "virtualIp": "10.126.126.3"
  }
]
```

### 3.3 聊天记录

```json
[
  {
    "id": "msg-1",
    "userId": "user-1",
    "nickname": "老王",
    "content": "欢迎大家！",
    "type": "TEXT",
    "createdAt": "2026-02-24T10:00:00Z"
  },
  {
    "id": "msg-2",
    "type": "SYSTEM",
    "content": "小明加入了房间",
    "createdAt": "2026-02-24T10:05:00Z"
  }
]
```

---

## 4. 使用 Mock 开发的流程

### 开发时：

1. 设置 `VITE_USE_MOCK=true`
2. 使用 Mock 数据开发界面和交互
3. 所有 API 调用都有模拟延迟和响应

### 联调时：

1. 后端完成真实 API
2. 设置 `VITE_USE_MOCK=false`
3. 替换为真实 API 调用
4. 调整差异（如有）

---

## 5. 扩展 Mock 数据

要添加更多 Mock 房间或测试场景：

```typescript
// 在 mockRoomService.ts 中添加
mockRooms.push({
  id: 'room-test',
  roomNumber: '1234',
  name: '测试房间',
  // ... 其他字段
});
```

---

## 文档结束

**使用 Mock 开发的优势：**
- ✅ 不依赖后端进度，前端可以立即开始
- ✅ 定义好 API 契约，前后端并行开发
- ✅ 可以模拟各种边界情况和错误场景
- ✅ 便于单元测试和 E2E 测试

**下一步：** 前端开发者可以使用这些 Mock Service 立即开始房间相关功能的开发。