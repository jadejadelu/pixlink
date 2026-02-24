# PixLink 技术实施计划（基于 Astral 优化方案）

**版本:** 1.0  
**日期:** 2026-02-24  
**执行周期:** 4-6 周  
**优先级:** P0（房间号系统）、P1（快速模式）、P2（其他）

---

## 执行摘要

本计划基于 Astral 竞品分析的洞察，实施 7 大优化方案中的核心功能，分 5 个阶段执行，预计耗时 4-6 周。

**关键里程碑：**
- Week 1: 房间号系统（后端 + 前端）
- Week 2: 快速模式界面 + 简化设备配置
- Week 3: 分享码机制
- Week 4: 游客模式 + 集成测试
- Week 5-6: 测试优化 + 文档更新

---

## Phase 1: 房间号系统（Week 1）

**目标:** 实现房间号生成、查询、加入功能，大幅降低分享门槛

### 1.1 数据库变更

**文件:** `pixlink-server/prisma/schema.prisma`

```prisma
model Room {
  id        String   @id @default(uuid())
  roomNumber String  @unique  // 新增：对外展示的房间号
  name      String
  ownerId   String
  password  String?  // 可选密码
  // ... 其他字段
  
  @@index([roomNumber])  // 房间号索引
}
```

**Migration 文件:**
```sql
-- 20260224000000_add_room_number/migration.sql
ALTER TABLE `Room` ADD COLUMN `roomNumber` VARCHAR(20) UNIQUE;
CREATE INDEX `Room_roomNumber_idx` ON `Room`(`roomNumber`);
```

**执行命令:**
```bash
cd pixlink-server
npx prisma migrate dev --name add_room_number
npx prisma generate
```

### 1.2 后端 API 开发

**文件:** `pixlink-server/src/services/roomService.ts`（新增/修改）

```typescript
interface CreateRoomInput {
  name: string;
  roomNumber?: string;  // 用户自定义，可选
  password?: string;
  maxPlayers?: number;
  gameType?: string;
}

interface RoomWithNumber {
  id: string;
  roomNumber: string;
  name: string;
  // ...
}

class RoomService {
  // 生成房间号（如果不提供）
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
  
  // 验证房间号格式
  private validateRoomNumber(roomNumber: string): boolean {
    // 4-6 位数字
    return /^\d{4,6}$/.test(roomNumber);
  }
  
  // 创建房间（支持自定义房间号）
  async createRoom(userId: string, input: CreateRoomInput): Promise<RoomWithNumber> {
    let { roomNumber } = input;
    
    // 如果提供了房间号，验证唯一性
    if (roomNumber) {
      if (!this.validateRoomNumber(roomNumber)) {
        throw new AppError('房间号必须是 4-6 位数字', 400);
      }
      
      const existing = await prisma.room.findUnique({
        where: { roomNumber }
      });
      
      if (existing) {
        throw new AppError('该房间号已被使用', 409);
      }
    } else {
      // 自动生成
      roomNumber = await this.generateRoomNumber();
    }
    
    const room = await prisma.room.create({
      data: {
        roomNumber,
        name: input.name,
        ownerId: userId,
        password: input.password,
        maxPlayers: input.maxPlayers || 8,
        gameType: input.gameType,
        visibility: input.password ? 'PRIVATE' : 'PUBLIC',
        status: 'ACTIVE'
      }
    });
    
    return room;
  }
  
  // 通过房间号查找房间
  async findByRoomNumber(roomNumber: string): Promise<RoomWithNumber | null> {
    return prisma.room.findUnique({
      where: { roomNumber },
      include: {
        owner: {
          select: { id: nickname: true }
        },
        _count: {
          select: { memberships: true }
        }
      }
    });
  }
  
  // 通过房间号加入房间
  async joinByRoomNumber(
    userId: string, 
    roomNumber: string, 
    password?: string
  ): Promise<Membership> {
    const room = await this.findByRoomNumber(roomNumber);
    
    if (!room) {
      throw new AppError('房间不存在', 404);
    }
    
    if (room.status !== 'ACTIVE') {
      throw new AppError('房间已关闭', 400);
    }
    
    // 验证密码
    if (room.password && room.password !== password) {
      throw new AppError('房间密码错误', 403);
    }
    
    // 检查人数限制
    if (room._count.memberships >= room.maxPlayers) {
      throw new AppError('房间已满', 400);
    }
    
    // 创建成员关系
    const membership = await prisma.membership.create({
      data: {
        roomId: room.id,
        userId,
        role: 'MEMBER'
      }
    });
    
    return membership;
  }
}
```

**Controller:** `pixlink-server/src/controllers/roomController.ts`（新增/修改）

```typescript
export class RoomController {
  // POST /api/rooms
  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const room = await roomService.createRoom(req.userId!, req.body);
      
      res.status(201).json({
        success: true,
        data: room,
        message: `房间创建成功！房间号：${room.roomNumber}`
      });
    } catch (error: any) {
      logger.error('Create room error:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        error: error.message
      });
    }
  }
  
  // GET /api/rooms/by-number/:roomNumber
  async getByRoomNumber(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { roomNumber } = req.params;
      const room = await roomService.findByRoomNumber(roomNumber);
      
      if (!room) {
        res.status(404).json({
          success: false,
          error: '房间不存在'
        });
        return;
      }
      
      // 不返回密码
      const { password, ...roomData } = room;
      
      res.json({
        success: true,
        data: roomData
      });
    } catch (error: any) {
      logger.error('Get room by number error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
  
  // POST /api/rooms/join-by-number
  async joinByNumber(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { roomNumber, password } = req.body;
      
      if (!roomNumber) {
        res.status(400).json({
          success: false,
          error: '房间号不能为空'
        });
        return;
      }
      
      const membership = await roomService.joinByRoomNumber(
        req.userId!, 
        roomNumber, 
        password
      );
      
      res.json({
        success: true,
        data: membership,
        message: '成功加入房间'
      });
    } catch (error: any) {
      logger.error('Join room by number error:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        error: error.message
      });
    }
  }
}
```

**Routes:** `pixlink-server/src/routes/roomRoutes.ts`（新增）

