<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { roomService } from '../services/roomService';
import { store } from '../store';
import CreateGameShare from './CreateGameShare.vue';
import GameShareList from './GameShareList.vue';

const props = defineProps<{
  roomId: string;
}>();

const emit = defineEmits(['leave-room', 'close']);

const room = ref<any>(null);
const isLoading = ref(false);
const error = ref('');
const showEditForm = ref(false);
const editName = ref('');
const editVisibility = ref('PRIVATE');
const editInviteCode = ref('');
const activeTab = ref('members'); // 'members', 'tunnels', 'messages', 'game-shares'

const loadRoomDetails = async () => {
  isLoading.value = true;
  error.value = '';
  
  try {
    const roomData = await roomService.getRoom(props.roomId);
    if (roomData) {
      room.value = roomData;
      editName.value = roomData.name;
      editVisibility.value = roomData.visibility;
      editInviteCode.value = roomData.inviteCode || '';
    } else {
      error.value = '房间不存在或无法访问';
    }
  } catch (err: any) {
    error.value = err.message || '获取房间详情失败';
  } finally {
    isLoading.value = false;
  }
};

const handleEditRoom = async () => {
  try {
    await roomService.updateRoom(props.roomId, {
      name: editName.value,
      visibility: editVisibility.value,
      inviteCode: editInviteCode.value || undefined
    });
    showEditForm.value = false;
    await loadRoomDetails();
  } catch (err: any) {
    error.value = err.message || '编辑房间失败';
  }
};

const handleLeaveRoom = async () => {
  if (!confirm('确定要离开这个房间吗？')) return;
  
  try {
    await roomService.leaveRoom(props.roomId);
    emit('leave-room', props.roomId);
  } catch (err: any) {
    error.value = err.message || '离开房间失败';
  }
};

const handleDeleteRoom = async () => {
  if (!confirm('确定要删除这个房间吗？此操作不可恢复。')) return;
  
  try {
    await roomService.deleteRoom(props.roomId);
    emit('leave-room', props.roomId);
  } catch (err: any) {
    error.value = err.message || '删除房间失败';
  }
};

const handleRemoveMember = async (memberId: string, memberName: string) => {
  if (!confirm(`确定要踢出成员 ${memberName} 吗？`)) return;
  
  try {
    await roomService.removeMember(props.roomId, memberId);
    await loadRoomDetails();
  } catch (err: any) {
    error.value = err.message || '踢出成员失败';
  }
};

const isRoomOwner = computed(() => {
  return room.value?.ownerId === store.getUser()?.id;
});

onMounted(() => {
  loadRoomDetails();
});
</script>

<template>
  <div class="room-detail">
    <div class="room-detail-header">
      <h2>{{ room?.name || '房间详情' }}</h2>
      <div class="room-detail-actions">
        <button class="btn-secondary" @click="loadRoomDetails" :disabled="isLoading">
          {{ isLoading ? '加载中...' : '刷新' }}
        </button>
        <button class="btn-secondary" @click="emit('close')">关闭</button>
      </div>
    </div>
    
    <div v-if="error" class="error-message">
      {{ error }}
    </div>
    
    <div v-if="isLoading" class="loading-state">
      <p>加载中...</p>
    </div>
    
    <div v-else-if="room" class="room-detail-content">
      <!-- Tab Navigation -->
      <div class="tab-navigation">
        <button 
          :class="['tab-btn', { active: activeTab === 'members' }]"
          @click="activeTab = 'members'"
        >
          成员 ({{ room.memberships?.length || 0 }})
        </button>
        <button 
          :class="['tab-btn', { active: activeTab === 'game-shares' }]"
          @click="activeTab = 'game-shares'"
        >
          游戏共享
        </button>
      </div>

      <!-- Tab Content -->
      <div class="tab-content">
        <!-- Members Tab -->
        <div v-if="activeTab === 'members'" class="tab-panel">
          <div class="room-info">
            <h3>房间信息</h3>
            <div class="info-grid">
              <div class="info-item">
                <strong>房间 ID:</strong>
                <span>{{ room.id }}</span>
              </div>
              <div class="info-item">
                <strong>可见性:</strong>
                <span>{{ room.visibility === 'PUBLIC' ? '公开' : '私有' }}</span>
              </div>
              <div class="info-item">
                <strong>创建时间:</strong>
                <span>{{ new Date(room.createdAt).toLocaleString() }}</span>
              </div>
              <div class="info-item">
                <strong>状态:</strong>
                <span>{{ room.status === 'ACTIVE' ? '活跃' : '非活跃' }}</span>
              </div>
            </div>
            
            <div v-if="isRoomOwner" class="owner-actions">
              <button class="btn-primary" @click="showEditForm = !showEditForm">
                {{ showEditForm ? '取消编辑' : '编辑房间' }}
              </button>
            </div>
            
            <div v-if="showEditForm && isRoomOwner" class="edit-form">
              <h4>编辑房间</h4>
              <div class="form-group">
                <label>房间名称</label>
                <input type="text" v-model="editName" placeholder="输入房间名称" />
              </div>
              <div class="form-group">
                <label>可见性</label>
                <select v-model="editVisibility">
                  <option value="PRIVATE">私有</option>
                  <option value="PUBLIC">公开</option>
                </select>
              </div>
              <div class="form-group">
                <label>房间密码（可选）</label>
                <input type="text" v-model="editInviteCode" placeholder="输入房间密码" />
              </div>
              <div class="form-actions">
                <button class="btn-primary" @click="handleEditRoom">保存</button>
                <button class="btn-secondary" @click="showEditForm = false">取消</button>
              </div>
            </div>
          </div>
          
          <div class="members-section">
            <h3>成员列表 ({{ room.memberships?.length || 0 }})</h3>
            <div class="members-list">
              <div 
                v-for="member in room.memberships" 
                :key="member.userId"
                class="member-item"
              >
                <div class="member-info">
                  <div class="member-avatar">
                    {{ member.user?.nickname?.charAt(0) || 'U' }}
                  </div>
                  <div class="member-details">
                    <h4>{{ member.user?.nickname || '未知用户' }}</h4>
                    <p>{{ member.user?.email || '无邮箱' }}</p>
                  </div>
                </div>
                <div class="member-actions">
                  <span class="role-badge" :class="member.role.toLowerCase()">
                    {{ member.role === 'OWNER' ? '房主' : '成员' }}
                  </span>
                  <button 
                    v-if="isRoomOwner && member.role !== 'OWNER'"
                    class="btn-danger-small"
                    @click="handleRemoveMember(member.userId, member.user?.nickname || '未知用户')"
                  >
                    踢出
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Game Shares Tab -->
        <div v-if="activeTab === 'game-shares'" class="tab-panel">
          <div class="game-shares-section">
            <CreateGameShare :room-id="props.roomId" @gameShareCreated="loadRoomDetails" />
            <GameShareList :room-id="props.roomId" />
          </div>
        </div>
      </div>
      
      <div class="room-detail-footer">
        <div class="footer-actions">
          <button class="btn-secondary" @click="handleLeaveRoom">离开房间</button>
          <button 
            v-if="isRoomOwner" 
            class="btn-danger" 
            @click="handleDeleteRoom"
          >
            删除房间
          </button>
        </div>
      </div>
    </div>
    
    <div v-else-if="!isLoading" class="empty-state">
      <p>无法加载房间详情</p>
    </div>
  </div>
