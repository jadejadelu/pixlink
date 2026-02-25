<template>
  <div class="quick-mode-panel">
    <div class="connection-card" :class="connectionStatus">
      <div class="status-header">
        <span class="status-indicator" :class="connectionStatus"></span>
        <span class="status-text">
          {{
            connectionStatus === 'connected' ? '已连接到虚拟网络' :
            connectionStatus === 'connecting' ? '正在建立连接...' :
            connectionStatus === 'error' ? '连接失败' :
            '未连接'
          }}
        </span>
      </div>

      <div v-if="virtualIp" class="virtual-ip-section">
        <label>您的虚拟 IP 地址</label>
        <div class="ip-display">
          <code>{{ virtualIp }}</code>
          <button @click="copyVirtualIp" class="btn-icon" title="复制">
            复制
          </button>
        </div>
        <p class="hint">在游戏中使用此地址连接服务器</p>
      </div>

      <div v-if="connectionStatus === 'connected'" class="network-stats">
        <div class="stat">
          <span class="stat-label">延迟</span>
          <span class="stat-value" :class="{
            'good': ping < 50,
            'medium': ping >= 50 && ping < 100,
            'poor': ping >= 100
          }">
            {{ ping }}ms
          </span>
        </div>
        <div class="stat">
          <span class="stat-label">丢包</span>
          <span class="stat-value" :class="{ 'good': packetLoss === 0 }">
            {{ packetLoss }}%
          </span>
        </div>
      </div>

      <div v-if="error" class="error-message">
        {{ error }}
        <button @click="openDiagnostics" class="btn-text">查看诊断</button>
      </div>

      <button
        v-if="connectionStatus !== 'connected'"
        @click="connect"
        class="btn-connect"
        :disabled="connectionStatus === 'connecting'"
      >
        {{ connectButtonText }}
      </button>
    </div>

    <div class="players-section">
      <h3>在线玩家 ({{ onlinePlayers.length }}人)</h3>
      <div class="player-list">
        <div
          v-for="player in onlinePlayers"
          :key="player.id"
          class="player-item"
        >
          <span class="player-avatar">{{ player.nickname?.[0] || '?' }}</span>
          <span class="player-name">{{ player.nickname }}</span>
          <span v-if="player.virtualIp" class="player-ip">{{ player.virtualIp }}</span>
          <span class="player-status" :class="player.status">{{ player.status }}</span>
        </div>
      </div>
    </div>

    <div class="action-buttons">
      <button @click="launchGame" class="btn-primary" :disabled="connectionStatus !== 'connected'">
        启动游戏
      </button>
      <button @click="copyVirtualIp" class="btn-secondary" :disabled="!virtualIp">
        复制 IP
      </button>
    </div>

    <div class="usage-tips">
      <h4>如何使用</h4>
      <ol>
        <li>点击"连接"加入虚拟网络</li>
        <li>复制您的虚拟 IP 地址</li>
        <li>在游戏中添加服务器，粘贴 IP</li>
        <li>开始联机游戏！</li>
      </ol>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';

const props = defineProps<{
  room: any;
}>();

const connectionStatus = ref<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
const virtualIp = ref('');
const ping = ref(0);
const packetLoss = ref(0);
const error = ref('');

const onlinePlayers = computed(() => {
  return props.room?.members?.filter((p: any) => p.state !== 'OFFLINE') || [];
});

const connectButtonText = computed(() => {
  switch (connectionStatus.value) {
    case 'disconnected': return '连接';
    case 'connecting': return '连接中...';
    case 'connected': return '已连接';
    case 'error': return '连接失败';
  }
});

async function connect() {
  connectionStatus.value = 'connecting';
  error.value = '';

  try {
    await new Promise(resolve => setTimeout(resolve, 2000));
    virtualIp.value = '10.0.0.' + Math.floor(Math.random() * 255);
    ping.value = Math.floor(Math.random() * 100);
    packetLoss.value = 0;
    connectionStatus.value = 'connected';
  } catch (err: any) {
    connectionStatus.value = 'error';
    error.value = err.message;
  }
}

