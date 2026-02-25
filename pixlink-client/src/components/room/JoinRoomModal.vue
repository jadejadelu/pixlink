<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <h2>加入房间</h2>

      <div class="tabs">
        <button
          :class="{ active: activeTab === 'number' }"
          @click="activeTab = 'number'"
        >
          房间号
        </button>
        <button
          :class="{ active: activeTab === 'code' }"
          @click="activeTab = 'code'"
        >
          分享码
        </button>
        <button
          :class="{ active: activeTab === 'link' }"
          @click="activeTab = 'link'"
        >
          邀请链接
        </button>
      </div>

      <div v-if="error" class="error-message">{{ error }}</div>

      <div v-if="activeTab === 'number'" class="tab-content">
        <div class="form-group">
          <label>房间号</label>
          <input
            v-model="form.roomNumber"
            placeholder="输入 4-6 位房间号"
            @input="handleRoomNumberInput"
          />
        </div>

        <div v-if="roomInfo" class="room-preview">
          <h4>{{ roomInfo.name }}</h4>
          <p>房主：{{ roomInfo.owner?.nickname }}</p>
          <p>当前人数：{{ roomInfo._count?.memberships || 0 }}/{{ roomInfo.maxPlayers }}</p>
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

<script setup lang="ts">
import { ref, computed } from 'vue';
import { roomService } from '../../services/roomService';

const emit = defineEmits(['close', 'joined']);

const activeTab = ref<'number' | 'code' | 'link'>('number');

const form = ref({
  roomNumber: '',
  password: '',
  shareCode: '',
});

const loading = ref(false);
const error = ref('');
const roomInfo = ref<any>(null);

let lookupTimeout: ReturnType<typeof setTimeout>;

async function lookupRoom() {
  if (!form.value.roomNumber) return;

  try {
    const room = await roomService.findByRoomNumber(form.value.roomNumber);
    roomInfo.value = room;
    error.value = '';
  } catch (err: any) {
    roomInfo.value = null;
  }
}

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
      membership = await roomService.joinByNumber(
        form.value.roomNumber,
        form.value.password || undefined
      );
    } else if (activeTab.value === 'code') {
      error.value = '分享码功能暂未实现';
      loading.value = false;
      return;
    } else {
      error.value = '邀请链接功能暂未实现';
      loading.value = false;
      return;
    }

    if (membership) {
      emit('joined', membership);
    }
  } catch (err: any) {
    error.value = err.message || '加入房间失败';
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
  font-size: 14px;
}

.tabs button.active {
  background: #667eea;
  color: white;
}

.tab-content {
  margin-bottom: 20px;
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
.form-group textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 1rem;
}

.form-group textarea {
  resize: vertical;
}

.room-preview {
  background: #f3f4f6;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 16px;
}

.room-preview h4 {
  margin: 0 0 8px 0;
  color: #333;
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
