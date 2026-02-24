# PixLink 前端组件架构图

**版本:** 2.0  
**日期:** 2026-02-24  
**框架:** Vue 3 + TypeScript + Pinia  
**UI 风格:** 组件化、模块化

---

## 1. 整体架构

```
pixlink-client/src/
│
├── main.ts                 # 应用入口
├── App.vue                 # 根组件
├── router/                 # 路由配置（如添加 Vue Router）
│   └── index.ts
│
├── components/             # 组件目录
│   ├── common/            # 通用组件
│   ├── auth/              # 认证相关
│   ├── room/              # 房间相关
│   ├── device/            # 设备配置
│   └── layout/            # 布局组件
│
├── views/                 # 页面级组件（视图）
│   ├── HomeView.vue
│   ├── RoomView.vue
│   ├── RoomListView.vue
│   └── SettingsView.vue
│
├── stores/                # Pinia Store
│   ├── index.ts          # 主 Store
│   ├── roomStore.ts      # 房间 Store
│   ├── userStore.ts      # 用户 Store
│   └── connectionStore.ts # 连接 Store
│
├── services/              # API 服务
│   ├── apiClient.ts      # HTTP 客户端
│   ├── authService.ts
│   ├── roomService.ts
│   ├── deviceService.ts
│   └── ztmService.ts
│
├── composables/           # 组合式函数
│   ├── useWebSocket.ts
│   ├── useConnection.ts
│   └── useRoom.ts
│
├── types/                 # TypeScript 类型
│   └── index.ts
│
└── utils/                 # 工具函数
    ├── constants.ts
    ├── validators.ts
    └── formatters.ts
```

---

## 2. 组件层次结构

```
App.vue (根组件)
│
├── LayoutDefault.vue (默认布局)
│   ├── AppHeader.vue (应用头部)
│   │   ├── UserMenu.vue
│   │   └── NotificationCenter.vue
│   │
│   └── AppSidebar.vue (侧边导航)
│       ├── NavItem.vue
│       └── RoomListMini.vue
│
└── RouterView
    │
    ├── HomeView.vue (首页/仪表盘)
    │   ├── QuickStartCard.vue
    │   ├── ConnectionStatus.vue
    │   ├── RecentRooms.vue
    │   └── ActiveTunnels.vue
    │
    ├── RoomListView.vue (房间列表)
    │   ├── RoomFilters.vue
    │   ├── RoomCard.vue
    │   ├── CreateRoomButton.vue
    │   ├── CreateRoomModal.vue (弹出层)
    │   └── JoinRoomModal.vue (弹出层)
    │
    ├── RoomView.vue (房间内)
    │   ├── RoomHeader.vue
    │   │   ├── RoomInfo.vue
    │   │   ├── ShareMenu.vue
    │   │   └── RoomSettingsModal.vue
    │   │
    │   ├── PlayerList.vue (左栏)
    │   │   ├── PlayerCard.vue
    │   │   ├── QuickMessages.vue
    │   │   └── OwnerControls.vue
    │   │
    │   ├── MainPanel.vue (中栏 - 动态)
    │   │   ├── QuickModePanel.vue (快速模式)
    │   │   │   ├── ConnectionCard.vue
    │   │   │   ├── VirtualIpDisplay.vue
       │   │   │   ├── NetworkStats.vue
    │   │   │   ├── PlayerStatusList.vue
    │   │   │   └── ActionButtons.vue
    │   │   │
    │   │   └── GuidedModePanel.vue (引导模式)
    │   │       ├── WaitingPanel.vue
    │   │       ├── ConnectingPanel.vue
    │   │       ├── ConnectedPanel.vue
    │   │       ├── GamingPanel.vue
    │   │       └── ErrorPanel.vue
    │   │
    │   └── ChatPanel.vue (右栏)
    │       ├── MessageList.vue
    │       │   └── MessageItem.vue
    │       └── ChatInput.vue
    │
    ├── DeviceConfigView.vue (设备配置)
    │   └── AutoConfiguration.vue
    │       ├── ConfigProgress.vue
    │       ├── ConfigSuccess.vue
    │       └── ConfigError.vue
    │
    └── SettingsView.vue (设置)
        ├── ProfileSettings.vue
        ├── DeviceSettings.vue
        └── NetworkSettings.vue
```

---

## 3. 核心组件详解

### 3.1 布局组件 (Layout)

#### LayoutDefault.vue
**职责:** 应用主布局框架