```typescript
import { Router } from 'express';
import { roomController } from '../controllers/roomController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.post('/', roomController.create);
router.get('/by-number/:roomNumber', roomController.getByRoomNumber);
router.post('/join-by-number', roomController.joinByNumber);
router.get('/', roomController.list);
router.get('/:id', roomController.getById);
router.post('/:id/join', roomController.join);
router.delete('/:id/leave', roomController.leave);

export default router;
```

### 1.3 前端组件开发

#### 1.3.1 API 服务层

**文件:** `pixlink-client/src/services/roomService.ts`

```typescript
interface CreateRoomRequest {
  name: string;
  roomNumber?: string;
  password?: string;
  maxPlayers?: number;
  gameType?: string;
}

interface JoinByNumberRequest {
  roomNumber: string;
  password?: string;
}

class RoomService {
  // 创建房间（支持自定义房间号）
  async createRoom(data: CreateRoomRequest): Promise<Room> {
    return apiService.request<Room>('/rooms', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
  
  // 通过房间号查找房间
  async findByRoomNumber(roomNumber: string): Promise<Room | null> {
    try {
      return await apiService.request<Room>(`/rooms/by-number/${roomNumber}`);
    } catch (error: any) {
      if (error.message?.includes('不存在')) {
        return null;
      }
      throw error;
    }
  }
  
  // 通过房间号加入
  async joinByNumber(data: JoinByNumberRequest): Promise<Membership> {
    return apiService.request<Membership>('/rooms/join-by-number', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
}

export const roomService = new RoomService();
```

#### 1.3.2 组件：创建房间

**文件:** `pixlink-client/src/components/room/CreateRoomModal.vue`

```vue
<script setup lang="ts">
import { ref, computed } from 'vue';
import { roomService } from '../../services/roomService';
import { useStore } from '../../store';

const store = useStore();
const emit = defineEmits(['close', 'created']);

const form = ref({
  name: '',
  roomNumber: '',
  password: '',
  hasPassword: false,
  maxPlayers: 8,
  gameType: 'minecraft'
});

const loading = ref(false);
const error = ref('');

// 房间号验证
const roomNumberError = computed(() => {
  if (!form.value.roomNumber) return '';
  if (!/^\d{4,6}$/.test(form.value.roomNumber)) {
    return '房间号必须是 4-6 位数字';
  }
  return '';
});

const canSubmit = computed(() => {
  return form.value.name && !roomNumberError.value && !loading.value;
});

// 生成随机房间号
function generateRandomNumber() {
  const min = 1000;
  const max = 999999;
  form.value.roomNumber = Math.floor(Math.random() * (max - min + 1) + min).toString();
}

async function handleSubmit() {
  if (!canSubmit.value) return;
  
  loading.value = true;
  error.value = '';
  
  try {
    const room = await roomService.createRoom({
      name: form.value.name,
      roomNumber: form.value.roomNumber || undefined,
      password: form.value.hasPassword ? form.value.password : undefined,
      maxPlayers: form.value.maxPlayers,
      gameType: form.value.gameType
    });
    
    emit('created', room);
  } catch (err: any) {
    error.value = err.message || '创建房间失败';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <h2>创建新房间</h2>
      
      <div v-if="error" class="error-message">{{ error }}</div>
      
      <form @submit.prevent="handleSubmit">
        <div class="form-group">
          <label>房间名称 *</label>
          <input 
            v-model="form.name" 
            placeholder="例如：Minecraft 生存服"
            required
          />
        </div>
        
        <div class="form-group">
          <label>房间号</label>
          <div class="room-number-input">
            <input 
              v-model="form.roomNumber" 
              placeholder="留空自动生成"
              :class="{ 'input-error': roomNumberError }"
            />
            <button type="button" @click="generateRandomNumber" class="btn-secondary">
              🎲 随机
            </button>
          </div>
          <span v-if="roomNumberError" class="error-text">{{ roomNumberError }}</span>
          <span v-else class="hint">4-6 位数字，便于朋友记忆</span>
        </div>
        
        <div class="form-group">
          <label class="checkbox-label">
            <input type="checkbox" v-model="form.hasPassword" />
            设置房间密码
          </label>
          <input 
            v-if="form.hasPassword"
            v-model="form.password" 
            type="password"
            placeholder="输入密码"
          />
        </div>
        
        <div class="form-group">
          <label>最大人数</label>
          <select v-model="form.maxPlayers">
            <option :value="4">4 人</option>
            <option :value="8">8 人</option>
            <option :value="16">16 人</option>
          </select>
        </div>
        
        <div class="form-group">
          <label>游戏类型</label>
          <select v-model="form.gameType">
            <option value="minecraft">Minecraft</option>
            <option value="stardew">星露谷物语</option>
            <option value="terraria">泰拉瑞亚</option>
            <option value="other">其他</option>
          </select>
        </div>
        
        <div class="modal-actions">
          <button type="button" @click="$emit('close')" class="btn-secondary">
            取消
          </button>
          <button type="submit" :disabled="!canSubmit" class="btn-primary">
            {{ loading ? '创建中...' : '创建房间' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  padding: 24px;
  border-radius: 12px;
  width: 100%;
  max-width: 400px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 4px;
  font-weight: 500;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
}

.room-number-input {
  display: flex;
  gap: 8px;
}

.room-number-input input {
  flex: 1;
}

.input-error {
  border-color: #ef4444;
}

.error-text {
  color: #ef4444;
  font-size: 12px;
}

.hint {
  color: #666;
  font-size: 12px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
}

.error-message {
  background: #fee2e2;
  color: #dc2626;
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 16px;
}
</style>
```

#### 1.3.3 组件：加入房间

**文件:** `pixlink-client/src/components/room/JoinRoomModal.vue`

