<script setup lang="ts">
import { ref } from 'vue';
import { roomService } from '../services/roomService';
import { RoomVisibility } from '../types';
import Button from './common/Button.vue';
import Input from './common/Input.vue';
import Card from './common/Card.vue';
import Select from './common/Select.vue';

const emit = defineEmits(['create-success', 'cancel']);
const roomName = ref('');
const roomVisibility = ref<RoomVisibility>(RoomVisibility.PRIVATE);
const roomPassword = ref('');
const maxPlayers = ref(8);
const roomDescription = ref('');
const selectedGame = ref('');
const isLoading = ref(false);
const error = ref('');
const success = ref('');

// 常见游戏列表
const gameOptions = [
  { value: 'minecraft', label: '🎮 Minecraft' },
  { value: 'terraria', label: '🌍 Terraria' },
  { value: 'cs2', label: '🔫 Counter-Strike 2' },
  { value: 'valheim', label: '⚔️ Valheim' },
  { value: 'dont-starve', label: '🔥 Don\'t Starve Together' },
  { value: 'stardew-valley', label: '🌾 Stardew Valley' },
  { value: 'ark', label: '🦖 ARK: Survival Evolved' },
  { value: 'rust', label: '🏗️ Rust' },
  { value: 'other', label: '🎯 其他游戏' },
];

const handleCreateRoom = async () => {
  if (!roomName.value.trim()) {
    error.value = '房间名称不能为空';
    return;
  }

  isLoading.value = true;
  error.value = '';
  success.value = '';

  try {
    const room = await roomService.createRoom(
      roomName.value.trim(),
      roomVisibility.value,
      roomPassword.value.trim() || undefined
    );
    success.value = `房间创建成功！房间ID: ${room.id}`;

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
  <Card :hover="false" class="max-w-2xl mx-auto">
    <!-- 标题 -->
    <div class="flex items-center gap-3 mb-6">
      <div class="flex gap-0.5">
        <div class="w-3 h-3 bg-pixel-primary"></div>
        <div class="w-3 h-3 bg-pixel-primary/70"></div>
        <div class="w-3 h-3 bg-pixel-primary/40"></div>
      </div>
      <h2 class="text-2xl font-mono font-bold text-pixel-text">创建房间</h2>
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
      <!-- 房间名称 -->
      <Input
        v-model="roomName"
        label="房间名称 *"
        placeholder="输入房间名称，例如：周末开黑群"
        :disabled="isLoading"
        :error="error && !roomName.trim() ? '房间名称不能为空' : ''"
      />

      <!-- 游戏选择 -->
      <Select
        v-model="selectedGame"
        label="游戏类型（可选）"
        placeholder="选择游戏"
        :options="gameOptions"
        :disabled="isLoading"
      />

      <!-- 房间可见性 -->
      <div>
        <label class="block text-pixel-text text-sm font-mono mb-2">
          房间可见性
        </label>
        <select
          v-model="roomVisibility"
          :disabled="isLoading"
          class="pixel-input w-full"
        >
          <option :value="RoomVisibility.PRIVATE">🔒 私有 - 仅邀请链接可加入</option>
          <option :value="RoomVisibility.PUBLIC">🌐 公开 - 所有人可见</option>
        </select>
      </div>

      <!-- 最大玩家数 -->
      <div>
        <label class="block text-pixel-text text-sm font-mono mb-2">
          最大玩家数: {{ maxPlayers }}
        </label>
        <input
          type="range"
          v-model.number="maxPlayers"
          min="2"
          max="64"
          :disabled="isLoading"
          class="w-full h-2 bg-pixel-bg-light border-2 border-pixel-border appearance-none cursor-pointer"
        />
        <div class="flex justify-between text-xs text-pixel-text-secondary font-mono mt-1">
          <span>2</span>
          <span>64</span>
        </div>
      </div>

      <!-- 房间密码 -->
      <Input
        v-model="roomPassword"
        type="password"
        label="房间密码（可选）"
        placeholder="设置房间密码"
        :disabled="isLoading"
      />

      <!-- 房间描述 -->
      <div>
        <label class="block text-pixel-text text-sm font-mono mb-2">
          房间描述（可选）
        </label>
        <textarea
          v-model="roomDescription"
          :disabled="isLoading"
          placeholder="描述一下你的房间..."
          rows="3"
          class="pixel-input w-full resize-none"
        ></textarea>
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
        variant="primary"
        @click="handleCreateRoom"
        :loading="isLoading"
        :disabled="isLoading"
      >
        {{ isLoading ? '创建中...' : '创建房间' }}
      </Button>
    </div>
  </Card>
</template>