function copyVirtualIp() {
  if (virtualIp.value) {
    navigator.clipboard.writeText(virtualIp.value);
  }
}

function launchGame() {
  console.log('Launching game...');
}

function openDiagnostics() {
  console.log('Opening diagnostics...');
}

onMounted(() => {
  connect();
});

let statusInterval: ReturnType<typeof setInterval>;
onMounted(() => {
  statusInterval = setInterval(() => {
    if (connectionStatus.value === 'connected') {
      ping.value = Math.floor(Math.random() * 100);
    }
  }, 5000);
});

onUnmounted(() => {
  clearInterval(statusInterval);
});
</script>

<style scoped>
.quick-mode-panel {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.connection-card {
  background: #f9fafb;
  border-radius: 12px;
  padding: 24px;
  border: 2px solid #e5e7eb;
}

.connection-card.connected {
  border-color: #10b981;
  background: #ecfdf5;
}

.connection-card.error {
  border-color: #ef4444;
  background: #fef2f2;
}

.status-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.status-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.status-indicator.disconnected { background: #9ca3af; }
.status-indicator.connecting { background: #f59e0b; animation: pulse 1s infinite; }
.status-indicator.connected { background: #10b981; }
.status-indicator.error { background: #ef4444; }

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.status-text {
  font-size: 18px;
  font-weight: 600;
}

.virtual-ip-section {
  margin-bottom: 20px;
}

.virtual-ip-section label {
  display: block;
  color: #6b7280;
  margin-bottom: 8px;
  font-size: 14px;
}

.ip-display {
  display: flex;
  align-items: center;
  gap: 8px;
  background: white;
  padding: 12px 16px;
  border-radius: 8px;
  border: 1px solid #d1d5db;
}

.ip-display code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
  flex: 1;
}

.hint {
  margin-top: 8px;
  color: #6b7280;
  font-size: 13px;
}

.network-stats {
  display: flex;
  gap: 24px;
  margin-bottom: 20px;
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-label {
  font-size: 12px;
  color: #6b7280;
}

.stat-value {
  font-size: 18px;
  font-weight: 600;
}

.stat-value.good { color: #10b981; }
.stat-value.medium { color: #f59e0b; }
.stat-value.poor { color: #ef4444; }

.btn-connect {
  width: 100%;
  padding: 12px;
  border-radius: 8px;
  border: none;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  background: #667eea;
  color: white;
}

.btn-connect:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.players-section h3 {
  margin: 0 0 12px 0;
  font-size: 16px;
  color: #374151;
}

.player-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.player-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background: white;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.player-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #667eea;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
}

.player-name {
  flex: 1;
  font-weight: 500;
}

.player-ip {
  font-family: monospace;
  font-size: 12px;
  color: #6b7280;
  background: #f3f4f6;
  padding: 2px 8px;
  border-radius: 4px;
}

.player-status {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 12px;
  background: #d1fae5;
  color: #065f46;
}

.action-buttons {
  display: flex;
  gap: 12px;
}

.action-buttons button {
  flex: 1;
  padding: 12px 24px;
  border-radius: 8px;
  border: none;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
}

.btn-primary {
  background: #10b981;
  color: white;
}

.btn-primary:disabled {
  background: #9ca3af;
}

.btn-secondary {
  background: #f3f4f6;
  color: #374151;
}

.usage-tips {
  background: #eff6ff;
  border-radius: 8px;
  padding: 16px;
}

.usage-tips h4 {
  margin: 0 0 12px 0;
  color: #1e40af;
}

.usage-tips ol {
  margin: 0;
  padding-left: 20px;
  color: #374151;
}

.usage-tips li {
  margin: 4px 0;
}

.error-message {
  background: #fee2e2;
  color: #dc2626;
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 16px;
}

.btn-text {
  background: none;
  border: none;
  color: #667eea;
  cursor: pointer;
  text-decoration: underline;
}
</style>