```vue
<script setup lang="ts">
import { ref, computed } from 'vue';
import { roomService } from '../../services/roomService';

const emit = defineEmits(['close', 'joined']);

const activeTab = ref<'number' | 'code' | 'link'>('number');

const form = ref({
  roomNumber: '',
  password: '',
  shareCode: '',
  inviteLink: ''
});

const loading = ref(false);
const error = ref('');
const roomInfo = ref<Room | null>(null);

// 查找房间
async function lookupRoom() {
  if (!form.value.roomNumber) return;
  
  try {
    const room = await roomService.findByRoomNumber(form.value.roomNumber);
    roomInfo.value = room;
    error.value = '';
  } catch (err: any) {
    roomInfo.value = null;
    error.value = '房间不存在';
  }
}

// 防抖查找
let lookupTimeout: NodeJS.Timeout;
function handleRoomNumberInput() {
  clearTimeout(lookupTimeout);
  lookupTimeout = setTimeout(lookupRoom, 500);
}

async function handleJoin() {
  if (activeTab.value === 'number' && !form.value.roomNumber) {
    error.value = '请输入房间号';
    return;
  }
  
  loading.value = true;
  error.value = '';
  
  try {
    let membership;
    
    if (activeTab.value === 'number') {
      membership = await roomService.joinByNumber({
        roomNumber: form.value.roomNumber,
        password: form.value.password || undefined
      });
    } else if (activeTab.value === 'code') {
      // TODO: 实现分享码加入
      membership = await roomService.joinByShareCode(form.value.shareCode);
    }
    
    emit('joined', membership);
  } catch (err: any) {
    error.value = err.message || '加入房间失败';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <h2>加入房间</h2>
      
      <div class="tabs">
        <button 
          :class="{ active: activeTab === 'number' }"
          @click="activeTab = 'number'"
        >
          🔢 房间号
        </button>
        <button 
          :class="{ active: activeTab === 'code' }"
          @click="activeTab = 'code'"
        >
          📋 分享码
        </button>
        <button 
          :class="{ active: activeTab === 'link' }"
          @click="activeTab = 'link'"
        >
          🔗 邀请链接
        </button>
      </div>
      
      <div v-if="error" class="error-message">{{ error }}</div>
      
      <!-- 房间号加入 -->
      <div v-if="activeTab === 'number'" class="tab-content">
        <div class="form-group">
          <label>房间号</label>
          <input 
            v-model="form.roomNumber" 
            placeholder="输入 4-6 位房间号"
            @input="handleRoomNumberInput"
          />
        </div>
        
        <!-- 房间信息预览 -->
        <div v-if="roomInfo" class="room-preview">
          <h4>{{ roomInfo.name }}</h4>
          <p>房主：{{ roomInfo.owner.nickname }}</p>
          <p>当前人数：{{ roomInfo._count.memberships }}/{{ roomInfo.maxPlayers }}</p>
        </div>
        
        <div class="form-group">
          <label>房间密码（如设置了密码）</label>
          <input 
            v-model="form.password" 
            type="password"
            placeholder="可选"
          />
        </div>
      </div>
      
      <!-- 分享码加入 -->
      <div v-if="activeTab === 'code'" class="tab-content">
        <div class="form-group">
          <label>分享码</label>
          <textarea 
            v-model="form.shareCode" 
            placeholder="粘贴朋友发送的分享码"
            rows="3"
          />
        </div>
      </div>
      
      <!-- 邀请链接加入 -->
      <div v-if="activeTab === 'link'" class="tab-content">
        <p class="hint">点击邀请链接将自动打开应用</p>
        <p>或者将链接粘贴到浏览器地址栏</p>
      </div>
      
      <div class="modal-actions">
        <button type="button" @click="$emit('close')" class="btn-secondary">
          取消
        </button>
        <button 
          @click="handleJoin" 
          :disabled="loading" 
          class="btn-primary"
        >
          {{ loading ? '加入中...' : '加入房间' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 复用 CreateRoomModal 的样式 */
.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  border-bottom: 1px solid #eee;
  padding-bottom: 8px;
}

.tabs button {
  padding: 8px 16px;
  border: none;
  background: none;
  cursor: pointer;
  border-radius: 6px;
}

.tabs button.active {
  background: #667eea;
  color: white;
}

.room-preview {
  background: #f3f4f6;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 16px;
}

.room-preview h4 {
  margin: 0 0 8px 0;
}

.room-preview p {
  margin: 4px 0;
  color: #666;
  font-size: 14px;
}

.hint {
  color: #666;
  font-size: 14px;
}
</style>
```

### 1.4 测试计划

**单元测试:**
```typescript
// roomService.test.ts
describe('RoomService', () => {
  describe('createRoom', () => {
    it('should generate room number if not provided', async () => {
      // 测试自动生成房间号
    });
    
    it('should throw error for duplicate room number', async () => {
      // 测试重复房间号报错
    });
    
    it('should validate room number format', async () => {
      // 测试房间号格式验证
    });
  });
  
  describe('joinByRoomNumber', () => {
    it('should join room successfully', async () => {
      // 测试正常加入
    });
    
    it('should throw error for wrong password', async () => {
      // 测试密码错误
    });
    
    it('should throw error for full room', async () => {
      // 测试房间已满
    });
  });
});
```

**集成测试:**
1. 创建房间 → 生成房间号 → 加入房间
2. 自定义房间号 → 重复创建 → 验证错误
3. 密码保护 → 错误密码 → 正确密码加入

**E2E 测试:**
```typescript
// 用户流程测试
test('用户 A 创建房间，用户 B 通过房间号加入', async () => {
  // 1. 用户 A 登录
  // 2. 创建房间，获取房间号
  // 3. 用户 B 登录
  // 4. 输入房间号加入
  // 5. 验证两人都在房间中
});
```

### 1.5 依赖关系

**前置依赖:** ✅ 已完成（Pinia、ESLint 修复）  
**并行任务:** 可与 Phase 2 部分并行  
**后置依赖:** Phase 3（分享码依赖房间号）

**关键路径:**
```
数据库迁移 → API 开发 → 前端组件 → 集成测试
   (1天)      (2天)       (2天)       (1天)
```

---

## Phase 2: 快速模式界面（Week 1-2）

**目标:** 实现类似 Astral 的简洁连接界面，提供快速/引导两种模式

### 2.1 后端 API 调整

**文件:** `pixlink-server/src/services/roomService.ts`

```typescript
// 新增字段：连接模式
enum ConnectionMode {
  QUICK = 'QUICK',      // 快速模式：显示虚拟 IP
  GUIDED = 'GUIDED'     // 引导模式：准备确认
}

// 修改创建房间接口
interface CreateRoomInput {
  // ... 其他字段
  connectionMode?: ConnectionMode;
}

// Room 模型新增字段
model Room {
  // ... 其他字段
  connectionMode String @default('GUIDED')  // 默认引导模式
}
```

