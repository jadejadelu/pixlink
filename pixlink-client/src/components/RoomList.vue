<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { roomService } from '../services/roomService';
import { store } from '../store';
import RoomCard from './room/RoomCard.vue';
import Button from './common/Button.vue';
import Skeleton from './common/Skeleton.vue';
import EmptyState from './common/EmptyState.vue';

const emit = defineEmits(['join-room', 'view-room', 'create-room']);
const rooms = ref<any[]>([]);
const isLoading = ref(false);
const error = ref('');
const searchQuery = ref('');
const activeTab = ref<'browse' | 'my'>('browse');

const loadRooms = async () => {
  isLoading.value = true;
  error.value = '';
  
  try {
    // 使用isAuthenticated()检查认证状态，而不是getUser()
    if (!store.isAuthenticated()) {
      error.value = '用户未登录';
      return;
    }
    
    const response = await roomService.getRooms();
    rooms.value = response;
    // 持久化房间列表到store中
    store.setRooms(response);
  } catch (err: any) {
    error.value = err.message || '获取房间列表失败';
  } finally {
    isLoading.value = false;
  }
};

const handleJoinRoom = () => {
  emit('join-room');
};

const handleCreateRoom = () => {
  emit('create-room');
};

const handleViewRoom = (roomId: string) => {
  emit('view-room', roomId);
};

// 过滤房间列表
const filteredRooms = computed(() => {
  let filtered = rooms.value;

  // 根据标签页过滤
  if (activeTab.value === 'my') {
    const userId = store.getUser()?.id;
    filtered = filtered.filter(room =>
      room.ownerId === userId ||
      room.memberships?.some((m: any) => m.userId === userId)
    );
  }

  // 根据搜索关键词过滤
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(room =>
      room.name.toLowerCase().includes(query) ||
      room.ownerNickname?.toLowerCase().includes(query)
    );
  }

  return filtered;
});

const currentUserId = computed(() => store.getUser()?.id);

onMounted(() => {
  // 每次进入房间列表页面时都从服务器加载最新的房间列表
  loadRooms();
});
</script>

<template>
  <div class="space-y-6">
    <!-- Feature Badges -->
    <div class="border-2 border-pixel-border bg-pixel-bg-light p-4 -mx-4 sm:mx-0">
      <div class="flex flex-wrap justify-center gap-3">
        <div class="flex items-center gap-2 px-4 py-2 bg-pixel-bg-card border border-pixel-border font-mono text-sm text-pixel-text">
          <span>🌐</span>
          <span>跨局域网</span>
        </div>
        <div class="flex items-center gap-2 px-4 py-2 bg-pixel-bg-card border border-pixel-border font-mono text-sm text-pixel-text">
          <span>📡</span>
          <span>端口穿透</span>
        </div>
        <div class="flex items-center gap-2 px-4 py-2 bg-pixel-bg-card border border-pixel-border font-mono text-sm text-pixel-text">
          <span>👥</span>
          <span>好友联机</span>
        </div>
        <div class="flex items-center gap-2 px-4 py-2 bg-pixel-bg-card border border-pixel-border font-mono text-sm text-pixel-text">
          <span>🎮</span>
          <span>支持多游戏</span>
        </div>
      </div>
    </div>

    <!-- Tab Navigation -->
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div class="flex gap-2 bg-pixel-bg-light p-1 border-2 border-pixel-border">
        <button
          @click="activeTab = 'browse'"
          :class="[
            'px-4 py-2 font-mono text-sm transition-all',
            activeTab === 'browse'
              ? 'bg-pixel-bg-card text-pixel-text border-2 border-pixel-border'
              : 'text-pixel-text-secondary hover:text-pixel-text'
          ]"
        >
          浏览房间
        </button>
        <button
          @click="activeTab = 'my'"
          :class="[
            'px-4 py-2 font-mono text-sm transition-all',
            activeTab === 'my'
              ? 'bg-pixel-bg-card text-pixel-text border-2 border-pixel-border'
              : 'text-pixel-text-secondary hover:text-pixel-text'
          ]"
        >
          我的房间
        </button>
      </div>

      <Button @click="handleCreateRoom" class="gap-2">
        <span>+</span>
        创建房间
      </Button>
    </div>

    <!-- 搜索栏 -->
    <div class="relative max-w-md">
      <div class="absolute left-3 top-1/2 -translate-y-1/2 text-pixel-text-secondary">
        🔍
      </div>
      <input
        v-model="searchQuery"
        type="text"
        placeholder="搜索房间或房主..."
        class="pixel-input w-full pl-10"
      />
    </div>

    <!-- 错误提示 -->
    <div v-if="error" class="bg-pixel-danger/20 border-2 border-pixel-danger text-pixel-danger px-4 py-3 rounded-none font-mono text-sm">
      {{ error }}
    </div>

    <!-- 加载状态 -->
    <div v-if="isLoading" class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <Skeleton type="card" v-for="i in 6" :key="i" />
    </div>

    <!-- 房间网格 -->
    <TransitionGroup
      v-else-if="filteredRooms.length > 0"
      name="list"
      tag="div"
      class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4"
    >
      <RoomCard
        v-for="room in filteredRooms"
        :key="room.id"
        :room="room"
        :current-user-id="currentUserId"
        @view-room="handleViewRoom(room.id)"
      />
    </TransitionGroup>

    <!-- 空状态 -->
    <EmptyState
      v-else
      :title="activeTab === 'my' ? '您还没有加入任何房间' : '暂无可用房间'"
      description="点击创建房间开始使用房间功能"
      icon="🎮"
    >
      <Button @click="handleCreateRoom" class="mt-4">
        创建房间
      </Button>
    </EmptyState>
  </div>
</template>

<style scoped>
/* 列表项进入动画 */
.list-enter-active {
  transition: all 0.3s ease;
}

.list-leave-active {
  transition: all 0.2s ease;
}

.list-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.list-leave-to {
  opacity: 0;
  transform: scale(0.9);
}

.list-move {
  transition: transform 0.3s ease;
}
</style>