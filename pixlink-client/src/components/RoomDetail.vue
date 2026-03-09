<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { roomService } from '../services/roomService';
import { store } from '../store';
import Button from './common/Button.vue';
import Input from './common/Input.vue';
import Card from './common/Card.vue';
import ConfirmDialog from './common/ConfirmDialog.vue';
import { useToast } from '../composables/useToast';

const props = defineProps<{
  roomId: string;
}>();

const emit = defineEmits(['leave-room', 'close']);

const room = ref<any>(null);
const isLoading = ref(false);
const error = ref('');
const showEditForm = ref(false);
const editName = ref('');
const editVisibility = ref('PRIVATE');
const editInviteCode = ref('');
const inviteLink = ref('');
const showCreateGameForm = ref(false);
const gameShares = ref<any[]>([]);
const copiedAddress = ref<string | null>(null);
const showLeaveDialog = ref(false);
const showDeleteDialog = ref(false);

const toast = useToast();

// 创建游戏表单数据
const gameFormData = ref({
  title: '',
  proto: 'TCP',
  port: 0,
  hostHint: '127.0.0.1'
});

const loadRoomDetails = async () => {
  isLoading.value = true;
  error.value = '';

  try {
    const roomData = await roomService.getRoom(props.roomId);
    if (roomData) {
      room.value = roomData;
      editName.value = roomData.name;
      editVisibility.value = roomData.visibility;
      editInviteCode.value = roomData.inviteCode || '';
      // 生成邀请链接
      inviteLink.value = `${window.location.origin}/join?room=${roomData.id}${roomData.inviteCode ? '&code=' + roomData.inviteCode : ''}`;
      // 加载游戏分享列表
      await loadGameShares();
    } else {
      error.value = '房间不存在或无法访问';
    }
  } catch (err: any) {
    error.value = err.message || '获取房间详情失败';
  } finally {
    isLoading.value = false;
  }
};

const loadGameShares = async () => {
  try {
    const shares = await roomService.getGameShares(props.roomId);
    gameShares.value = shares || [];
  } catch (err: any) {
    console.error('加载游戏分享失败:', err);
  }
};

const copyInviteLink = async () => {
  try {
    await navigator.clipboard.writeText(inviteLink.value);
    toast.success('邀请链接已复制到剪贴板！');
  } catch (err) {
    console.error('复制失败:', err);
    toast.error('复制失败，请手动复制');
  }
};

const handleEditRoom = async () => {
  try {
    await roomService.updateRoom(props.roomId, {
      name: editName.value,
      visibility: editVisibility.value,
      inviteCode: editInviteCode.value || undefined
    });
    showEditForm.value = false;
    await loadRoomDetails();
  } catch (err: any) {
    error.value = err.message || '编辑房间失败';
  }
};

const handleLeaveRoom = async () => {
  showLeaveDialog.value = true;
};

const confirmLeaveRoom = async () => {
  try {
    await roomService.leaveRoom(props.roomId);
    toast.success('已离开房间');
    emit('leave-room', props.roomId);
  } catch (err: any) {
    error.value = err.message || '离开房间失败';
    toast.error(err.message || '离开房间失败');
  } finally {
    showLeaveDialog.value = false;
  }
};

const handleDeleteRoom = async () => {
  showDeleteDialog.value = true;
};

const confirmDeleteRoom = async () => {
  try {
    await roomService.deleteRoom(props.roomId);
    toast.success('房间已删除');
    emit('leave-room', props.roomId);
  } catch (err: any) {
    error.value = err.message || '删除房间失败';
    toast.error(err.message || '删除房间失败');
  } finally {
    showDeleteDialog.value = false;
  }
};

const handleRemoveMember = async (memberId: string, memberName: string) => {
  if (!confirm(`确定要踢出成员 ${memberName} 吗？`)) return;
  
  try {
    await roomService.removeMember(props.roomId, memberId);
    await loadRoomDetails();
  } catch (err: any) {
    error.value = err.message || '踢出成员失败';
  }
};

const isRoomOwner = computed(() => {
  return room.value?.ownerId === store.getUser()?.id;
});

const createGameShare = async () => {
  if (!gameFormData.value.title || !gameFormData.value.proto || !gameFormData.value.port) {
    error.value = '请填写完整的游戏信息';
    return;
  }

  try {
    await roomService.createGameShare(
      props.roomId,
      gameFormData.value.title,
      gameFormData.value.proto as any,
      gameFormData.value.port,
      'custom',
      gameFormData.value.hostHint
    );

    // 重置表单
    gameFormData.value = {
      title: '',
      proto: 'TCP',
      port: 0,
      hostHint: '127.0.0.1'
    };
    showCreateGameForm.value = false;

    // 重新加载游戏列表
    await loadGameShares();
  } catch (err: any) {
    error.value = err.message || '创建游戏分享失败';
  }
};

