<template>
  <div class="auto-config">
    <div v-if="status === 'idle'" class="start-screen">
      <h2>配置您的设备</h2>
      <p>我们将自动完成所有设置，让您快速开始联机</p>
      <button @click="startConfiguration" class="btn-primary">
        开始配置
      </button>
    </div>

    <div v-else-if="status === 'configuring'" class="progress-screen">
      <h3>正在配置...</h3>

      <div class="steps">
        <div
          v-for="(step, index) in steps"
          :key="index"
          class="step"
          :class="step.status"
        >
          <span class="step-icon">
            {{
              step.status === 'completed' ? '✓' :
              step.status === 'running' ? '⟳' :
              step.status === 'failed' ? '✗' :
              '○'
            }}
          </span>
          <span class="step-name">{{ step.name }}</span>
          <span v-if="step.status === 'running'" class="step-spinner"></span>
        </div>
      </div>

      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
      </div>
    </div>

    <div v-else-if="status === 'completed'" class="success-screen">
      <div class="success-icon"></div>
      <h3>配置完成！</h3>
      <p>您的设备已准备好联机</p>
      <div class="virtual-ip" v-if="virtualIp">
        <label>您的虚拟 IP</label>
        <code>{{ virtualIp }}</code>
      </div>
      <button @click="$emit('complete')" class="btn-primary">
        进入应用
      </button>
    </div>

    <div v-else-if="status === 'error'" class="error-screen">
      <div class="error-icon"></div>
      <h3>配置失败</h3>
      <p>{{ errorMessage }}</p>
      <button @click="retry" class="btn-primary">重试</button>
      <button @click="showManualConfig" class="btn-secondary">
        手动配置
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

const emit = defineEmits(['complete']);

const status = ref<'idle' | 'configuring' | 'completed' | 'error'>('idle');
const steps = ref<Array<{ name: string; status: string }>>([]);
const virtualIp = ref('');
const errorMessage = ref('');

const progressPercent = computed(() => {
  const completed = steps.value.filter(s => s.status === 'completed').length;
  return steps.value.length > 0 ? (completed / steps.value.length) * 100 : 0;
});

async function startConfiguration() {
  status.value = 'configuring';
  steps.value = [
    { name: '生成安全身份', status: 'running' },
    { name: '上传到服务器', status: 'pending' },
    { name: '获取连接证书', status: 'pending' },
    { name: '导入到本地代理', status: 'pending' },
  ];

  try {
    await runStep(0, 1000);
    await runStep(1, 800);
    await runStep(2, 2000);
    await runStep(3, 1500);

    virtualIp.value = '10.0.0.' + Math.floor(Math.random() * 255);
    status.value = 'completed';
    emit('complete');
  } catch (error: any) {
    status.value = 'error';
    errorMessage.value = error.message || '配置过程中出现错误';
  }
}

function runStep(index: number, duration: number): Promise<void> {
  return new Promise((resolve) => {
    steps.value[index].status = 'running';

    setTimeout(() => {
      steps.value[index].status = 'completed';
      if (index < steps.value.length - 1) {
        steps.value[index + 1].status = 'running';
      }
      resolve();
    }, duration);
  });
}

function retry() {
  startConfiguration();
}

function showManualConfig() {
  console.log('Manual configuration');
}
</script>

<style scoped>
.auto-config {
  padding: 24px;
  text-align: center;
}

.start-screen h2 {
  margin: 0 0 16px 0;
  color: #333;
}

.start-screen p {
  color: #666;
  margin-bottom: 24px;
}

.btn-primary {
  padding: 12px 32px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
}

.progress-screen h3 {
  margin: 0 0 24px 0;
  color: #333;
}

.steps {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 24px;
}

.step {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  background: #f9fafb;
}

.step.completed {
  background: #d1fae5;
  color: #065f46;
}

.step.running {
  background: #dbeafe;
  color: #1e40af;
}

.step.failed {
  background: #fee2e2;
  color: #dc2626;
}

.step-icon {
  font-weight: 600;
}

.step-name {
  flex: 1;
  text-align: left;
}

.step-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #667eea;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #667eea;
  transition: width 0.3s ease;
}

.success-screen .success-icon {
  width: 64px;
  height: 64px;
  margin: 0 auto 16px;
  background: #10b981;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.success-screen .success-icon::before {
  content: '✓';
  font-size: 32px;
}

.success-screen h3 {
  margin: 0 0 8px 0;
  color: #333;
}

.success-screen p {
  color: #666;
  margin-bottom: 24px;
}

.virtual-ip {
  margin: 24px 0;
  padding: 16px;
  background: #f9fafb;
  border-radius: 8px;
}

.virtual-ip label {
  display: block;
  color: #6b7280;
  margin-bottom: 8px;
  font-size: 14px;
}

.virtual-ip code {
  font-family: monospace;
  font-size: 24px;
  font-weight: 600;
  color: #1f2937;
}

.error-screen .error-icon {
  width: 64px;
  height: 64px;
  margin: 0 auto 16px;
  background: #ef4444;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.error-screen .error-icon::before {
  content: '⚠';
  font-size: 32px;
}

.error-screen h3 {
  margin: 0 0 8px 0;
  color: #333;
}

.error-screen p {
  color: #dc2626;
  margin-bottom: 24px;
}

.btn-secondary {
  padding: 12px 32px;
  background: #f3f4f6;
  color: #374151;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  margin-left: 12px;
}
</style>
