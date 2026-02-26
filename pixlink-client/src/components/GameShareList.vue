<template>
  <div class="game-share-list">
    <h3>游戏共享列表</h3>
    
    <div v-if="loading" class="loading">加载中...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else-if="gameShares.length === 0" class="empty">暂无游戏共享</div>
    <div v-else class="list">
      <div 
        v-for="gameShare in gameShares" 
        :key="gameShare.id" 
        class="game-share-item"
      >
        <div class="game-info">
          <h4>
            {{ gameShare.title }}
            <span 
              v-if="gameShare.status === 'PAUSED'" 
              class="status-badge status-paused"
            >
              已暂停
            </span>
            <span 
              v-else-if="gameShare.status === 'ACTIVE'" 
              class="status-badge status-active"
            >
              运行中
            </span>
          </h4>
          <p>
            <span class="tag">协议: {{ gameShare.proto }}</span>
            <span class="tag">端口: {{ gameShare.port }}</span>
            <span class="tag">创建者: {{ gameShare.user?.nickname || 'Unknown' }}</span>
          </p>
        </div>
        
        <div class="actions">
          <!-- 加入游戏按钮 - 仅在游戏活跃时可用 -->
          <button 
            v-if="gameShare.status === 'ACTIVE' && !joinedGameShares.has(gameShare.id)" 
            class="btn-join" 
            @click="joinGame(gameShare)"
          >
            加入游戏
          </button>
          <button 
            v-else-if="gameShare.status === 'ACTIVE' && joinedGameShares.has(gameShare.id)" 
            class="btn-leave" 
            @click="leaveGame(gameShare)"
          >
            退出游戏
          </button>
          <button 
            v-else 
            class="btn-join disabled" 
            disabled
          >
            游戏已暂停
          </button>
          
          <!-- 控制按钮 - 仅游戏创建者可见 -->
          <div v-if="isCreator(gameShare)" class="creator-actions">
            <!-- 暂停/恢复按钮 -->
            <button 
              v-if="gameShare.status === 'ACTIVE'"
              class="btn-pause" 
              @click="pauseGameShare(gameShare.id)"
              :disabled="pausingId === gameShare.id"
            >
              {{ pausingId === gameShare.id ? '暂停中...' : '暂停分享' }}
            </button>
            <button 
              v-else-if="gameShare.status === 'PAUSED'"
              class="btn-resume" 
              @click="resumeGameShare(gameShare.id)"
              :disabled="resumingId === gameShare.id"
            >
              {{ resumingId === gameShare.id ? '恢复中...' : '继续分享' }}
            </button>
            
            <!-- 删除按钮 -->
            <button 
              class="btn-delete" 
              @click="deleteGameShare(gameShare.id)"
              :disabled="deletingId === gameShare.id"
            >
              {{ deletingId === gameShare.id ? '删除中...' : '删除' }}
            </button>
          </div>
          
          <!-- 删除按钮 - 房主也可以删除 -->
          <button 
            v-else-if="canDelete(gameShare)" 
            class="btn-delete" 
            @click="deleteGameShare(gameShare.id)"
            :disabled="deletingId === gameShare.id"
          >
            {{ deletingId === gameShare.id ? '删除中...' : '删除' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { roomService } from '../services/roomService';
import { ztmTunnelService } from '../services/ztmTunnelService';
import type { GameShare } from '../types';
import store from '../store';

interface Props {
  roomId: string;
}

const props = defineProps<Props>();
const emit = defineEmits(['refresh']);

const gameShares = ref<GameShare[]>([]);
const loading = ref(true);
const error = ref('');
const deletingId = ref<string | null>(null);
const pausingId = ref<string | null>(null);
const resumingId = ref<string | null>(null);
const joinedGameShares = ref<Set<string>>(new Set()); // 跟踪用户已加入的游戏

const loadGameShares = async () => {
  if (!props.roomId) {
    error.value = '房间ID不能为空';
    loading.value = false;
    return;
  }
  
  try {
    loading.value = true;
    error.value = '';
    
    const result = await roomService.getGameShares(props.roomId);
    gameShares.value = result;
  } catch (err: any) {
    console.error('Load game shares error:', err);
    error.value = err.message || '加载游戏共享失败';
  } finally {
    loading.value = false;
  }
};

const isCreator = (gameShare: any): boolean => {
  const user = store.getUser();
  return !!user && gameShare.userId === user.id;
};

const canDelete = (gameShare: any): boolean => {
  const user = store.getUser();
  return !!user && (gameShare.userId === user.id || gameShare.room?.ownerId === user.id);
};

const deleteGameShare = async (id: string) => {
  if (!confirm('确定要删除这个游戏共享吗？')) {
    return;
  }
  
  try {
    deletingId.value = id;
    
    // 获取游戏共享信息，以便删除对应的ZTM隧道
    const gameShare = gameShares.value.find(gs => gs.id === id);
    if (gameShare) {
      // 删除ZTM隧道 (outbound)
      // 隧道命名规则应与CreateGameShare组件中的一致
      const tunnelName = gameShare.tunnelName;
      console.log('Attempting to delete tunnel:', tunnelName, 'for game share:', gameShare.title);
      if (tunnelName) {
        try {
          const result = await ztmTunnelService.deleteTunnel(tunnelName, gameShare.proto, 'outbound');
          console.log('Successfully deleted tunnel:', tunnelName, 'result:', result);
        } catch (tunnelErr) {
          console.error('Failed to delete associated tunnel:', tunnelName, 'error:', tunnelErr);
          // 即使隧道删除失败，也要继续删除游戏共享记录
        }
      }
    }
    
    await roomService.deleteGameShare(id);
    
    // 从列表中移除
    gameShares.value = gameShares.value.filter(gs => gs.id !== id);
    emit('refresh'); // 触发父组件刷新
  } catch (err: any) {
    console.error('Delete game share error:', err);
    alert(err.message || '删除游戏共享失败');
  } finally {
    deletingId.value = null;
  }
};

const pauseGameShare = async (id: string) => {
  if (!confirm('确定要暂停这个游戏共享吗？暂停后其他玩家将无法加入。')) {
    return;
  }
  
  try {
    pausingId.value = id;
    
    // 先暂停游戏分享，然后删除ZTM隧道
    await roomService.pauseGameShare(id);
    
    // 从服务器获取最新的游戏共享信息，以确保获取正确的tunnelName
    const gameShareDetail = await roomService.getGameShareById(id);
    if (gameShareDetail) {
      // 删除ZTM隧道 (outbound) - 暂停时删除隧道
      const tunnelName = gameShareDetail.tunnelName;
      console.log('Attempting to pause and delete tunnel:', tunnelName, 'for game share:', gameShareDetail.title);
      if (tunnelName) {
        try {
          const result = await ztmTunnelService.deleteTunnel(tunnelName, gameShareDetail.proto, 'outbound');
          console.log('Successfully deleted tunnel during pause:', tunnelName, 'result:', result);
        } catch (tunnelErr) {
          console.error('Failed to delete associated tunnel during pause:', tunnelName, 'error:', tunnelErr);
          // 即使隧道删除失败，操作也被视为完成
        }
      }
    } else {
      // 如果无法获取最新信息，则回退到使用本地数据
      const gameShare = gameShares.value.find(gs => gs.id === id);
      if (gameShare) {
        const tunnelName = gameShare.tunnelName;
        console.log('Using cached game share data to delete tunnel:', tunnelName, 'for game share:', gameShare.title);
        if (tunnelName) {
          try {
            const result = await ztmTunnelService.deleteTunnel(tunnelName, gameShare.proto, 'outbound');
            console.log('Successfully deleted tunnel during pause (cached data):', tunnelName, 'result:', result);
          } catch (tunnelErr) {
            console.error('Failed to delete associated tunnel during pause (cached data):', tunnelName, 'error:', tunnelErr);
          }
        }
      }
    }
    
    // 更新本地状态
    const index = gameShares.value.findIndex(gs => gs.id === id);
    if (index !== -1) {
      const gameShare = gameShares.value[index];
      if (gameShare) {
        gameShare.status = 'PAUSED';
      }
    }
    emit('refresh'); // 触发父组件刷新
  } catch (err: any) {
    console.error('Pause game share error:', err);
    alert(err.message || '暂停游戏共享失败');
  } finally {
    pausingId.value = null;
  }
};

const resumeGameShare = async (id: string) => {
  if (!confirm('确定要恢复这个游戏共享吗？恢复后其他玩家将可以加入。')) {
    return;
  }
  
  try {
    resumingId.value = id;
    
    // 获取游戏共享信息，以便重新创建ZTM隧道
    const gameShare = gameShares.value.find(gs => gs.id === id);
    if (gameShare) {
      // 重新创建ZTM隧道 (outbound) - 恢复时重新创建隧道
      const tunnelName = gameShare.tunnelName;
      if (tunnelName) {
        try {
          await ztmTunnelService.createOutboundTunnel(
            tunnelName,
            gameShare.proto,
            gameShare.hostHint || '127.0.0.1', // 使用保存的hostHint，默认为本地
            gameShare.port
          );
        } catch (tunnelErr) {
          console.error('Failed to recreate associated tunnel during resume:', tunnelErr);
          throw tunnelErr; // 如果隧道创建失败，整个恢复过程失败
        }
      }
    }
    
    await roomService.resumeGameShare(id);
    
    // 更新本地状态
    const index = gameShares.value.findIndex(gs => gs.id === id);
    if (index !== -1) {
      const gameShare = gameShares.value[index];
      if (gameShare) {
        gameShare.status = 'ACTIVE';
      }
    }
    emit('refresh'); // 触发父组件刷新
  } catch (err: any) {
    console.error('Resume game share error:', err);
    alert(err.message || '恢复游戏共享失败');
  } finally {
    resumingId.value = null;
  }
};

const joinGame = async (gameShare: GameShare) => {
  // 实现加入游戏功能 - 创建 inbound 隧道
  try {
    // 生成唯一的隧道名称
    const tunnelName = `gameshare-${gameShare.id}-inbound`;
    
    // 先删除可能存在的旧隧道
    try {
      await ztmTunnelService.deleteTunnel(tunnelName, gameShare.proto, 'inbound');
      console.log('Old tunnel removed:', tunnelName);
    } catch (deleteErr) {
      // 隧道不存在时忽略错误
      console.log('No old tunnel to remove or error removing old tunnel:', deleteErr);
    }
    
    // 创建 inbound 隧道，获取分配的本地端口
    const localPort = await ztmTunnelService.createInboundTunnel(
      tunnelName,
      gameShare.proto,
      gameShare.port
    );
    
    // 添加到已加入的游戏集合
    joinedGameShares.value.add(gameShare.id);
    
    // 生成本地的inbound地址
    const localAddress = `127.0.0.1:${localPort}`;
    
    // 复制到剪贴板
    try {
      await navigator.clipboard.writeText(localAddress);
      console.log('Local address copied to clipboard:', localAddress);
    } catch (clipboardErr) {
      console.error('Failed to copy to clipboard:', clipboardErr);
    }
    
    // 显示成功消息，并提示用户可能需要在游戏客户端中连接到本地端口
    const result = confirm(`已成功加入游戏: ${gameShare.title}\n\n本地地址: ${localAddress}\n(已自动复制到剪贴板)\n\n现在可以在游戏客户端中连接到本地地址\n\n点击"确定"继续，点击"取消"断开连接`);
    
    // 如果用户选择断开连接，则删除隧道
    if (!result) {
      try {
        await ztmTunnelService.deleteTunnel(tunnelName, gameShare.proto, 'inbound');
        console.log('Tunnel removed after user cancelled connection');
        // 从已加入的游戏集合中移除
        joinedGameShares.value.delete(gameShare.id);
      } catch (tunnelErr) {
        console.error('Failed to remove tunnel after cancellation:', tunnelErr);
      }
    }
  } catch (err: any) {
    console.error('Join game error:', err);
    alert(`加入游戏失败: ${err.message || '未知错误'}`);
  }
};

const leaveGame = async (gameShare: GameShare) => {
  // 实现退出游戏功能 - 删除 inbound 隧道
  try {
    // 生成唯一的隧道名称
    const tunnelName = `gameshare-${gameShare.id}-inbound`;
    
    // 删除 inbound 隧道
    await ztmTunnelService.deleteTunnel(tunnelName, gameShare.proto, 'inbound');
    console.log('Tunnel removed on leave:', tunnelName);
    
    // 从已加入的游戏集合中移除
    joinedGameShares.value.delete(gameShare.id);
    
    // 显示成功消息
    alert(`已成功退出游戏: ${gameShare.title}`);
  } catch (err: any) {
    console.error('Leave game error:', err);
    alert(`退出游戏失败: ${err.message || '未知错误'}`);
  }
};

onMounted(() => {
  loadGameShares();
});

defineExpose({
  refresh: loadGameShares
});
</script>

<style scoped>
.game-share-list {
  margin-top: 20px;
}

.loading, .error, .empty {
  text-align: center;
  padding: 20px;
}

.error {
  color: #e74c3c;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.game-share-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background-color: #f9f9f9;
}

.game-info h4 {
  margin: 0 0 10px 0;
  color: #333;
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-badge {
  font-size: 0.7em;
  padding: 3px 6px;
  border-radius: 4px;
  font-weight: bold;
}

.status-active {
  background-color: #2ecc71;
  color: white;
}

.status-paused {
  background-color: #f39c12;
  color: white;
}

.game-info p {
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.tag {
  background-color: #e0e0e0;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.9em;
}

.actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
}

.creator-actions {
  display: flex;
  gap: 10px;
}

.btn-join, .btn-delete, .btn-pause, .btn-resume, .btn-leave {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9em;
  transition: all 0.3s;
}

.btn-join {
  background-color: #3498db;
  color: white;
}

.btn-join:hover {
  background-color: #2980b9;
}

.btn-join.disabled {
  background-color: #bdc3c7;
  cursor: not-allowed;
}

.btn-pause {
  background-color: #f39c12;
  color: white;
}

.btn-pause:hover {
  background-color: #e67e22;
}

.btn-resume {
  background-color: #2ecc71;
  color: white;
}

.btn-resume:hover {
  background-color: #27ae60;
}

.btn-delete {
  background-color: #e74c3c;
  color: white;
}

.btn-delete:hover {
  background-color: #c0392b;
}

.btn-leave {
  background-color: #e74c3c;
  color: white;
}

.btn-leave:hover {
  background-color: #c0392b;
}

.btn-pause:disabled, .btn-resume:disabled, .btn-delete:disabled {
  background-color: #bdc3c7;
  cursor: not-allowed;
  opacity: 0.6;
}
</style>