</template>

<style scoped>
.room-detail {
  background: white;
  border-radius: 10px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  max-width: 800px;
  margin: 0 auto;
}

.room-detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #e0e0e0;
}

.room-detail-header h2 {
  font-size: 1.5rem;
  color: #333;
}

.room-detail-actions {
  display: flex;
  gap: 10px;
}

/* Tab Navigation */
.tab-navigation {
  display: flex;
  border-bottom: 1px solid #e0e0e0;
  margin-bottom: 20px;
}

.tab-btn {
  padding: 10px 20px;
  border: none;
  background: transparent;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  font-size: 1rem;
  color: #666;
  transition: all 0.3s;
}

.tab-btn:hover {
  color: #333;
}

.tab-btn.active {
  color: #667eea;
  border-bottom-color: #667eea;
  font-weight: bold;
}

.tab-content {
  min-height: 300px;
}

.tab-panel {
  padding: 10px 0;
}

.room-info {
  background: #f9f9f9;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 20px;
}

.room-info h3 {
  font-size: 1.1rem;
  margin-bottom: 15px;
  color: #333;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 10px;
  margin-bottom: 15px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.info-item strong {
  font-size: 0.9rem;
  color: #666;
}

.info-item span {
  font-size: 0.9rem;
  color: #333;
}

.owner-actions {
  margin-top: 15px;
}

.edit-form {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #e0e0e0;
}

.edit-form h4 {
  font-size: 1rem;
  margin-bottom: 15px;
  color: #333;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-size: 0.9rem;
  color: #666;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 10px;
  border: 1px solid #e0e0e0;
  border-radius: 5px;
  font-size: 1rem;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.1);
}

.form-actions {
  display: flex;
  gap: 10px;
}

.members-section {
  background: #f9f9f9;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 20px;
}

.members-section h3 {
  font-size: 1.1rem;
  margin-bottom: 15px;
  color: #333;
}

.members-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.member-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  background: white;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
}

.member-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.member-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #667eea;
  color: white;
  display: flex;
  justify-content: center;
  align-items: center;
  font-weight: bold;
}

.member-details h4 {
  font-size: 1rem;
  margin: 0;
  color: #333;
}

.member-details p {
  font-size: 0.9rem;
  margin: 5px 0 0 0;
  color: #666;
}

.member-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.role-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: bold;
}

.role-badge.owner {
  background: #e8f5e8;
  color: #2e7d32;
}

.role-badge.member {
  background: #e3f2fd;
  color: #1976d2;
}

.btn-danger-small {
  padding: 4px 8px;
  background: #e57373;
  color: white;
  border: 1px solid #e57373;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s;
  font-size: 0.8rem;
}

.btn-danger-small:hover {
  background: #ef5350;
}

.game-shares-section {
  padding: 10px 0;
}

.room-detail-footer {
  border-top: 1px solid #e0e0e0;
  padding-top: 20px;
  margin-top: 20px;
}

.footer-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.btn-danger {
  padding: 8px 16px;
  background: #e57373;
  color: white;
  border: 1px solid #e57373;
  border-radius: 5px;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-danger:hover {
  background: #ef5350;
}

.loading-state,
.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #999;
}

.error-message {
  background: #ffebee;
  color: #c62828;
  padding: 10px;
  border-radius: 5px;
  margin-bottom: 15px;
  border: 1px solid #ffcdd2;
}

.btn-primary,
.btn-secondary {
  padding: 8px 16px;
  border: 1px solid #e0e0e0;
  border-radius: 5px;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-primary {
  background: #667eea;
  color: white;
  border-color: #667eea;
}

.btn-primary:hover {
  background: #5568d3;
}

.btn-secondary {
  background: #f5f5f5;
  color: #333;
}

.btn-secondary:hover {
  background: #e0e0e0;
}

.btn-primary:disabled,
.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