```vue
<template>
  <div class="layout-default">
    <AppHeader />
    <div class="layout-body">
      <AppSidebar />
      <main class="layout-main">
        <slot />
      </main>
    </div>
  </div>
</template>
```

**Props:** 无
**Slots:** default
**状态:** 无

---

### 3.2 房间核心组件 (Room)

#### RoomView.vue ⭐ 核心页面
**职责:** 房间内主页面，协调所有子组件

```vue
<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue';
import { useRoomStore } from '@/stores/roomStore';
import { useConnectionStore } from '@/stores/connectionStore';
import { useWebSocket } from '@/composables/useWebSocket';

// 子组件导入
import RoomHeader from './components/room/RoomHeader.vue';
import PlayerList from './components/room/PlayerList.vue';
import QuickModePanel from './components/room/QuickModePanel.vue';
import GuidedModePanel from './components/room/GuidedModePanel.vue';
import ChatPanel from './components/room/ChatPanel.vue';

const props = defineProps<{
  roomId: string;
}>();

const roomStore = useRoomStore();
const connectionStore = useConnectionStore();
const { socket, isConnected } = useWebSocket();

// 计算属性
const room = computed(() => roomStore.currentRoom);
const viewMode = computed(() => room.value?.connectionMode || 'QUICK');
const isOwner = computed(() => roomStore.isOwner);

// 生命周期
onMounted(() => {
  // 加入房间
  roomStore.joinRoom(props.roomId);
  
  // 连接 WebSocket
  socket.value?.emit('join_room', { roomId: props.roomId });
});

onUnmounted(() => {
  // 离开房间
  socket.value?.emit('leave_room', { roomId: props.roomId });
  roomStore.leaveRoom();
});
</script>

<template>
  <div class="room-view">
    <RoomHeader 
      :room="room" 
      :is-owner="isOwner"
    />
    
    <div class="room-content">
      <PlayerList class="left-panel" />
      
      <component 
        :is="viewMode === 'QUICK' ? QuickModePanel : GuidedModePanel"
        class="main-panel"
        :room="room"
      />
      
      <ChatPanel class="right-panel" />
    </div>
  </div>
</template>

<style scoped>
.room-view {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.room-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.left-panel {
  width: 280px;
  flex-shrink: 0;
}

.main-panel {
  flex: 1;
  overflow-y: auto;
}

.right-panel {
  width: 320px;
  flex-shrink: 0;
}
</style>
```

**Props:**
| 属性 | 类型 | 必填 | 说明 |
|------|------|------|------|
| roomId | string | 是 | 房间 ID |

**依赖 Store:**
- roomStore: 当前房间状态、成员列表
- connectionStore: 连接状态
- userStore: 当前用户信息

**依赖 Composable:**
- useWebSocket: WebSocket 连接

---

#### QuickModePanel.vue ⭐ 快速模式面板
**职责:** 快速连接模式主界面

```vue
<script setup lang="ts">
import { computed } from 'vue';
import { useConnectionStore } from '@/stores/connectionStore';
import ConnectionCard from './ConnectionCard.vue';
import VirtualIpDisplay from './VirtualIpDisplay.vue';
import NetworkStats from './NetworkStats.vue';
import PlayerStatusList from './PlayerStatusList.vue';
import ActionButtons from './ActionButtons.vue';

const props = defineProps<{
  room: Room;
}>();

const connectionStore = useConnectionStore();

const connectionStatus = computed(() => connectionStore.status);
const virtualIp = computed(() => connectionStore.virtualIp);
const latency = computed(() => connectionStore.latency);

async function handleConnect() {
  await connectionStore.connect();
}

async function handleLaunchGame() {
  await connectionStore.launchGame();
}
</script>

<template>
  <div class="quick-mode-panel"
    <ConnectionCard 
      :status="connectionStatus"
      @connect="handleConnect"
    />
    
    <VirtualIpDisplay 
      v-if="virtualIp"
      :ip="virtualIp"
      @copy="connectionStore.copyToClipboard"
    />
    
    <NetworkStats 
      :latency="latency"
      :packet-loss="connectionStore.packetLoss"
    />
    
    <PlayerStatusList />
    
    <ActionButtons 
      :can-launch="connectionStatus === 'connected'"
      @launch="handleLaunchGame"
      @copy-ip="connectionStore.copyToClipboard"
    />
  </div>
</template>
```

