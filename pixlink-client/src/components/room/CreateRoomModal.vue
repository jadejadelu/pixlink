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
              随机
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

<script setup lang="ts">
import { ref, computed } from 'vue';
import { roomService } from '../../services/roomService';

const emit = defineEmits(['close', 'created']);

const form = ref({
  name: '',
  roomNumber: '',
  password: '',
  hasPassword: false,
  maxPlayers: 8,
  gameType: 'minecraft',
});

const loading = ref(false);
const error = ref('');

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
    const room = await roomService.createRoom(form.value.name, undefined, {
      roomNumber: form.value.roomNumber || undefined,
      password: form.value.hasPassword ? form.value.password : undefined,
      maxPlayers: form.value.maxPlayers,
      gameType: form.value.gameType,
    });

    emit('created', room);
  } catch (err: any) {
    error.value = err.message || '创建房间失败';
  } finally {
    loading.value = false;
  }
}
</script>

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

h2 {
  margin: 0 0 20px 0;
  color: #333;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 4px;
  font-weight: 500;
  color: #555;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 1rem;
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

.btn-primary {
  padding: 10px 20px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
}

.btn-primary:disabled {
  background: #a0a7d4;
  cursor: not-allowed;
}

.btn-secondary {
  padding: 10px 20px;
  background: #f3f4f6;
  color: #374151;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
}

.error-message {
  background: #fee2e2;
  color: #dc2626;
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 16px;
}
</style>