const deleteGameShare = async (shareId: string) => {
  if (!confirm('确定要删除这个游戏分享吗？')) return;

  try {
    await roomService.deleteGameShare(shareId);
    await loadGameShares();
  } catch (err: any) {
    error.value = err.message || '删除游戏分享失败';
  }
};

const copyServerAddress = async (share: any) => {
  const address = `${share.hostHint || '127.0.0.1'}:${share.port}`;
  try {
    await navigator.clipboard.writeText(address);
    copiedAddress.value = share.id;
    setTimeout(() => {
      copiedAddress.value = null;
    }, 2000);
  } catch (err) {
    console.error('复制失败:', err);
  }
};

const canDeleteShare = (share: any) => {
  const user = store.getUser();
  return user && (share.userId === user.id || isRoomOwner.value);
};

onMounted(() => {
  loadRoomDetails();
});
</script>

<template>
  <Card :hover="false" class="max-w-7xl mx-auto">
    <!-- 标题栏 -->
    <div class="flex items-center justify-between mb-6 pb-4 border-b-2 border-pixel-border">
      <div class="flex items-center gap-3">
        <div class="flex gap-0.5">
          <div class="w-3 h-3 bg-pixel-warning"></div>
          <div class="w-3 h-3 bg-pixel-warning/70"></div>
          <div class="w-3 h-3 bg-pixel-warning/40"></div>
        </div>
        <h2 class="text-2xl font-mono font-bold text-pixel-text">
          {{ room?.name || '房间详情' }}
        </h2>
      </div>
      <div class="flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          @click="loadRoomDetails"
          :disabled="isLoading"
        >
          {{ isLoading ? '加载中...' : '刷新' }}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          @click="emit('close')"
        >
          关闭
        </Button>
      </div>
    </div>

    <!-- 错误提示 -->
    <div v-if="error" class="mb-4 p-3 border-2 border-pixel-danger bg-pixel-danger/10">
      <p class="text-pixel-danger text-sm font-mono">{{ error }}</p>
    </div>

    <!-- 加载状态 -->
    <div v-if="isLoading" class="text-center py-12">
      <div class="flex justify-center gap-1 mb-4">
        <div class="w-3 h-3 bg-pixel-primary animate-pulse"></div>
        <div class="w-3 h-3 bg-pixel-primary animate-pulse" style="animation-delay: 150ms"></div>
        <div class="w-3 h-3 bg-pixel-primary animate-pulse" style="animation-delay: 300ms"></div>
      </div>
      <p class="text-pixel-text-secondary font-mono text-sm">加载中...</p>
    </div>

    <!-- 房间内容 - 统一面板布局 -->
    <div v-else-if="room" class="space-y-6">
      <!-- 房间信息栏 -->
      <div class="p-4 border-2 border-pixel-border bg-pixel-bg-light">
        <div class="grid grid-cols-4 gap-4 mb-4">
          <div>
            <p class="text-xs text-pixel-text-secondary font-mono mb-1">房间 ID</p>
            <p class="text-sm text-pixel-text font-mono">{{ room.id.substring(0, 8) }}...</p>
          </div>
          <div>
            <p class="text-xs text-pixel-text-secondary font-mono mb-1">可见性</p>
            <p class="text-sm text-pixel-text font-mono">
              {{ room.visibility === 'PUBLIC' ? '公开' : '私有' }}
            </p>
          </div>
          <div>
            <p class="text-xs text-pixel-text-secondary font-mono mb-1">成员数</p>
            <p class="text-sm text-pixel-text font-mono">{{ room.memberships?.length || 0 }}</p>
          </div>
          <div>
            <p class="text-xs text-pixel-text-secondary font-mono mb-1">状态</p>
            <p class="text-sm text-pixel-text font-mono">
              {{ room.status === 'ACTIVE' ? '活跃' : '非活跃' }}
            </p>
          </div>
        </div>

        <!-- 邀请链接 -->
        <div class="p-3 border-2 border-pixel-border bg-pixel-bg">
          <p class="text-xs text-pixel-text-secondary font-mono mb-2">邀请链接</p>
          <div class="flex gap-2">
            <input
              :value="inviteLink"
              readonly
              class="pixel-input flex-1 text-xs"
            />
            <Button
              variant="primary"
              size="sm"
              @click="copyInviteLink"
            >
              复制
            </Button>
          </div>
        </div>
      </div>

      <!-- 主内容区 - 左右分栏 -->
      <div class="grid grid-cols-12 gap-6">
        <!-- 左侧：成员列表 -->
        <div class="col-span-4">
          <div class="p-4 border-2 border-pixel-border bg-pixel-bg-light h-full">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-mono font-bold text-pixel-text flex items-center gap-2">
                <span class="w-2 h-2 bg-pixel-success"></span>
                成员列表
              </h3>
              <span class="text-xs text-pixel-text-secondary font-mono">
                {{ room.memberships?.length || 0 }} 人
              </span>
            </div>

            <div class="space-y-2 max-h-96 overflow-y-auto">
              <div
                v-for="member in room.memberships"
                :key="member.userId"
                class="p-3 border-2 border-pixel-border bg-pixel-bg hover:bg-pixel-bg-card transition-colors"
              >
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 border-2 border-pixel-border bg-pixel-primary flex items-center justify-center text-white font-mono font-bold text-sm">
                    {{ member.user?.nickname?.charAt(0).toUpperCase() || 'U' }}
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                      <h4 class="text-sm font-mono font-bold text-pixel-text truncate">
                        {{ member.user?.nickname || '未知用户' }}
                      </h4>
                      <span
                        v-if="member.role === 'OWNER'"
                        class="px-2 py-0.5 text-xs font-mono font-bold border border-pixel-success bg-pixel-success/20 text-pixel-success"
                      >
                        房主
                      </span>
                    </div>
                    <p class="text-xs text-pixel-text-secondary font-mono truncate">
                      {{ member.user?.email || '无邮箱' }}
                    </p>
                  </div>
                </div>
                <div v-if="isRoomOwner && member.role !== 'OWNER'" class="mt-2">
                  <Button
                    variant="danger"
                    size="sm"
                    @click="handleRemoveMember(member.userId, member.user?.nickname || '未知用户')"
                    class="w-full"
                  >
                    踢出
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 右侧：游戏分享和聊天 -->
        <div class="col-span-8 space-y-6">
          <!-- 游戏分享列表 -->
          <div class="p-4 border-2 border-pixel-border bg-pixel-bg-light">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-mono font-bold text-pixel-text flex items-center gap-2">
                <span class="w-2 h-2 bg-pixel-primary"></span>
                游戏分享
              </h3>
              <Button
                variant="primary"
                size="sm"
                @click="showCreateGameForm = !showCreateGameForm"
              >
                {{ showCreateGameForm ? '取消' : '+ 添加游戏' }}
              </Button>
            </div>

            <!-- 创建游戏表单 -->
            <div v-if="showCreateGameForm" class="mb-4 p-4 border-2 border-pixel-border bg-pixel-bg">
              <h4 class="text-sm font-mono font-bold text-pixel-text mb-3">创建游戏分享</h4>
              <div class="space-y-3">
                <Input
                  v-model="gameFormData.title"
                  label="游戏名称"
                  placeholder="输入游戏名称"
                />
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="block text-pixel-text text-sm font-mono mb-2">协议类型</label>
                    <select v-model="gameFormData.proto" class="pixel-input w-full">
                      <option value="TCP">TCP</option>
                      <option value="UDP">UDP</option>
                    </select>
                  </div>
                  <Input
                    v-model.number="gameFormData.port"
                    label="端口号"
                    type="number"
                    placeholder="1-65535"
                  />
                </div>
                <Input
                  v-model="gameFormData.hostHint"
                  label="服务器地址"
                  placeholder="默认 127.0.0.1"
                />
                <div class="flex gap-2">
                  <Button variant="primary" size="sm" @click="createGameShare">创建</Button>
                  <Button variant="secondary" size="sm" @click="showCreateGameForm = false">取消</Button>
                </div>
              </div>
            </div>

            <!-- 游戏列表 -->
            <div v-if="gameShares.length === 0" class="text-center py-8">
              <p class="text-pixel-text-secondary font-mono text-sm">暂无游戏分享</p>
              <p class="text-pixel-text-secondary font-mono text-xs mt-2">点击"添加游戏"开始分享</p>
            </div>

            <div v-else class="grid grid-cols-2 gap-3 max-h-80 overflow-y-auto">
              <div
                v-for="share in gameShares"
                :key="share.id"
                class="p-3 border-2 border-pixel-border bg-pixel-bg hover:shadow-pixel transition-all"
              >
                <div class="flex items-start justify-between mb-2">
                  <h4 class="text-sm font-mono font-bold text-pixel-text truncate flex-1">
                    {{ share.title }}
                  </h4>
                  <span
                    :class="[
                      'px-2 py-0.5 text-xs font-mono font-bold border ml-2',
                      share.status === 'ACTIVE'
                        ? 'border-pixel-success bg-pixel-success/20 text-pixel-success'
                        : 'border-pixel-warning bg-pixel-warning/20 text-pixel-warning'
                    ]"
                  >
                    {{ share.status === 'ACTIVE' ? '运行中' : '已停止' }}
                  </span>
                </div>

                <div class="space-y-1 mb-3">
                  <p class="text-xs text-pixel-text-secondary font-mono">
                    分享者: {{ share.user?.nickname || '未知' }}
                  </p>
                  <p class="text-xs text-pixel-text-secondary font-mono">
                    协议: {{ share.proto }} | 端口: {{ share.port }}
                  </p>
                  <div class="flex items-center gap-2">
                    <p class="text-xs text-pixel-text font-mono truncate flex-1">
                      {{ share.hostHint || '127.0.0.1' }}:{{ share.port }}
                    </p>
                    <button
                      @click="copyServerAddress(share)"
                      class="text-xs text-pixel-primary hover:text-pixel-primary-dark font-mono"
                    >
                      {{ copiedAddress === share.id ? '已复制' : '复制' }}
                    </button>
                  </div>
                </div>

                <div v-if="canDeleteShare(share)" class="flex gap-2">
                  <Button
                    variant="danger"
                    size="sm"
                    @click="deleteGameShare(share.id)"
                    class="w-full"
                  >
                    删除
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <!-- 聊天界面（预留） -->
          <div class="p-4 border-2 border-pixel-border bg-pixel-bg-light">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-mono font-bold text-pixel-text flex items-center gap-2">
                <span class="w-2 h-2 bg-pixel-text-secondary"></span>
                聊天室
              </h3>
              <span class="text-xs text-pixel-text-secondary font-mono">即将上线</span>
            </div>

            <div class="h-48 flex items-center justify-center border-2 border-dashed border-pixel-border bg-pixel-bg">
              <div class="text-center">
                <div class="flex justify-center gap-1 mb-3">
                  <div class="w-2 h-2 border-2 border-pixel-text-secondary"></div>
                  <div class="w-2 h-2 border-2 border-pixel-text-secondary"></div>
                  <div class="w-2 h-2 border-2 border-pixel-text-secondary"></div>
                </div>
                <p class="text-pixel-text-secondary font-mono text-sm">聊天功能即将上线</p>
                <p class="text-pixel-text-secondary font-mono text-xs mt-2">敬请期待...</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 房主编辑表单 -->
      <div v-if="showEditForm && isRoomOwner" class="p-4 border-2 border-pixel-border bg-pixel-bg-light">
        <h3 class="text-lg font-mono font-bold text-pixel-text mb-4">编辑房间</h3>
        <div class="space-y-3">
          <Input
            v-model="editName"
            label="房间名称"
            placeholder="输入房间名称"
          />
          <div>
            <label class="block text-pixel-text text-sm font-mono mb-2">可见性</label>
            <select v-model="editVisibility" class="pixel-input w-full">
              <option value="PRIVATE">私有</option>
              <option value="PUBLIC">公开</option>
            </select>
          </div>
          <Input
            v-model="editInviteCode"
            label="房间密码（可选）"
            placeholder="输入房间密码"
          />
          <div class="flex gap-2">
            <Button variant="primary" size="sm" @click="handleEditRoom">保存</Button>
            <Button variant="secondary" size="sm" @click="showEditForm = false">取消</Button>
          </div>
        </div>
      </div>

      <!-- 底部操作 -->
      <div class="flex gap-3 justify-between pt-4 border-t-2 border-pixel-border">
        <div>
          <Button
            v-if="isRoomOwner && !showEditForm"
            variant="secondary"
            @click="showEditForm = true"
          >
            编辑房间
          </Button>
        </div>
        <div class="flex gap-3">
          <Button
            variant="secondary"
            @click="handleLeaveRoom"
          >
            离开房间
          </Button>
          <Button
            v-if="isRoomOwner"
            variant="danger"
            @click="handleDeleteRoom"
          >
            删除房间
          </Button>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else-if="!isLoading" class="text-center py-12">
      <p class="text-pixel-text-secondary font-mono">无法加载房间详情</p>
    </div>

    <!-- 确认对话框 -->
    <ConfirmDialog
      :show="showLeaveDialog"
      title="离开房间"
      message="确定要离开这个房间吗？"
      confirm-text="离开"
      cancel-text="取消"
      type="warning"
      @confirm="confirmLeaveRoom"
      @cancel="showLeaveDialog = false"
    />

    <ConfirmDialog
      :show="showDeleteDialog"
      title="删除房间"
      message="确定要删除这个房间吗？此操作不可恢复。"
      confirm-text="删除"
      cancel-text="取消"
      type="danger"
      @confirm="confirmDeleteRoom"
      @cancel="showDeleteDialog = false"
    />
  </Card>
</template>
