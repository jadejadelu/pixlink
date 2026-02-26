<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { roomService } from '../services/roomService';
import { store } from '../store';

const emit = defineEmits(['join-room', 'view-room', 'create-room']);
const rooms = ref<any[]>([]);
const isLoading = ref(false);
const error = ref('');

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

onMounted(() => {
  // 每次进入房间列表页面时都从服务器加载最新的房间列表
  loadRooms();
});
</script>

<template>
  <div class="room-list">
    <h2>我的房间</h2>
    
    <div v-if="error" class="error-message">
      {{ error }}
    </div>
    
    <div class="room-list-actions">
      <button class="btn-primary" @click="handleCreateRoom">创建房间</button>
      <button class="btn-secondary" @click="handleJoinRoom">加入房间</button>
      <button class="btn-secondary" @click="loadRooms" :disabled="isLoading">
        {{ isLoading ? '加载中...' : '刷新列表' }}
      </button>
    </div>
    
    <div class="room-cards" v-if="rooms.length > 0">
      <div 
        v-for="room in rooms" 
        :key="room.id"
        class="room-card"
        @click="handleViewRoom(room.id)"
      >
        <div class="room-card-header">
          <h3>{{ room.name }}</h3>
          <span class="room-visibility">
            {{ room.visibility === 'PUBLIC' ? '公开' : '私有' }}
          </span>
        </div>
        <div class="room-card-body">
          <p>成员数量：{{ room.memberships?.length || 0 }}</p>
          <p>创建时间：{{ new Date(room.createdAt).toLocaleString() }}</p>
          <p v-if="room.ownerId === store.getUser()?.id">
            <strong>我是房主</strong>
          </p>
        </div>
        <div class="room-card-footer">
          <button class="btn-secondary">查看详情</button>
        </div>
      </div>
    </div>
    
    <div v-else-if="!isLoading" class="empty-state">
      <p>您还没有加入任何房间</p>
      <p>点击"创建房间"开始使用房间功能</p>
    </div>
  </div>
</template>

<style scoped>
.room-list {
  background: white;
  border-radius: 10px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.room-list h2 {
  font-size: 1.2rem;
  margin-bottom: 15px;
  color: #333;
}

.room-list-actions {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.room-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 15px;
}

.room-card {
  background: #f9f9f9;
  border-radius: 8px;
  padding: 15px;
  border: 1px solid #e0e0e0;
  cursor: pointer;
  transition: all 0.3s ease;
}

.room-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.room-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.room-card-header h3 {
  font-size: 1rem;
  margin: 0;
  color: #333;
}

.room-visibility {
  font-size: 0.8rem;
  padding: 2px 8px;
  border-radius: 12px;
  background: #e0e0e0;
  color: #666;
}

.room-card-body {
  margin-bottom: 15px;
}

.room-card-body p {
  margin: 5px 0;
  font-size: 0.9rem;
  color: #666;
}

.room-card-footer {
  text-align: right;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #999;
}

.empty-state p {
  margin: 10px 0;
}
</style>