**Migration:**
```sql
ALTER TABLE `Room` ADD COLUMN `connectionMode` VARCHAR(10) DEFAULT 'GUIDED';
```

### 2.2 前端：房间模式切换

**文件:** `pixlink-client/src/components/room/RoomView.vue`（重构）

```vue
<script setup lang="ts">
import { ref, computed } from 'vue';
import { useStore } from '../../store';
import GuidedModePanel from './GuidedModePanel.vue';
import QuickModePanel from './QuickModePanel.vue';

const store = useStore();

// 当前房间数据
const room = computed(() => store.activeRoom);

// 视图模式
const viewMode = ref<'guided' | 'quick'>('guided');

// 根据房间设置初始化
if (room.value?.connectionMode === 'QUICK') {
  viewMode.value = 'quick';
}

// 切换视图
function switchMode(mode: 'guided' | 'quick') {
  viewMode.value = mode;
}
</script>

<template>
  <div class="room-view">
    <!-- 顶部栏 -->
    <RoomHeader 
      :room="room" 
      :viewMode="viewMode"
      @switch-mode="switchMode"
    />
    
    <!-- 主内容区 -->
    <div class="room-content">
      <!-- 左侧：玩家列表 -->
      <PlayerList :roomId="room.id" />
      
      <!-- 中间：根据模式显示不同面板 -->
      <div class="main-panel">
        <GuidedModePanel 
          v-if="viewMode === 'guided'"
          :room="room"
        />
        <QuickModePanel 
          v-else
          :room="room"
        />
      </div>
      
      <!-- 右侧：聊天 -->
      <ChatPanel :roomId="room.id" />
    </div>
  </div>
</template>
```

### 2.3 组件：快速模式面板

**文件:** `pixlink-client/src/components/room/QuickModePanel.vue`

```vue
<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useStore } from '../../store';
import { ztmService } from '../../services/ztmService';

const props = defineProps<{
  room: Room;
}>();

const store = useStore();

// 连接状态
const connectionStatus = ref<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
const virtualIp = ref('');
const ping = ref(0);
const packetLoss = ref(0);
const error = ref('');

// 在线玩家
const onlinePlayers = computed(() => {
  return store.roomPlayers.filter(p => p.status !== 'offline');
});

// 连接按钮文本
const connectButtonText = computed(() => {
  switch (connectionStatus.value) {
    case 'disconnected': return '🔄 连接';
    case 'connecting': return '连接中...';
    case 'connected': return '✓ 已连接';
    case 'error': return '❌ 连接失败';
  }
});

// 自动连接
async function connect() {
  connectionStatus.value = 'connecting';
  error.value = '';
  
  try {
    // 1. 创建隧道
    await ztmService.createTunnel(props.room.id);
    
    // 2. 获取虚拟 IP
    const status = await ztmService.getConnectionStatus();
    virtualIp.value = status.virtualIp;
    
    // 3. Ping 测试
    const pingResult = await ztmService.pingTest();
    ping.value = pingResult.latency;
    packetLoss.value = pingResult.packetLoss;
    
    connectionStatus.value = 'connected';
  } catch (err: any) {
    connectionStatus.value = 'error';
    error.value = err.message;
  }
}

// 复制虚拟 IP
function copyVirtualIp() {
  navigator.clipboard.writeText(virtualIp.value);
  // 显示 toast 提示
}

// 启动游戏
async function launchGame() {
  // 检测游戏类型
  const gameType = props.room.gameType;
  
  // 尝试启动游戏
  await window.__TAURI__.invoke('launch_game', {
    gameType,
    serverIp: virtualIp.value
  });
}

// 打开诊断工具
function openDiagnostics() {
  // 显示诊断面板
}

// 组件挂载时自动连接
onMounted(() => {
  connect();
});

// 定时更新状态
let statusInterval: NodeJS.Timeout;
onMounted(() => {
  statusInterval = setInterval(async () => {
    if (connectionStatus.value === 'connected') {
      const status = await ztmService.getConnectionStatus();
      ping.value = status.latency;
      packetLoss.value = status.packetLoss;
    }
  }, 5000);
});

onUnmounted(() => {
  clearInterval(statusInterval);
});
</script>

<template>
  <div class="quick-mode-panel">
    <!-- 连接状态卡片 -->
    <div class="connection-card" :class="connectionStatus">
      <div class="status-header">
        <span class="status-indicator" :class="connectionStatus"></span>
        <span class="status-text">
          {{ 
            connectionStatus === 'connected' ? '已连接到虚拟网络' :
            connectionStatus === 'connecting' ? '正在建立连接...' :
            connectionStatus === 'error' ? '连接失败' :
            '未连接'
          }}
        </span>
      </div>
      
      <!-- 虚拟 IP 显示 -->
      <div v-if="virtualIp" class="virtual-ip-section">
        <label>您的虚拟 IP 地址</label>
        <div class="ip-display">
          <code>{{ virtualIp }}</code>
          <button @click="copyVirtualIp" class="btn-icon" title="复制">
            📋
          </button>
        </div>
        <p class="hint">在游戏中使用此地址连接服务器</p>
      </div>
      
      <!-- 网络质量 -->
      <div v-if="connectionStatus === 'connected'" class="network-stats">
        <div class="stat">
          <span class="stat-label">延迟</span>
          <span class="stat-value" :class="{
            'good': ping < 50,
            'medium': ping >= 50 && ping < 100,
            'poor': ping >= 100
          }">
            {{ ping }}ms
          </span>
        </div>
        <div class="stat">
          <span class="stat-label">丢包</span>
          <span class="stat-value" :class="{ 'good': packetLoss === 0 }">
            {{ packetLoss }}%
          </span>
        </div>
      </div>
      
      <!-- 错误提示 -->
      <div v-if="error" class="error-message">
        {{ error }}
        <button @click="openDiagnostics" class="btn-text">查看诊断</button>
      </div>
      
      <!-- 连接按钮 -->
      <button 
        v-if="connectionStatus !== 'connected'"
        @click="connect" 
        class="btn-connect"
        :disabled="connectionStatus === 'connecting'"
      >
        {{ connectButtonText }}
      </button>
    </div>
    
    <!-- 在线玩家 -->
    <div class="players-section">
      <h3>👥 在线玩家 ({{ onlinePlayers.length }}人)</h3>
      <div class="player-list">
        <div 
          v-for="player in onlinePlayers" 
          :key="player.id"
          class="player-item"
        >
          <span class="player-avatar">{{ player.nickname[0] }}</span>
          <span class="player-name">{{ player.nickname }}</span>
          <span class="player-ip" v-if="player.virtualIp">{{ player.virtualIp }}</span>
          <span class="player-status" :class="player.status">{{ player.status }}</span>
        </div>
      </div>
    </div>
    
    <!-- 操作按钮 -->
    <div class="action-buttons">
      <button @click="launchGame" class="btn-primary" :disabled="connectionStatus !== 'connected'">
        🎮 启动游戏
      </button>
      <button @click="copyVirtualIp" class="btn-secondary" :disabled="!virtualIp">
        📋 复制 IP
      </button>
    </div>
    
    <!-- 使用提示 -->
    <div class="usage-tips">
      <h4>💡 如何使用</h4>
      <ol>
        <li>点击"连接"加入虚拟网络</li>
        <li>复制您的虚拟 IP 地址</li>
        <li>在游戏中添加服务器，粘贴 IP</li>
        <li>开始联机游戏！</li>
      </ol>
      <a href="#" @click.prevent="$emit('show-tutorial')">查看详细教程 →</a>
    </div>
  </div>
</template>

<style scoped>
.quick-mode-panel {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.connection-card {
  background: #f9fafb;
  border-radius: 12px;
  padding: 24px;
  border: 2px solid #e5e7eb;
}

.connection-card.connected {
  border-color: #10b981;
  background: #ecfdf5;
}

.connection-card.error {
  border-color: #ef4444;
  background: #fef2f2;
}

.status-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.status-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.status-indicator.disconnected { background: #9ca3af; }
.status-indicator.connecting { background: #f59e0b; animation: pulse 1s infinite; }
.status-indicator.connected { background: #10b981; }
.status-indicator.error { background: #ef4444; }

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.status-text {
  font-size: 18px;
  font-weight: 600;
}

.virtual-ip-section {
  margin-bottom: 20px;
}

.virtual-ip-section label {
  display: block;
  color: #6b7280;
  margin-bottom: 8px;
  font-size: 14px;
}

.ip-display {
  display: flex;
  align-items: center;
  gap: 8px;
  background: white;
  padding: 12px 16px;
  border-radius: 8px;
  border: 1px solid #d1d5db;
}

.ip-display code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
  flex: 1;
}

.hint {
  margin-top: 8px;
  color: #6b7280;
  font-size: 13px;
}

.network-stats {
  display: flex;
  gap: 24px;
  margin-bottom: 20px;
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-label {
  font-size: 12px;
  color: #6b7280;
}

.stat-value {
  font-size: 18px;
  font-weight: 600;
}

.stat-value.good { color: #10b981; }
.stat-value.medium { color: #f59e0b; }
.stat-value.poor { color: #ef4444; }

.btn-connect {
  width: 100%;
  padding: 12px;
  border-radius: 8px;
  border: none;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  background: #667eea;
  color: white;
}

.btn-connect:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.players-section h3 {
  margin: 0 0 12px 0;
  font-size: 16px;
  color: #374151;
}

.player-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.player-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background: white;
  border-radius: 8px;
}

.player-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #667eea;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
}

.player-name {
  flex: 1;
  font-weight: 500;
}

.player-ip {
  font-family: monospace;
  font-size: 12px;
  color: #6b7280;
  background: #f3f4f6;
  padding: 2px 8px;
  border-radius: 4px;
}

.player-status {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 12px;
}

.player-status.online {
  background: #d1fae5;
  color: #065f46;
}

.player-status.gaming {
  background: #dbeafe;
  color: #1e40af;
}

.action-buttons {
  display: flex;
  gap: 12px;
}

.action-buttons button {
  flex: 1;
  padding: 12px 24px;
  border-radius: 8px;
  border: none;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
}

.btn-primary {
  background: #10b981;
  color: white;
}

.btn-primary:disabled {
  background: #9ca3af;
}

.btn-secondary {
  background: #f3f4f6;
  color: #374151;
}

.usage-tips {
  background: #eff6ff;
  border-radius: 8px;
  padding: 16px;
}

.usage-tips h4 {
  margin: 0 0 12px 0;
  color: #1e40af;
}

.usage-tips ol {
  margin: 0 0 12px 0;
  padding-left: 20px;
  color: #374151;
}

.usage-tips li {
  margin: 4px 0;
}

.usage-tips a {
  color: #667eea;
  text-decoration: none;
}
</style>
```

