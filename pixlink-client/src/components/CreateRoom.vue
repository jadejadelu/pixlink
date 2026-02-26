<script setup lang="ts">
import { ref } from 'vue';
import { roomService } from '../services/roomService';
import { RoomVisibility } from '../types';

const emit = defineEmits(['create-success', 'cancel']);
const roomName = ref('');
const roomVisibility = ref<RoomVisibility>(RoomVisibility.PRIVATE);
const roomPassword = ref('');
const isLoading = ref(false);
const error = ref('');
const success = ref('');

const handleCreateRoom = async () => {
  if (!roomName.value.trim()) {
    error.value = '房间名称不能为空';
    return;
  }
  
  isLoading.value = true;
  error.value = '';
  success.value = '';
  
  try {
    // 使用roomService创建房间，支持密码设置
    const room = await roomService.createRoom(
      roomName.value.trim(),
      roomVisibility.value,
      roomPassword.value.trim() || undefined
    );
    success.value = `房间创建成功！房间ID: ${room.id}`;
    
    // 显示房间ID供用户复制
    setTimeout(() => {
      emit('create-success', room);
    }, 1000);
  } catch (err: any) {
    error.value = err.message || '创建房间失败';
  } finally {
    isLoading.value = false;
  }
};

const handleCancel = () => {
  emit('cancel');
};
</script>

<template>
  <div class="create-room">
    <h2>创建房间</h2>
    
    <div v-if="error" class="error-message">
      {{ error }}
    </div>
    
    <div v-if="success" class="success-message">
      {{ success }}
    </div>
    
    <div class="form-group">
      <label for="roomName">房间名称</label>
      <input 
        type="text" 
        id="roomName"
        v-model="roomName"
        placeholder="请输入房间名称"
        :disabled="isLoading"
      />
    </div>
    
    <div class="form-group">
      <label for="roomVisibility">房间可见性</label>
      <select 
        id="roomVisibility"
        v-model="roomVisibility"
        :disabled="isLoading"
      >
        <option :value="RoomVisibility.PRIVATE">私有</option>
        <option :value="RoomVisibility.PUBLIC">公开</option>
      </select>
    </div>
    
    <div class="form-group">
      <label for="roomPassword">房间密码（可选）</label>
      <input 
        type="password" 
        id="roomPassword"
        v-model="roomPassword"
        placeholder="设置房间密码，加入时需要输入"
        :disabled="isLoading"
      />
    </div>
    
    <div class="form-actions">
      <button class="btn-primary" @click="handleCreateRoom" :disabled="isLoading">
        {{ isLoading ? '创建中...' : '创建房间' }}
      </button>
      <button class="btn-secondary" @click="handleCancel" :disabled="isLoading">
        取消
      </button>
    </div>
  </div>
</template>

<style scoped>
.create-room {
  background: white;
  border-radius: 10px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  max-width: 500px;
  margin: 0 auto;
}

.create-room h2 {
  font-size: 1.2rem;
  margin-bottom: 20px;
  color: #333;
  text-align: center;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-size: 0.9rem;
  color: #333;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
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
  justify-content: flex-end;
  margin-top: 20px;
}
</style>