**Props:**
| 属性 | 类型 | 必填 | 说明 |
|------|------|------|------|
| room | Room | 是 | 房间信息 |

**依赖 Store:**
- connectionStore: 连接状态、虚拟 IP、网络统计

**子组件:**
- ConnectionCard: 连接状态卡片
- VirtualIpDisplay: 虚拟 IP 显示
- NetworkStats: 网络统计
- PlayerStatusList: 玩家状态列表
- ActionButtons: 操作按钮

---

#### PlayerList.vue
**职责:** 显示房间成员列表

```vue
<script setup lang="ts">
import { computed } from 'vue';
import { useRoomStore } from '@/stores/roomStore';
import { useUserStore } from '@/stores/userStore';
import PlayerCard from './PlayerCard.vue';
import QuickMessages from './QuickMessages.vue';

const roomStore = useRoomStore();
const userStore = useUserStore();

const members = computed(() => roomStore.members);
const isOwner = computed(() => roomStore.isOwner);

function handleQuickMessage(message: string) {
  roomStore.sendQuickMessage(message);
}
</script>

<template>
  <div class="player-list">
    <h3>👥 玩家 ({{ members.length }})</h3>
    
    <div class="players">
      <PlayerCard
        v-for="member in members"
        :key="member.userId"
        :member="member"
        :is-me="member.userId === userStore.userId"
        :is-owner="member.role === 'OWNER'"
        :show-controls="isOwner && member.userId !== userStore.userId"
      />
    </div>
    
    <QuickMessages @send="handleQuickMessage" />
  </div>
</template>
```

---

#### ChatPanel.vue
**职责:** 聊天面板

```vue
<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue';
import { useRoomStore } from '@/stores/roomStore';
import MessageList from './MessageList.vue';
import ChatInput from './ChatInput.vue';

const roomStore = useRoomStore();
const messages = computed(() => roomStore.messages);
const scrollContainer = ref<HTMLElement>();

async function handleSend(content: string) {
  await roomStore.sendMessage(content);
  
  // 滚动到底部
  await nextTick();
  scrollContainer.value?.scrollTo({
    top: scrollContainer.value.scrollHeight,
    behavior: 'smooth'
  });
}
</script>

<template>
  <div class="chat-panel">
    <MessageList 
      ref="scrollContainer"
      :messages="messages"
    />
    
    <ChatInput @send="handleSend" />
  </div>
</template>
```

---

### 3.3 通用组件 (Common)

#### BaseButton.vue
**职责:** 基础按钮组件

```vue
<script setup lang="ts">
interface Props {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
}

withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md'
});

const emit = defineEmits<{
  click: [event: MouseEvent];
}>();
</script>

<template>
  <button
    :class="['btn', `btn-${variant}`, `btn-${size}`]"
    :disabled="disabled || loading"
    @click="emit('click', $event)"
  >
    <span v-if="loading" class="spinner"></span>
    <slot />
  </button>
</template>
```

#### Modal.vue
**职责:** 模态框容器

```vue
<script setup lang="ts">
interface Props {
  modelValue: boolean;
  title?: string;
  closable?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  closable: true
});

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  close: [];
}>();

function handleClose() {
  emit('update:modelValue', false);
  emit('close');
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="modelValue" class="modal-overlay" @click.self="handleClose">
        <div class="modal-container">
          <div v-if="title" class="modal-header">
            <h3>{{ title }}</h3>
            <button v-if="closable" @click="handleClose">✕</button>
          </div>
          
          <div class="modal-body">
            <slot />
          </div>
          
          <div v-if="$slots.footer" class="modal-footer">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
```

---

## 4. Store 架构

### 4.1 Store 关系图