### 2.4 组件：引导模式面板

**文件:** `pixlink-client/src/components/room/GuidedModePanel.vue`

```vue
<script setup lang="ts">
import { computed } from 'vue';
import { useStore } from '../../store';
import PlayerReadiness from './PlayerReadiness.vue';
import ConnectionProgress from './ConnectionProgress.vue';
import GamingPanel from './GamingPanel.vue';

const props = defineProps<{
  room: Room;
}>();

const store = useStore();

// 当前阶段
const currentStage = computed(() => {
  const myStatus = store.myStatus;
  if (myStatus === 'gaming') return 'gaming';
  if (myStatus === 'connected') return 'connected';
  if (myStatus === 'connecting') return 'connecting';
  return 'waiting';
});

// 是否房主
const isOwner = computed(() => {
  return store.user?.id === props.room.ownerId;
});

// 所有玩家是否准备
const allReady = computed(() => {
  return store.roomPlayers.every(p => 
    p.status === 'ready' || p.id === props.room.ownerId
  );
});
</script>

<template>
  <div class="guided-mode-panel">
    <!-- 阶段 1：等待准备 -->
    <PlayerReadiness 
      v-if="currentStage === 'waiting'"
      :players="store.roomPlayers"
      :isOwner="isOwner"
      :allReady="allReady"
    />
    
    <!-- 阶段 2：连接中 -->
    <ConnectionProgress 
      v-else-if="currentStage === 'connecting'"
    />
    
    <!-- 阶段 3：已连接，等待开始 -->
    <div v-else-if="currentStage === 'connected'" class="ready-to-start">
      <div class="success-icon">✓</div>
      <h3>所有人都已准备就绪！</h3>
      <p>等待房主开始游戏...</p>
      
      <button 
        v-if="isOwner"
        @click="store.startGame()"
        class="btn-start-game"
      >
        🎮 开始游戏
      </button>
    </div>
    
    <!-- 阶段 4：游戏中 -->
    <GamingPanel 
      v-else-if="currentStage === 'gaming'"
    />
  </div>
</template>
```

