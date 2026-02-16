<!-- src/components/Register.vue -->
<template>
  <div class="register-container">
    <div class="register-form">
      <h1>PixLink</h1>
      <h2>注册</h2>
      
      <div v-if="error" class="error-message">
        {{ error }}
      </div>
      
      <form @submit.prevent="handleRegister">
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
          <label for="nickname">昵称</label>
          <input
            type="text"
            id="nickname"
            v-model="form.nickname"
            required
            placeholder="请输入昵称"
          />
        </div>
        
        <div class="form-group">
          <label for="password">密码</label>
          <input
            type="password"
            id="password"
            v-model="form.password"
            required
            placeholder="请输入密码（至少6位）"
          />
        </div>
        
        <button type="submit" class="btn-primary" :disabled="isLoading">
          {{ isLoading ? '注册中...' : '注册' }}
        </button>
      </form>
      
      <div class="form-footer">
        <p>已有账号？<a href="#" @click.prevent="switchToLogin">立即登录</a></p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { userService } from '../services/userService';
import { store } from '../store';
import type { RegisterRequest } from '../types';

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

<style scoped>
.register-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.register-form {
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