```
stores/
│
├── index.ts (Pinia 实例)
│
├── userStore.ts
│   ├── state: user, token, isAuthenticated
│   ├── actions: login, register, logout, updateProfile
│   └── getters: isGuest, userId
│
├── roomStore.ts ⭐
│   ├── state: 
│   │   ├── currentRoom: Room | null
│   │   ├── members: Member[]
│   │   ├── messages: Message[]
│   │   └── myMembership: Membership | null
│   ├── actions:
│   │   ├── createRoom(data)
│   │   ├── joinRoom(roomId)
│   │   ├── leaveRoom()
│   │   ├── sendMessage(content)
│   │   ├── updateStatus(state)
│   │   ├── handleWebSocketEvent(event)
│   │   └── syncMembers(members)
│   └── getters:
│       ├── isOwner: boolean
│       ├── memberCount: number
│       └── onlineMembers: Member[]
│
├── connectionStore.ts ⭐
│   ├── state:
│   │   ├── status: 'disconnected' | 'connecting' | 'connected'
│   │   ├── virtualIp: string
│   │   ├── latency: number
│   │   └── packetLoss: number
│   ├── actions:
│   │   ├── connect()
│   │   ├── disconnect()
│   │   ├── updateStats()
│   │   ├── copyToClipboard()
│   │   └── launchGame()
│   └── getters:
│       ├── isConnected: boolean
│       ├── connectionQuality: 'good' | 'fair' | 'poor'
│       └── canLaunchGame: boolean
│
└── deviceStore.ts
    ├── state: devices[], currentDevice
    ├── actions: autoConfigure(), fetchDevices()
    └── getters: hasConfiguredDevice
```

### 4.2 roomStore 详细实现

```typescript
// stores/roomStore.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Room, Member, Message, Membership } from '@/types';
import { roomService } from '@/services/roomService';
import { useWebSocket } from '@/composables/useWebSocket';

export const useRoomStore = defineStore('room', () => {
  // State
  const currentRoom = ref<Room | null>(null);
  const members = ref<Member[]>([]);
  const messages = ref<Message[]>([]);
  const myMembership = ref<Membership | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  
  const { socket } = useWebSocket();
  
  // Getters
  const isOwner = computed(() => {
    return myMembership.value?.role === 'OWNER';
  });
  
  const memberCount = computed(() => members.value.length);
  
  const onlineMembers = computed(() => {
    return members.value.filter(m => m.state !== 'OFFLINE');
  });
  
  const readyCount = computed(() => {
    return members.value.filter(m => m.state === 'READY').length;
  });
  
  // Actions
  async function createRoom(data: CreateRoomData) {
    isLoading.value = true;
    error.value = null;
    
    try {
      const room = await roomService.createRoom(data);
      return room;
    } catch (err: any) {
      error.value = err.message;
      throw err;
    } finally {
      isLoading.value = false;
    }
  }
  
  async function joinRoom(roomId: string) {
    isLoading.value = true;
    error.value = null;
    
    try {
      const result = await roomService.joinRoom(roomId);
      currentRoom.value = result.room;
      myMembership.value = result.membership;
      members.value = result.room.members;
      
      // 加入 WebSocket 房间
      socket.value?.emit('join_room', { roomId });
      
      // 设置 WebSocket 事件监听
      setupWebSocketListeners();
      
    } catch (err: any) {
      error.value = err.message;
      throw err;
    } finally {
      isLoading.value = false;
    }
  }
  
  async function leaveRoom() {
    if (!currentRoom.value) return;
    
    socket.value?.emit('leave_room', { roomId: currentRoom.value.id });
    
    await roomService.leaveRoom(currentRoom.value.id);
    
    // 清理状态
    currentRoom.value = null;
    members.value = [];
    messages.value = [];
    myMembership.value = null;
  }
  
  async function sendMessage(content: string) {
    if (!currentRoom.value) return;
    
    // 乐观更新
    const tempMessage: Message = {
      id: `temp-${Date.now()}`,
      content,
      type: 'TEXT',
      userId: 'me',
      nickname: '我',
      createdAt: new Date().toISOString()
    };
    messages.value.push(tempMessage);
    
    try {
      // 通过 WebSocket 发送
      socket.value?.emit('send_message', {
        content,
        type: 'TEXT'
      });
    } catch (err) {
      // 移除乐观更新的消息
      messages.value = messages.value.filter(m => m.id !== tempMessage.id);
      throw err;
    }
  }
  
  function updateStatus(state: MemberState) {
    socket.value?.emit('update_status', { state });
  }
  
  // WebSocket 事件处理
  function setupWebSocketListeners() {
    if (!socket.value) return;
    
    socket.value.on('user_joined', (data) => {
      members.value.push(data);
      messages.value.push({
        id: `system-${Date.now()}`,
        type: 'SYSTEM',
        content: `${data.nickname} 加入了房间`,
        createdAt: new Date().toISOString()
      });
    });
    
    socket.value.on('user_left', (data) => {
      members.value = members.value.filter(m => m.userId !== data.userId);
      messages.value.push({
        id: `system-${Date.now()}`,
        type: 'SYSTEM',
        content: `${data.nickname} 离开了房间`,
        createdAt: new Date().toISOString()
      });
    });
    
    socket.value.on('user_status_changed', (data) => {
      const member = members.value.find(m => m.userId === data.userId);
      if (member) {
        member.state = data.currentState;
      }
    });
    
    socket.value.on('new_message', (data) => {
      messages.value.push(data);
    });
  }
  
  return {
    // State
    currentRoom,
    members,
    messages,
    myMembership,
    isLoading,
    error,
    // Getters
    isOwner,
    memberCount,
    onlineMembers,
    readyCount,
    // Actions
    createRoom,
    joinRoom,
    leaveRoom,
    sendMessage,
    updateStatus
  };
});
```

