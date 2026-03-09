<script setup lang="ts">
import { ref } from 'vue';
import { roomService } from '../services/roomService';
import Button from './common/Button.vue';
import Input from './common/Input.vue';
import Card from './common/Card.vue';

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
  <Card :hover="false" class="max-w-lg mx-auto">
    <!-- 标题 -->
    <div class="flex items-center gap-3 mb-6">
      <div class="flex gap-0.5">
        <div class="w-3 h-3 bg-pixel-success"></div>
        <div class="w-3 h-3 bg-pixel-success/70"></div>
        <div class="w-3 h-3 bg-pixel-success/40"></div>
      </div>
      <h2 class="text-2xl font-mono font-bold text-pixel-text">加入房间</h2>
    </div>

    <!-- 错误提示 -->
    <div v-if="error" class="mb-4 p-3 border-2 border-pixel-danger bg-pixel-danger/10">
      <p class="text-pixel-danger text-sm font-mono">{{ error }}</p>
    </div>

    <!-- 成功提示 -->
    <div v-if="success" class="mb-4 p-3 border-2 border-pixel-success bg-pixel-success/10">
      <p class="text-pixel-success text-sm font-mono">{{ success }}</p>
    </div>

    <!-- 表单 -->
    <div class="space-y-4">
      <!-- 房间 ID 或邀请链接 -->
      <Input
        v-model="roomId"
        label="房间 ID 或邀请链接 *"
        placeholder="输入房间 ID 或粘贴邀请链接"
        :disabled="isLoading"
        :error="error && !roomId.trim() ? '房间 ID 不能为空' : ''"
      />

      <!-- 房间密码 -->
      <Input
        v-model="inviteCode"
        type="password"
        label="房间密码（如果有）"
        placeholder="输入房间密码"
        :disabled="isLoading"
      />

      <!-- 提示信息 -->
      <div class="p-3 border-2 border-pixel-border bg-pixel-bg-light">
        <p class="text-pixel-text-secondary text-xs font-mono">
          💡 提示：你可以直接输入房间 ID，或者粘贴好友分享的邀请链接
        </p>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="flex gap-3 justify-end mt-6 pt-4 border-t-2 border-pixel-border">
      <Button
        variant="secondary"
        @click="handleCancel"
        :disabled="isLoading"
      >
        取消
      </Button>
      <Button
        variant="success"
        @click="handleJoinRoom"
        :loading="isLoading"
        :disabled="isLoading"
      >
        {{ isLoading ? '加入中...' : '加入房间' }}
      </Button>
    </div>
  </Card>
</template>