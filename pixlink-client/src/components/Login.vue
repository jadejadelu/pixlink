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
    <h2 class="text-xl text-pixel-text-secondary mb-6 text-center font-mono">登录</h2>

    <!-- 错误提示 -->
    <div v-if="error" class="bg-pixel-danger/20 border-2 border-pixel-danger text-pixel-danger px-4 py-3 rounded-none mb-4 font-mono text-sm">
      {{ error }}
      <Button
        v-if="requiresActivation"
        variant="secondary"
        size="sm"
        @click="handleResendActivation"
        class="mt-2 w-full"
      >
        重新发送激活邮件
      </Button>
    </div>

    <!-- 登录表单 -->
    <form @submit.prevent="handleLogin" class="space-y-4">
      <Input
        v-model="form.email"
        type="email"
        label="邮箱"
        placeholder="请输入邮箱"
        required
      />

      <Input
        v-model="form.password"
        type="password"
        label="密码"
        placeholder="请输入密码"
        required
      />

      <Button
        type="submit"
        :disabled="isLoading"
        :loading="isLoading"
        class="w-full"
      >
        {{ isLoading ? '登录中...' : '登录' }}
      </Button>
    </form>

    <!-- 底部链接 -->
    <div class="mt-6 text-center">
      <p class="text-pixel-text-secondary font-mono text-sm">
        还没有账号？
        <button
          @click.prevent="switchToRegister"
          class="text-pixel-primary hover:text-pixel-primary-dark underline font-bold"
        >
          立即注册
        </button>
      </p>
    </div>
  </Card>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { userService } from '../services/userService';
import { store } from '../store';
import type { LoginRequest } from '../types';
import Card from './common/Card.vue';
import Input from './common/Input.vue';
import Button from './common/Button.vue';

const emit = defineEmits(['login-success', 'switch-register']);

const form = ref<LoginRequest>({
  email: '',
  password: '',
});

const isLoading = ref(false);
const error = ref('');
const requiresActivation = ref(false);

const handleLogin = async () => {
  error.value = '';
  isLoading.value = true;
  requiresActivation.value = false;
  
  try {
    // Add device ID to login request
    const loginRequest: LoginRequest = {
      email: form.value.email,
      password: form.value.password,
      deviceId: userService.getDeviceId(),
    };
    
    const response = await userService.login(loginRequest);
    
    // Update store - handle both AuthResponse and LoginResponse structures
    store.setUser(response.user);
    const token = response.token || (response.session?.token);
    if (token) {
      store.setToken(token);
    }
    
    emit('login-success', response);
  } catch (err: any) {
    error.value = err.message || '登录失败，请重试';
    requiresActivation.value = err.requiresActivation === true;
  } finally {
    isLoading.value = false;
  }
};

const handleResendActivation = async () => {
  try {
    await userService.resendActivationEmail(form.value.email);
    error.value = '激活邮件已重新发送，请检查您的邮箱。';
    requiresActivation.value = false;
  } catch (err: any) {
    error.value = err.message || '重新发送激活邮件失败，请重试';
  }
};

const switchToRegister = () => {
  emit('switch-register');
};
</script>