---

## 5. Composables

### 5.1 useWebSocket.ts

```typescript
// composables/useWebSocket.ts
import { ref, onMounted, onUnmounted } from 'vue';
import { io, Socket } from 'socket.io-client';
import { useUserStore } from '@/stores/userStore';

export function useWebSocket() {
  const socket = ref<Socket | null>(null);
  const isConnected = ref(false);
  const connectionError = ref<string | null>(null);
  
  const userStore = useUserStore();
  
  function connect() {
    if (socket.value?.connected) return;
    
    socket.value = io('ws://localhost:3000', {
      query: {
        token: userStore.token
      },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });
    
    socket.value.on('connect', () => {
      isConnected.value = true;
      connectionError.value = null;
      console.log('WebSocket connected');
    });
    
    socket.value.on('disconnect', (reason) => {
      isConnected.value = false;
      console.log('WebSocket disconnected:', reason);
    });
    
    socket.value.on('connect_error', (error) => {
      connectionError.value = error.message;
      console.error('WebSocket error:', error);
    });
  }
  
  function disconnect() {
    socket.value?.disconnect();
    socket.value = null;
    isConnected.value = false;
  }
  
  onMounted(() => {
    if (userStore.isAuthenticated) {
      connect();
    }
  });
  
  onUnmounted(() => {
    disconnect();
  });
  
  return {
    socket,
    isConnected,
    connectionError,
    connect,
    disconnect
  };
}
```

---

## 6. 组件通信规范

### 6.1 Props Down, Events Up

```
Parent.vue
├── Props ──▶ Child.vue
└── ◀── Events

示例：
RoomView (父)
├── room ──▶ RoomHeader (子)
└── ◀── share-room (事件)
```

### 6.2 跨组件通信

**使用 Pinia Store:**
```typescript
// 组件 A
const roomStore = useRoomStore();
roomStore.sendMessage('Hello');

// 组件 B（自动更新）
const messages = computed(() => roomStore.messages);
```

**使用 Event Bus（谨慎使用）:**
```typescript
// 使用 mitt
import mitt from 'mitt';
const emitter = mitt();

// 组件 A
emitter.emit('user-joined', user);

// 组件 B
emitter.on('user-joined', (user) => {
  console.log(user);
});
```

---

## 7. 文件命名规范

| 类型 | 命名规范 | 示例 |
|------|----------|------|
| 组件 | PascalCase.vue | `RoomHeader.vue` |
| Store | camelCase.ts | `roomStore.ts` |
| Composable | useXxx.ts | `useWebSocket.ts` |
| 类型 | PascalCase (type) | `Room.ts` |
| 工具函数 | camelCase.ts | `formatters.ts` |
| 常量 | UPPER_SNAKE_CASE | `CONSTANTS.ts` |

---

## 8. 开发检查清单

创建新组件时检查：

- [ ] 使用 TypeScript 定义 Props 和 Emits
- [ ] 使用 Composition API (<script setup>)
- [ ] Props 有默认值或明确是否 required
- [ ] 组件职责单一（SRP）
- [ ] 样式使用 scoped
- [ ] 复杂逻辑提取到 composable
- [ ] 有加载状态（loading）
- [ ] 有错误处理
- [ ] 响应式考虑（移动端/小屏幕）

---

## 9. 文档结束

**已创建的设计文档清单：**
1. ✅ 技术实施计划
2. ✅ 数据库 ERD 设计
3. ✅ API 接口文档
4. ✅ WebSocket 协议规范
5. ✅ 错误码手册
6. ✅ 组件架构图（本文档）

**下一步建议：**
- 使用 Storybook 进行组件开发和测试
- 创建单元测试（Vitest）
- 创建 E2E 测试（Playwright）