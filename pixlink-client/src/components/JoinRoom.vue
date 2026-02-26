<script setup lang="ts">
import { ref } from 'vue';
import { roomService } from '../services/roomService';

const emit = defineEmits(['join-success', 'cancel']);
const roomId = ref('');
const inviteCode = ref('');
const isLoading = ref(false);
const error = ref('');
const success = ref('');

// 使用一个标志来跟踪请求状态，防止竞态条件
let currentRequestId = 0;

const handleJoinRoom = async () => {
  if (!roomId.value.trim()) {
    error.value = '房间 ID 不能为空';
    return;
  }
  
  console.log('Join room button clicked');
  console.log('Room ID:', roomId.value.trim());
  console.log('Invite code:', inviteCode.value.trim() || undefined);
  
  // 生成唯一的请求ID来跟踪当前请求
  const requestId = ++currentRequestId;
  isLoading.value = true;
  error.value = '';
  success.value = '';
  
  try {
    console.log('Calling roomService.joinRoom...');
    const response = await roomService.joinRoom(roomId.value.trim(), inviteCode.value.trim() || undefined);
    console.log('roomService.joinRoom returned:', response);
    
    // 检查是否仍是当前请求（防止后续请求覆盖状态）
    if (requestId !== currentRequestId) {
      console.log('Request superseded by newer request, aborting');
      return;
    }
    
    // 确保响应有效才显示成功消息
    if (!response) {
      console.log('Response is null/undefined');
      error.value = '加入房间失败';
      return;
    }
    
    // 再次确认仍是当前请求
    if (requestId !== currentRequestId) {
      console.log('Request superseded by newer request, aborting');
      return;
    }
    
    console.log('Join room successful, showing success message');
    success.value = '加入房间成功！';
    
    setTimeout(() => {
      // 在发出事件前再次确认仍是当前请求
      if (requestId === currentRequestId) {
        emit('join-success', response);
      }
    }, 1000);
  } catch (err: any) {
    console.error('Error joining room:', err);
    console.error('Error message:', err.message);
    
    // 再次确认仍是当前请求，防止状态被覆盖
    if (requestId === currentRequestId) {
      // 确保清除任何可能已设置的成功消息，并设置错误消息
      success.value = '';
      error.value = err.message || '加入房间失败';
      
      // 额外保护：确保错误状态不会被后续操作覆盖
      console.log('Error handled, ensuring error message persists:', error.value);
    }
  } finally {
    // 只有当前请求结束时才停止loading状态
    if (requestId === currentRequestId) {
      isLoading.value = false;
    }
  }
};

const handleCancel = () => {
  emit('cancel');
};
</script>

<template>
  <div class="join-room">
    <h2>加入房间</h2>
    
    <div v-if="error" class="error-message">
      {{ error }}
    </div>
    
    <div v-if="success" class="success-message">
      {{ success }}
    </div>
    
    <div class="form-group">
      <label for="roomId">房间 ID</label>
      <input 
        type="text" 
        id="roomId"
        v-model="roomId"
        placeholder="请输入房间 ID"
        :disabled="isLoading"
      />
    </div>
    
    <div class="form-group">
      <label for="inviteCode">房间密码（如果有）</label>
      <input 
        type="password" 
        id="inviteCode"
        v-model="inviteCode"
        placeholder="输入房间密码"
        :disabled="isLoading"
      />
    </div>
    
    <div class="form-actions">
      <button class="btn-primary" @click="handleJoinRoom" :disabled="isLoading">
        {{ isLoading ? '加入中...' : '加入房间' }}
      </button>
      <button class="btn-secondary" @click="handleCancel" :disabled="isLoading">
        取消
      </button>
    </div>
  </div>
</template>

<style scoped>
.join-room {
  background: white;
  border-radius: 10px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  max-width: 500px;
  margin: 0 auto;
}

.join-room h2 {
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

.form-group input {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 5px;
  font-size: 1rem;
}

.form-group input:focus {
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