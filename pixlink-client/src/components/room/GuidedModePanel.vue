<template>
  <div class="guided-mode-panel">
    <div v-if="currentStage === 'waiting'" class="stage waiting">
      <h3>等待准备</h3>
      <p>请在下方确认您已准备好开始游戏</p>

      <div class="player-readiness">
        <div
          v-for="player in players"
          :key="player.id"
          class="player-status-row"
        >
          <span class="player-name">{{ player.nickname }}</span>
          <span class="status-badge" :class="getPlayerStatus(player)">
            {{ getPlayerStatusText(player) }}
          </span>
        </div>
      </div>

      <div class="action-area">
        <button
          @click="toggleReady"
          :class="['btn-ready', { ready: isReady }]"
        >
          {{ isReady ? '取消准备' : '我准备好了' }}
        </button>
      </div>

      <div v-if="isOwner" class="owner-actions">
        <button
          @click="startGame"
          :disabled="!allReady"
          class="btn-start"
        >
          开始游戏
        </button>
        <p v-if="!allReady" class="hint">等待所有玩家准备就绪</p>
      </div>
    </div>

    <div v-else-if="currentStage === 'connecting'" class="stage connecting">
      <h3>正在连接</h3>
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: connectionProgress + '%' }"></div>
      </div>
      <div class="connection-steps">
        <div
          v-for="(step, index) in connectionSteps"
          :key="index"
          class="step"
          :class="{ completed: index < currentStep, current: index === currentStep }"
        >
          <span class="step-icon">{{ step.completed ? '✓' : step.current ? '⟳' : '○' }}</span>
          <span class="step-name">{{ step.name }}</span>
        </div>
      </div>
    </div>

    <div v-else-if="currentStage === 'connected'" class="stage connected">
      <div class="success-icon">✓</div>
      <h3>连接成功！</div>
      <p>所有玩家已准备就绪</p>

      <div v-if="virtualIp" class="ip-info">
        <label>您的虚拟 IP</label>
        <code>{{ virtualIp }}</code>
      </div>

      <button v-if="isOwner" @click="startGame" class="btn-start">
        开始游戏
      </button>
      <p v-else class="waiting-text">等待房主开始游戏...</p>
    </div>

    <div v-else-if="currentStage === 'gaming'" class="stage gaming">
      <h3>游戏进行中</h3>
      <div class="game-status">
        <p>当前游戏会话正在进行中</p>
        <div class="game-info">
          <div class="info-item">
            <span class="label">虚拟 IP:</span>
            <span class="value">{{ virtualIp }}</span>
          </div>
          <div class="info-item">
            <span class="label">延迟:</span>
            <span class="value">{{ ping }}ms</span>
          </div>
        </div>
      </div>

      <button @click="leaveGame" class="btn-leave">
        离开游戏
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

const props = defineProps<{
  room: any;
}>();

const emit = defineEmits(['start-game', 'leave-game']);

const currentStage = ref<'waiting' | 'connecting' | 'connected' | 'gaming'>('waiting');
const isReady = ref(false);
const virtualIp = ref('');
const ping = ref(0);

const players = computed(() => props.room?.members || []);

const isOwner = computed(() => {
  return props.room?.ownerId === 'current-user-id';
});

const allReady = computed(() => {
  return players.value.every((p: any) =>
    p.role === 'OWNER' || p.state === 'ONLINE'
  );
});

const connectionSteps = [
  { name: '初始化连接', completed: true, current: false },
  { name: '验证身份', completed: true, current: false },
  { name: '建立隧道', completed: false, current: true },
  { name: '获取 IP 地址', completed: false, current: false },
];

const currentStep = ref(2);
const connectionProgress = computed(() => (currentStep.value / connectionSteps.length) * 100);

function getPlayerStatus(player: any) {
  if (player.role === 'OWNER') return 'owner';
  return player.state === 'ONLINE' ? 'ready' : 'waiting';
}

function getPlayerStatusText(player: any) {
  if (player.role === 'OWNER') return '房主';
  return player.state === 'ONLINE' ? '已准备' : '等待中';
}

function toggleReady() {
  isReady.value = !isReady.value;
}

function startGame() {
  currentStage.value = 'connecting';

  setTimeout(() => {
    currentStep.value = 3;
  }, 1500);

  setTimeout(() => {
    currentStage.value = 'connected';
    virtualIp.value = '10.0.0.' + Math.floor(Math.random() * 255);
  }, 3000);

  setTimeout(() => {
    currentStage.value = 'gaming';
    ping.value = Math.floor(Math.random() * 100);
    emit('start-game');
  }, 4500);
}

function leaveGame() {
  emit('leave-game');
}
</script>

<style scoped>
.guided-mode-panel {
  padding: 20px;
}

.stage {
  text-align: center;
}

.stage h3 {
  margin: 0 0 16px 0;
  color: #333;
}

.player-readiness {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 20px 0;
  text-align: left;
}

.player-status-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: #f9fafb;
  border-radius: 8px;
}

.player-name {
  font-weight: 500;
}

.status-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge.owner {
  background: #dbeafe;
  color: #1e40af;
}

.status-badge.ready {
  background: #d1fae5;
  color: #065f46;
}

.status-badge.waiting {
  background: #f3f4f6;
  color: #6b7280;
}

.action-area {
  margin: 24px 0;
}

.btn-ready {
  padding: 12px 32px;
  border-radius: 8px;
  border: none;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  background: #667eea;
  color: white;
}

.btn-ready.ready {
  background: #f59e0b;
}

.owner-actions {
  margin-top: 24px;
}

.btn-start {
  padding: 12px 32px;
  border-radius: 8px;
  border: none;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  background: #10b981;
  color: white;
}

.btn-start:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

.hint {
  color: #6b7280;
  font-size: 14px;
  margin-top: 8px;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
  margin: 24px 0;
}

.progress-fill {
  height: 100%;
  background: #667eea;
  transition: width 0.3s ease;
}

.connection-steps {
  display: flex;
  flex-direction: column;
  gap: 12px;
  text-align: left;
}

.step {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
}

.step.completed {
  background: #d1fae5;
  color: #065f46;
}

.step.current {
  background: #dbeafe;
  color: #1e40af;
}

.step-icon {
  font-weight: 600;
}

.success-icon {
  width: 64px;
  height: 64px;
  margin: 0 auto 16px;
  background: #10b981;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
}

.ip-info {
  margin: 24px 0;
  padding: 16px;
  background: #f9fafb;
  border-radius: 8px;
}

.ip-info label {
  display: block;
  color: #6b7280;
  margin-bottom: 8px;
  font-size: 14px;
}

.ip-info code {
  font-family: monospace;
  font-size: 24px;
  font-weight: 600;
  color: #1f2937;
}

.waiting-text {
  color: #6b7280;
}

.game-status {
  margin: 24px 0;
}

.game-info {
  display: flex;
  justify-content: center;
  gap: 32px;
  margin-top: 16px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-item .label {
  font-size: 12px;
  color: #6b7280;
}

.info-item .value {
  font-family: monospace;
  font-size: 18px;
  font-weight: 600;
}

.btn-leave {
  padding: 12px 32px;
  border-radius: 8px;
  border: none;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  background: #ef4444;
  color: white;
  margin-top: 24px;
}
</style>
