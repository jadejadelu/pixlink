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
        <p>提示：游客模式 24 小时后失效</p>
        <p>建议 <a @click="$emit('register')">注册账号</a> 以保存您的房间记录</p>
      </div>

      <div class="modal-actions">
        <button @click="$emit('close')" class="btn-secondary">取消</button>
        <button
          @click="joinAsGuest"
          :disabled="!canSubmit"
          class="btn-primary"
        >
          {{ loading ? '加入中...' : '加入房间' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { roomService } from '../../services/roomService';

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
    const membership = await roomService.joinByNumber(
      roomNumber.value,
      password.value || undefined
    );

    if (membership) {
      localStorage.setItem('guest_nickname', nickname.value);
      emit('joined', {
        membership,
        nickname: nickname.value,
        isGuest: true,
      });
    }
  } catch (error: any) {
    alert(error.message || '加入房间失败');
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
  margin: 0 0 8px 0;
  color: #333;
}

.subtitle {
  color: #666;
  margin: 0 0 20px 0;
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

.form-group input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 1rem;
}

.info-box {
  background: #eff6ff;
  border-radius: 8px;
  padding: 12px;
  margin: 20px 0;
}

.info-box p {
  margin: 4px 0;
  font-size: 14px;
  color: #374151;
}

.info-box a {
  color: #667eea;
  cursor: pointer;
  text-decoration: underline;
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
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
</style>