### 2.5 测试计划

**单元测试:**
- 模式切换功能
- 连接状态管理
- 虚拟 IP 显示

**集成测试:**
- 快速模式：连接 → 显示 IP → 复制 → 启动游戏
- 引导模式：准备 → 连接 → 开始游戏

**用户测试:**
- A/B 测试：快速模式 vs 引导模式的完成率
- 新手用户是否能理解快速模式
- 网络质量显示是否准确

---

## Phase 3: 简化设备配置流程（Week 2）

**目标:** 将 4 步设备配置合并为 1 步自动流程

### 3.1 后端优化

**当前流程：**
1. 生成身份 → 2. 上传身份 → 3. 接收 Permit → 4. 导入 Permit

**优化后流程：**
```
用户点击"配置设备" → 后台自动完成所有步骤 → 显示结果
```

**文件:** `pixlink-server/src/services/deviceService.ts`

```typescript
// 新增：全自动设备配置
async function autoConfigureDevice(
  userId: string,
  deviceInfo: DeviceInfo
): Promise<{
  success: boolean;
  deviceId: string;
  virtualIp?: string;
  steps: ConfigurationStep[];
}> {
  const steps: ConfigurationStep[] = [];
  
  try {
    // 步骤 1: 生成身份
    steps.push({ name: '生成身份', status: 'running' });
    const identity = await this.generateIdentity(userId, deviceInfo);
    steps[0].status = 'completed';
    
    // 步骤 2: 上传身份
    steps.push({ name: '上传身份', status: 'running' });
    const uploadResult = await this.uploadIdentity(userId, identity);
    steps[1].status = 'completed';
    
    // 步骤 3: 创建证书
    steps.push({ name: '获取证书', status: 'running' });
    const certificate = await this.createCertificate(userId, uploadResult.deviceId);
    steps[2].status = 'completed';
    
    // 步骤 4: 准备 Permit（返回给前端导入）
    steps.push({ name: '准备连接', status: 'running' });
    const permit = await this.generatePermit(certificate);
    steps[3].status = 'completed';
    
    return {
      success: true,
      deviceId: uploadResult.deviceId,
      virtualIp: permit.virtualIp,
      steps
    };
  } catch (error) {
    // 标记失败的步骤
    const currentStep = steps.find(s => s.status === 'running');
    if (currentStep) {
      currentStep.status = 'failed';
      currentStep.error = error.message;
    }
    
    throw error;
  }
}
```

**API 端点:**
```typescript
// POST /api/devices/auto-configure
async function autoConfigure(req: AuthRequest, res: Response) {
  try {
    // 启动异步配置流程
    const jobId = await deviceService.startAutoConfiguration(req.userId, req.body);
    
    // 返回 jobId，前端可以轮询状态
    res.json({
      success: true,
      data: { jobId },
      message: '配置已启动'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

// GET /api/devices/config-status/:jobId
async function getConfigStatus(req: AuthRequest, res: Response) {
  const status = await deviceService.getConfigurationStatus(req.params.jobId);
  res.json({ success: true, data: status });
}
```

### 3.2 前端：一键配置组件

**文件:** `pixlink-client/src/components/device/AutoConfiguration.vue`

```vue
<template>
  <div class="auto-config">
    <div v-if="status === 'idle'" class="start-screen">
      <h2>配置您的设备</h2>
      <p>我们将自动完成所有设置，让您快速开始联机</p>
      <button @click="startConfiguration" class="btn-primary">
        开始配置
      </button>
    </div>
    
    <div v-else-if="status === 'configuring'" class="progress-screen">
      <h3>正在配置...</h3>
      
      <div class="steps">
        <div 
          v-for="(step, index) in steps" 
          :key="index"
          class="step"
          :class="step.status"
        >
          <span class="step-icon">
            {{ 
              step.status === 'completed' ? '✓' :
              step.status === 'running' ? '🔄' :
              step.status === 'failed' ? '✗' :
              '○'
            }}
          </span>
          <span class="step-name">{{ step.name }}</span>
          <span v-if="step.status === 'running'" class="step-spinner"></span>
        </div>
      </div>
      
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
      </div>
    </div>
    
    <div v-else-if="status === 'completed'" class="success-screen">
      <div class="success-icon">🎉</div>
      <h3>配置完成！</h3>
      <p>您的设备已准备好联机</p>
      <div class="virtual-ip" v-if="virtualIp">
        <label>您的虚拟 IP</label>
        <code>{{ virtualIp }}</code>
      </div>
      <button @click="$emit('complete')" class="btn-primary">
        进入应用
      </button>
    </div>
    
    <div v-else-if="status === 'error'" class="error-screen">
      <div class="error-icon">⚠️</div>
      <h3>配置失败</h3>
      <p>{{ errorMessage }}</p>
      <button @click="retry" class="btn-primary">重试</button>
      <button @click="showManualConfig" class="btn-secondary">
        手动配置
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { deviceService } from '../../services/deviceService';

const emit = defineEmits(['complete']);

const status = ref('idle');
const steps = ref([]);
const virtualIp = ref('');
const errorMessage = ref('');

const progressPercent = computed(() => {
  const completed = steps.value.filter(s => s.status === 'completed').length;
  return (completed / steps.value.length) * 100;
});

async function startConfiguration() {
  status.value = 'configuring';
  steps.value = [
    { name: '生成安全身份', status: 'pending' },
    { name: '上传到服务器', status: 'pending' },
    { name: '获取连接证书', status: 'pending' },
    { name: '导入到本地代理', status: 'pending' }
  ];
  
  try {
    const result = await deviceService.autoConfigure();
    
    if (result.success) {
      virtualIp.value = result.virtualIp;
      status.value = 'completed';
      emit('complete');
    }
  } catch (error) {
    status.value = 'error';
    errorMessage.value = error.message;
  }
}

function retry() {
  startConfiguration();
}
</script>
```

### 3.3 配置步骤优化细节

**步骤 1: 生成身份**
- 使用 Web Crypto API 在客户端生成密钥对
- 显示进度动画（0-25%）
- 耗时：1-2 秒

