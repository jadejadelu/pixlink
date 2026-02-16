<!-- src/components/Login.vue -->
<template>
  <div class="login-container">
    <div class="login-form">
      <h1>PixLink</h1>
      <h2>登录</h2>
      
      <div v-if="error" class="error-message">
        {{ error }}
        <button v-if="requiresActivation" class="resend-link" @click="handleResendActivation">
          重新发送激活邮件
        </button>
      </div>
      
      <form @submit.prevent="handleLogin">
        <div class="form-group">
          <label for="email">邮箱</label>
          <input
            type="email"
            id="email"
            v-model="form.email"
            required
            placeholder="请输入邮箱"
          />
        </div>
        
        <div class="form-group">
          <label for="password">密码</label>
          <input
            type="password"
            id="password"
            v-model="form.password"
            required
            placeholder="请输入密码"
          />
        </div>
        
        <button type="submit" class="btn-primary" :disabled="isLoading">
          {{ isLoading ? '登录中...' : '登录' }}
        </button>
      </form>
      
      <div class="form-footer">
        <p>还没有账号？<a href="#" @click.prevent="switchToRegister">立即注册</a></p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { userService } from '../services/userService';
import { store } from '../store';
import type { LoginRequest } from '../types';

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
    
    // Update store
    store.setUser(response.user);
    store.setToken(response.token);
    
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

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.login-form {
  background: white;
  border-radius: 10px;
  padding: 40px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 400px;
}

h1 {
  font-size: 2.5rem;
  margin-bottom: 10px;
  color: #333;
  text-align: center;
}

h2 {
  font-size: 1.5rem;
  margin-bottom: 30px;
  color: #666;
  text-align: center;
}

.error-message {
  background: #ffebee;
  color: #c62828;
  padding: 10px;
  border-radius: 5px;
  margin-bottom: 20px;
  font-size: 0.9rem;
}

.resend-link {
  display: block;
  margin-top: 10px;
  padding: 8px 16px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 5px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.3s;
}

.resend-link:hover {
  background: #5568d3;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.form-group {
  margin-bottom: 20px;
}

label {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
  color: #555;
}

input {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 5px;
  font-size: 1rem;
  transition: border-color 0.3s;
}

input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
}

.btn-primary {
  width: 100%;
  padding: 12px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 5px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.3s;
}

.btn-primary:hover {
  background: #5a6fd8;
}

.btn-primary:disabled {
  background: #a0a7d4;
  cursor: not-allowed;
}

.form-footer {
  margin-top: 20px;
  text-align: center;
  font-size: 0.9rem;
  color: #666;
}

.form-footer a {
  color: #667eea;
  text-decoration: none;
  font-weight: 500;
}

.form-footer a:hover {
  text-decoration: underline;
}
</style>