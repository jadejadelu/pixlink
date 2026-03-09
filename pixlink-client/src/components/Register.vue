<template>
  <Card class="w-full max-w-md">
    <!-- Logo 和标题 -->
    <div class="flex items-center gap-3 justify-center mb-2">
      <div class="flex gap-0.5">
        <div class="w-3 h-3 bg-pixel-primary"></div>
        <div class="w-3 h-3 bg-pixel-primary opacity-70"></div>
        <div class="w-3 h-3 bg-pixel-primary opacity-40"></div>
      </div>
      <h1 class="font-mono text-3xl font-bold text-pixel-text tracking-tight">PixelLink</h1>
    </div>
    <h2 class="text-xl text-pixel-text-secondary mb-6 text-center font-mono">注册</h2>

    <!-- 错误提示 -->
    <div v-if="error" class="bg-pixel-danger/20 border-2 border-pixel-danger text-pixel-danger px-4 py-3 rounded-none mb-4 font-mono text-sm">
      {{ error }}
    </div>

    <!-- 注册表单 -->
    <form @submit.prevent="handleRegister" class="space-y-4">
      <Input
        v-model="form.email"
        type="email"
        label="邮箱"
        placeholder="请输入邮箱"
        required
      />

      <Input
        v-model="form.nickname"
        type="text"
        label="昵称"
        placeholder="请输入昵称"
        required
      />

      <Input
        v-model="form.password"
        type="password"
        label="密码"
        placeholder="请输入密码（至少6位）"
        required
      />

      <Button
        type="submit"
        :disabled="isLoading"
        :loading="isLoading"
        class="w-full"
      >
        {{ isLoading ? '注册中...' : '注册' }}
      </Button>
    </form>

    <!-- 底部链接 -->
    <div class="mt-6 text-center">
      <p class="text-pixel-text-secondary font-mono text-sm">
        已有账号？
        <button
          @click.prevent="switchToLogin"
          class="text-pixel-primary hover:text-pixel-primary-dark underline font-bold"
        >
          立即登录
        </button>
      </p>
    </div>
  </Card>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { userService } from '../services/userService';
import { store } from '../store';
import type { RegisterRequest } from '../types';
import Card from './common/Card.vue';
import Input from './common/Input.vue';
import Button from './common/Button.vue';

const emit = defineEmits(['register-success', 'switch-login']);

const form = ref<RegisterRequest>({
  email: '',
  nickname: '',
  password: '',
});

const isLoading = ref(false);
const error = ref('');

const handleRegister = async () => {
  error.value = '';
  isLoading.value = true;
  
  try {
    const response = await userService.register(form.value);
    
    // Update store
    store.setUser(response.user);
    
    // Only set token if session exists (for activated users)
    if (response.session && response.session.token) {
      store.setToken(response.session.token);
    }
    
    emit('register-success', response);
  } catch (err: any) {
    error.value = err.message || '注册失败，请重试';
  } finally {
    isLoading.value = false;
  }
};

const switchToLogin = () => {
  emit('switch-login');
};
</script>