**步骤 2: 上传身份**
- 上传公钥到服务器
- 服务器创建 Device 记录
- 显示进度（25-50%）
- 耗时：网络延迟 + 100ms

**步骤 3: 获取证书**
- 服务器调用 ZTM 创建证书
- 生成 Permit
- 显示进度（50-75%）
- 耗时：2-3 秒

**步骤 4: 导入 Permit**
- 前端通过 Tauri API 调用本地 ZTM Agent
- 自动导入 Permit
- 显示进度（75-100%）
- 耗时：1-2 秒

**总耗时预估：** 5-8 秒（vs 原来的 3-5 分钟手动操作）

---

## Phase 4: 分享码机制（Week 3）

**目标:** 实现类似 Astral 的一键分享码功能

### 4.1 分享码生成与解析

**文件:** `pixlink-server/src/utils/shareCode.ts`

```typescript
import crypto from 'crypto';

interface ShareCodeData {
  roomNumber: string;
  password?: string;
  server: string;
  expiresAt?: number;  // 可选过期时间
}

// 生成分享码
export function generateShareCode(data: ShareCodeData): string {
  const payload = JSON.stringify(data);
  
  // 使用 AES 加密
  const cipher = crypto.createCipher('aes-256-cbc', process.env.SHARE_CODE_SECRET);
  let encrypted = cipher.update(payload, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  
  // 转换为 URL-safe 格式
  return encrypted
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// 解析分享码
export function parseShareCode(code: string): ShareCodeData | null {
  try {
    // 还原 Base64
    let base64 = code
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    
    // 添加 padding
    while (base64.length % 4) {
      base64 += '=';
    }
    
    // 解密
    const decipher = crypto.createDecipher('aes-256-cbc', process.env.SHARE_CODE_SECRET);
    let decrypted = decipher.update(base64, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    const data = JSON.parse(decrypted) as ShareCodeData;
    
    // 检查过期
    if (data.expiresAt && data.expiresAt < Date.now()) {
      throw new Error('分享码已过期');
    }
    
    return data;
  } catch (error) {
    return null;
  }
}
```

### 4.2 API 接口

```typescript
// POST /api/rooms/:id/share-code
async function generateShareCode(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const { expiresIn = 24 } = req.body; // 默认 24 小时
  
  const room = await roomService.getRoom(id);
  
  if (!room) {
    return res.status(404).json({ success: false, error: '房间不存在' });
  }
  
  // 只有房主可以生成分享码
  if (room.ownerId !== req.userId) {
    return res.status(403).json({ success: false, error: '无权操作' });
  }
  
  const shareCode = generateShareCode({
    roomNumber: room.roomNumber,
    password: room.password,
    server: room.server,
    expiresAt: Date.now() + expiresIn * 60 * 60 * 1000
  });
  
  res.json({
    success: true,
    data: { shareCode, expiresIn }
  });
}

// POST /api/rooms/join-by-share-code
async function joinByShareCode(req: AuthRequest, res: Response) {
  const { shareCode } = req.body;
  
  const data = parseShareCode(shareCode);
  
  if (!data) {
    return res.status(400).json({ 
      success: false, 
      error: '无效的分享码或已过期' 
    });
  }
  
  // 使用房间号加入
  const membership = await roomService.joinByRoomNumber(
    req.userId,
    data.roomNumber,
    data.password
  );
  
  res.json({
    success: true,
    data: membership
  });
}
```

### 4.3 前端：分享功能

**文件:** `pixlink-client/src/components/room/ShareMenu.vue`

```vue
<template>
  <div class="share-menu">
    <button @click="showMenu = !showMenu" class="btn-share">
      分享
    </button>
    
    <div v-if="showMenu" class="menu-dropdown">
      <div class="menu-item" @click="copyShareCode">
        <span class="icon">📋</span>
        <div class="item-content">
          <span class="item-title">复制分享码</span>
          <span class="item-desc">推荐：一键复制，朋友粘贴即可加入</span>
        </div>
      </div>
      
      <div class="menu-item" @click="copyRoomInfo">
        <span class="icon">ℹ️</span>
        <div class="item-content">
          <span class="item-title">复制房间信息</span>
          <span class="item-desc">房间号 + 密码，适合口头分享</span>
        </div>
      </div>
      
      <div class="menu-item" @click="copyInviteLink">
        <span class="icon">🔗</span>
        <div class="item-content">
          <span class="item-title">复制邀请链接</span>
          <span class="item-desc">点击链接自动加入</span>
        </div>
      </div>
      
      <div class="menu-item" @click="showQRCode">
        <span class="icon">📱</span>
        <div class="item-content">
          <span class="item-title">生成二维码</span>
          <span class="item-desc">手机扫码快速加入</span>
        </div>
      </div>
    </div>
    
    <!-- 二维码弹窗 -->
    <QRCodeModal 
      v-if="showQR" 
      :value="qrValue"
      @close="showQR = false"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { roomService } from '../../services/roomService';

const props = defineProps({ room: Object });

const showMenu = ref(false);
const showQR = ref(false);
const qrValue = ref('');

async function copyShareCode() {
  const { shareCode } = await roomService.generateShareCode(props.room.id);
  await navigator.clipboard.writeText(shareCode);
  showToast('分享码已复制到剪贴板');
  showMenu.value = false;
}

function copyRoomInfo() {
  const info = `房间号：${props.room.roomNumber}${props.room.password ? '\n密码：' + props.room.password : ''}`;
  navigator.clipboard.writeText(info);
  showToast('房间信息已复制');
  showMenu.value = false;
}

function showQRCode() {
  qrValue.value = `${window.location.origin}/join?code=${props.room.roomNumber}`;
  showQR.value = true;
  showMenu.value = false;
}
</script>
```

---

## Phase 5: 游客模式（Week 4）

**目标:** 允许用户无需注册即可加入房间体验

### 5.1 后端：游客认证

**文件:** `pixlink-server/src/middleware/guestAuth.ts`

