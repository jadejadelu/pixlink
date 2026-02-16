<!-- src/components/Activate.vue -->
<template>
  <div class="activate-container">
    <div class="activate-form">
      <h1>PixLink</h1>
      <h2>账户激活</h2>
      
      <div v-if="isLoading" class="loading-message">
        <div class="spinner"></div>
        <p>正在激活账户...</p>
      </div>
      
      <div v-else-if="error" class="error-message">
        <p>{{ error }}</p>
        <button class="btn-primary" @click="goToLogin">返回登录</button>
      </div>
      
      <div v-else-if="success" class="success-message">
        <p>{{ success }}</p>
        <button class="btn-primary" @click="goToLogin">前往登录</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { apiService } from '../services/apiService';

interface Props {
  token: string;
}

const props = defineProps<Props>();

const emit = defineEmits(['activation-complete']);

const isLoading = ref(true);
const error = ref('');
const success = ref('');

onMounted(async () => {
  if (!props.token) {
    error.value = '激活链接无效，缺少激活令牌。';
    isLoading.value = false;
    return;
  }
  
  try {
    const response = await apiService.activateAccount(props.token);
    success.value = response.message || '账户激活成功！您现在可以登录了。';
    emit('activation-complete');
  } catch (err: any) {
    error.value = err.message || '激活失败，请检查链接是否正确或已过期。';
  } finally {
    isLoading.value = false;
  }
});

const goToLogin = () => {
  window.location.href = '/';
};
</script>

<style scoped>
.activate-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.activate-form {
  background: white;
  border-radius: 10px;
  padding: 40px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 500px;
  text-align: center;
}

h1 {
  font-size: 2.5rem;
  margin-bottom: 10px;
  color: #333;
}

h2 {
  font-size: 1.5rem;
  margin-bottom: 30px;
  color: #666;
}

.loading-message {
  padding: 20px;
}

.spinner {
  border: 4px solid #f3f3f3;
  border-top: 4px solid #667eea;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-message {
  background: #ffebee;
  color: #c62828;
  padding: 20px;
  border-radius: 5px;
  margin-bottom: 20px;
}

.success-message {
  background: #e8f5e8;
  color: #2e7d32;
  padding: 20px;
  border-radius: 5px;
  margin-bottom: 20px;
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
  margin-top: 20px;
}

.btn-primary:hover {
  background: #5a6fd8;
}
</style>