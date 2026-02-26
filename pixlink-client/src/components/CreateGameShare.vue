<template>
  <div class="create-game-share">
    <h3>创建游戏共享</h3>
    <form @submit.prevent="createGameShare">
      <div class="form-group">
        <label for="title">游戏名称</label>
        <input 
          id="title" 
          v-model="formData.title" 
          type="text" 
          placeholder="请输入游戏名称" 
          required 
        />
      </div>
      
      <div class="form-group">
        <label for="proto">协议类型</label>
        <select id="proto" v-model="formData.proto" required>
          <option value="">请选择协议</option>
          <option value="TCP">TCP</option>
          <option value="UDP">UDP</option>
        </select>
      </div>
      
      <div class="form-group">
        <label for="port">端口号</label>
        <input 
          id="port" 
          v-model.number="formData.port" 
          type="number" 
          min="1" 
          max="65535" 
          placeholder="请输入端口号" 
          required 
        />
      </div>
      
      <div class="form-group">
        <label for="hostHint">游戏服务地址</label>
        <input 
          id="hostHint" 
          v-model="formData.hostHint" 
          type="text" 
          placeholder="默认为 127.0.0.1" 
        />
      </div>
      
      <button type="submit" :disabled="loading" class="btn-primary">
        {{ loading ? '创建中...' : '创建游戏共享' }}
      </button>
      
      <button type="button" @click="cancel" class="btn-secondary" :disabled="loading">
        取消
      </button>
    </form>
    
    <div v-if="error" class="error">{{ error }}</div>
    <div v-if="success" class="success">{{ success }}</div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { roomService } from '../services/roomService';
import { ztmTunnelService } from '../services/ztmTunnelService';
import type { GameShare } from '../types';

interface FormData {
  title: string;
  proto: string;
  port: number;
  hostHint: string;
}

interface Props {
  roomId: string;
}

const props = defineProps<Props>();
const emit = defineEmits(['gameShareCreated', 'cancel']);

const formData = reactive<FormData>({
  title: '',
  proto: '',
  port: 0,
  hostHint: '127.0.0.1'
});

const loading = ref(false);
const error = ref('');
const success = ref('');

const createGameShare = async () => {
  error.value = '';
  success.value = '';
  loading.value = true;
  
  try {
    if (!props.roomId) {
      throw new Error('房间ID不能为空');
    }
    
    // 首先创建游戏分享，获取 gameshareId
    const result = await roomService.createGameShare(
      props.roomId, 
      formData.title,
      formData.proto as any, // Type assertion since we validate input
      formData.port,
      'custom',
      formData.hostHint // Pass the hostHint parameter
    );
    
    if (!result) {
      throw new Error('创建游戏共享失败');
    }
    
    // 使用 roomId-gameshareId-端口号 生成隧道名称
    const tunnelName = `${props.roomId}-${result.id}-${formData.port}`;
    
    // 创建 ZTM outbound 隧道
    await ztmTunnelService.createOutboundTunnel(
      tunnelName,
      formData.proto as any, // Type assertion since we validate input
      '127.0.0.1', // 游戏通常运行在本地
      formData.port
    );
    
    // 更新游戏分享记录，保存隧道名称
    const updatedResult = await roomService.updateGameShare(result.id, tunnelName);
    
    if (updatedResult) {
      success.value = '游戏共享创建成功！';
      // Reset form
      Object.assign(formData, {
        title: '',
        proto: '',
        port: 0,
        hostHint: '127.0.0.1'
      });
      
      // Emit event to parent component
      emit('gameShareCreated', updatedResult);
    } else {
      // 如果游戏共享更新失败，尝试清理已创建的隧道
      try {
        await ztmTunnelService.deleteTunnel(tunnelName, formData.proto as any, 'outbound');
      } catch (cleanupErr) {
        console.error('Failed to cleanup tunnel after game share update failure:', cleanupErr);
      }
      throw new Error('更新游戏共享失败');
    }
  } catch (err: any) {
    error.value = err.message || '创建游戏共享时发生错误';
    console.error('Create game share error:', err);
  } finally {
    loading.value = false;
  }
};

const cancel = () => {
  emit('cancel');
};
</script>

<style scoped>
.create-game-share {
  padding: 20px;
  background-color: #f8f9fa;
  border-radius: 8px;
  margin-bottom: 20px;
}

.form-group {
  margin-bottom: 15px;
}

label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}

input, select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-sizing: border-box;
}

.btn-primary, .btn-secondary {
  padding: 10px 20px;
  margin-right: 10px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.btn-primary {
  background-color: #007bff;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: #0056b3;
}

.btn-secondary {
  background-color: #6c757d;
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background-color: #545b62;
}

.btn-primary:disabled, .btn-secondary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error {
  color: #dc3545;
  margin-top: 10px;
}

.success {
  color: #28a745;
  margin-top: 10px;
}
</style>