```typescript
// 生成临时游客 Token
export function generateGuestToken(guestId: string): string {
  return jwt.sign(
    { 
      guestId, 
      isGuest: true,
      createdAt: Date.now()
    },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
}

// 验证游客 Token
export function verifyGuestToken(token: string): { guestId: string } | null {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;
    if (decoded.isGuest) {
      return { guestId: decoded.guestId };
    }
    return null;
  } catch {
    return null;
  }
}

// 中间件：支持游客访问
export function flexibleAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    
    // 先尝试验证普通用户
    const user = verifyUserToken(token);
    if (user) {
      req.userId = user.id;
      return next();
    }
    
    // 再尝试验证游客
    const guest = verifyGuestToken(token);
    if (guest) {
      req.guestId = guest.guestId;
      req.isGuest = true;
      return next();
    }
  }
  
  // 某些接口允许匿名访问
  if (req.allowAnonymous) {
    return next();
  }
  
  res.status(401).json({ success: false, error: '未授权' });
}
```

### 5.2 API：游客加入

```typescript
// POST /api/guests/join
async function guestJoin(req: Request, res: Response) {
  const { nickname, roomNumber, password } = req.body;
  
  // 生成游客 ID
  const guestId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // 创建临时用户记录（可选，存储在 Redis）
  await redis.setex(`guest:${guestId}`, 86400, JSON.stringify({
    nickname,
    joinedAt: Date.now()
  }));
  
  // 加入房间
  const membership = await roomService.joinByRoomNumber(
    guestId,
    roomNumber,
    password,
    { isGuest: true, nickname }
  );
  
  // 生成 Token
  const token = generateGuestToken(guestId);
  
  res.json({
    success: true,
    data: {
      token,
      guestId,
      nickname,
      membership
    },
    message: '加入成功！建议注册账号以保存数据。'
  });
}
```

### 5.3 前端：游客入口

**文件:** `pixlink-client/src/components/guest/GuestJoinModal.vue`

```vue
<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <h2>快速加入</h2>
      <p class="subtitle">无需注册，输入昵称即可加入</p>
      
      <div class="form-group">
        <label>您的昵称</label>
        <input 
          v-model="nickname" 
          placeholder="例如：小明"
          maxlength="20"
        />
      </div>
      
      <div class="form-group">
        <label>房间号</label>
        <input 
          v-model="roomNumber" 
          placeholder="输入 4-6 位房间号"
        />
      </div>
      
      <div class="form-group">
        <label>房间密码（如需要）</label>
        <input 
          v-model="password" 
          type="password"
          placeholder="可选"
        />
      </div>
      
      <div class="info-box">
        <p>💡 提示：游客模式 24 小时后失效</p>
        <p>建议 <a @click="$emit('register')">注册账号</a> 以保存您的房间记录</p>
      </div>
      
      <div class="modal-actions">
        <button @click="$emit('close')" class="btn-secondary">取消</button>
        <button @click="joinAsGuest" :disabled="!canSubmit" class="btn-primary">
          {{ loading ? '加入中...' : '加入房间' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { guestService } from '../../services/guestService';

const emit = defineEmits(['close', 'joined', 'register']);

const nickname = ref('');
const roomNumber = ref('');
const password = ref('');
const loading = ref(false);

const canSubmit = computed(() => 
  nickname.value.trim() && 
  roomNumber.value.trim() && 
  !loading.value
);

async function joinAsGuest() {
  loading.value = true;
  
  try {
    const result = await guestService.join({
      nickname: nickname.value,
      roomNumber: roomNumber.value,
      password: password.value
    });
    
    // 保存游客 Token
    localStorage.setItem('guest_token', result.token);
    localStorage.setItem('guest_nickname', result.nickname);
    
    emit('joined', result);
  } catch (error) {
    alert(error.message);
  } finally {
    loading.value = false;
  }
}
</script>
```

### 5.4 游客限制

| 功能 | 注册用户 | 游客 |
|------|---------|------|
| 加入房间 | ✅ | ✅ |
| 创建房间 | ✅ | ❌ |
| 语音聊天 | ✅ | ✅（限时） |
| 历史记录 | ✅ | ❌ |
| 好友系统 | ✅ | ❌ |
| 数据保存 | ✅ | 24 小时 |

---

## 总结与执行建议

### 依赖关系图

```
Phase 1: 房间号系统
    │
    ├──→ Phase 2: 快速模式（依赖房间号）
    │
    ├──→ Phase 3: 简化配置（独立）
    │
    └──→ Phase 4: 分享码（依赖房间号）

Phase 5: 游客模式（依赖房间号系统）
```

### 里程碑检查点

**Week 1 结束检查：**
- [ ] 数据库 migration 成功运行
- [ ] API 单元测试通过
- [ ] 创建/加入房间 UI 可交互
- [ ] 房间号生成和验证正确

**Week 2 结束检查：**
- [ ] 快速模式界面完成
- [ ] 自动配置流程可用
- [ ] 新旧流程对比测试

**Week 3 结束检查：**
- [ ] 分享码生成和解析正确
- [ ] 多种分享方式可用
- [ ] 二维码功能正常

**Week 4 结束检查：**
- [ ] 游客可以加入房间
- [ ] 游客限制生效
- [ ] 所有功能集成测试通过

### 风险评估

| 风险 | 可能性 | 影响 | 缓解措施 |
|------|--------|------|----------|
| 房间号冲突 | 中 | 高 | 预生成+唯一性检查 |
| 分享码安全 | 低 | 高 | AES 加密+过期机制 |
| 自动配置失败 | 中 | 中 | 降级到手动配置 |
| 游客滥用 | 中 | 低 | 频率限制+功能限制 |

### 下一步行动

1. **立即开始 Phase 1** - 房间号系统是其他所有功能的基础
2. **准备测试环境** - 需要多台设备测试联机功能
3. **设计审查** - Week 1 结束后审查快速模式设计
4. **用户测试** - Week 2 结束后邀请真实用户测试

### 成功指标

**定量指标：**
- 新用户从下载到首次联机时间 < 3 分钟（优化前 10+ 分钟）
- 房间分享成功率 > 90%（通过房间号）
- 首次配置成功率 > 85%（自动配置）

**定性指标：**
- 用户反馈"简单好用"
- 放弃率降低（通过漏斗分析）
- 口碑传播增加

---

**文档结束**

**建议下一步：** 
1. 审查本计划
2. 确认资源分配
3. 启动 Phase 1 开发
4. 或运行 `/start-work` 让 Sisyphus 代理执行实施