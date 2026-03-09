<script setup lang="ts">
import { ref, onMounted } from 'vue';
import Login from './components/Login.vue';
import Register from './components/Register.vue';
import Activate from './components/Activate.vue';
import ImportPermit from './components/ImportPermit.vue';
import RoomList from './components/RoomList.vue';
import CreateRoom from './components/CreateRoom.vue';
import JoinRoom from './components/JoinRoom.vue';
import RoomDetail from './components/RoomDetail.vue';
import AppHeader from './components/layout/AppHeader.vue';
import Button from './components/common/Button.vue';
import Card from './components/common/Card.vue';
import ToastContainer from './components/common/ToastContainer.vue';
import ScrollToTop from './components/common/ScrollToTop.vue';
import { store } from './store';
import { userService } from './services/userService';
import { ztmService } from './services/ztmService';
import { roomService } from './services/roomService';
import { useToast } from './composables/useToast';

const showLogin = ref(true);
const showIdentity = ref(false);
const showPermit = ref(false);
const showActivate = ref(false);
const showImportPermit = ref(false);
const showRoomList = ref(false);
const showCreateRoom = ref(false);
const showJoinRoom = ref(false);
const showRoomDetail = ref(false);
const currentRoomId = ref('');
const isLoading = ref(false);
const error = ref('');
const success = ref('');

const certificateId = ref('');
const activateToken = ref('');

const toast = useToast();

onMounted(() => {
  // Check if user is already authenticated
  if (store.isAuthenticated()) {
    // If user is authenticated, show room list directly
    // This ensures that after refresh, user stays in authenticated state
    if (!showRoomList.value && !showCreateRoom.value && !showJoinRoom.value && !showRoomDetail.value) {
      showRoomList.value = true;
    }
  } else {
    // If not authenticated, show login page
    showLogin.value = true;
  }

  // Check if this is an activation page
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  if (token) {
    activateToken.value = token;
    showActivate.value = true;
    showLogin.value = false;
  }
});

const switchToRegister = () => {
  showLogin.value = false;
};

const switchToLogin = () => {
  showLogin.value = true;
};

const handleActivationComplete = () => {
  toast.success('账户激活成功！');
  error.value = '';
  showActivate.value = false;
  showLogin.value = true;
};

const handleLoginSuccess = async (response: any) => {
  toast.success('登录成功！');
  error.value = '';

  // Check if next action is upload_identity (handle both response.nextAction and response.session.nextAction)
  const nextAction = response.nextAction || (response.session?.nextAction);

  // Additional check: if user has already uploaded identity and has certificate ID, go to room list
  const hasCertificateId = localStorage.getItem('pixlink_certificate_id');
  if (nextAction === 'upload_identity' && hasCertificateId) {
    // User has already uploaded identity, go directly to room list
    console.log('User has certificate ID, skipping identity upload');
    showRoomList.value = true;
  } else if (nextAction === 'upload_identity') {
    // User needs to upload identity
    showIdentity.value = true;
  } else {
    // Other next actions or no specific next action, go to room list
    showRoomList.value = true;
  }
};

const handleRegisterSuccess = async (response: any) => {
  toast.success('注册成功！');
  error.value = '';

  // Check if activation is required
  if (response.requiresActivation) {
    toast.info('请检查邮箱并点击激活链接激活账户。', 5000);
    // Switch back to login page after successful registration
    showLogin.value = true;
    return;
  }

  // Auto login after registration (for users without activation requirement)
  try {
    const loginResponse = await userService.login({
      email: response.user.email,
      password: '', // This would need to be handled differently in a real app
    });

    if (loginResponse.nextAction === 'upload_identity') {
      showIdentity.value = true;
    } else {
      showRoomList.value = true;
    }
  } catch (err: any) {
    error.value = '自动登录失败，请手动登录';
    showLogin.value = true;
  }
};

const handleUploadIdentity = async () => {
  isLoading.value = true;
  error.value = '';
  
  try {
    const user = store.getUser();
    if (!user) {
      throw new Error('用户信息不存在');
    }
    
    // Generate and upload identity
    const uploadResponse = await userService.generateAndUploadIdentity(user.id);
    
    certificateId.value = uploadResponse.certificateId;
    toast.success('Identity文件上传成功！');
    showIdentity.value = false;
    showPermit.value = true;
  } catch (err: any) {
    error.value = err.message || 'Identity文件上传失败';
  } finally {
    isLoading.value = false;
  }
};

const handleSendPermit = async () => {
  isLoading.value = true;
  error.value = '';
  
  try {
    await userService.sendPermit({ certificateId: certificateId.value });
    toast.success('Permit已发送到您的邮箱！');
    showPermit.value = false;
    showImportPermit.value = true;
    // Keep user logged in, don't reset to login page
  } catch (err: any) {
    error.value = err.message || 'Permit发送失败';
    // Keep user on permit page to try again
  } finally {
    isLoading.value = false;
  }
};

const handleImportPermitSuccess = () => {
  console.log('Import permit success, switching to room list');
  // 确保认证状态存在
  if (store.isAuthenticated()) {
    showImportPermit.value = false;
    showRoomList.value = true;
    toast.success('Permit导入成功！您的设备已连接到PixLink网络。');
  } else {
    console.error('Authentication lost after import permit');
    // 认证状态丢失时，保持在当前页面并显示错误
    error.value = '认证状态丢失，请重新登录';
  }
};

const handleResendPermit = async () => {
  isLoading.value = true;
  error.value = '';

  try {
    await userService.sendPermit({ certificateId: certificateId.value });
    toast.success('Permit已重新发送到您的邮箱！');
  } catch (err: any) {
    error.value = err.message || 'Permit重新发送失败';
  } finally {
    isLoading.value = false;
  }
};

const handleLogout = async () => {
  isLoading.value = true;
  error.value = '';

  try {
    await userService.logout();
    store.resetState();

    // 重置所有页面状态
    showRoomList.value = false;
    showCreateRoom.value = false;
    showJoinRoom.value = false;
    showRoomDetail.value = false;
    showIdentity.value = false;
    showPermit.value = false;
    showImportPermit.value = false;
    showActivate.value = false;

    // 显示登录页面
    showLogin.value = true;

    // 清除其他状态
    currentRoomId.value = '';
    certificateId.value = '';
    activateToken.value = '';
    toast.success('退出登录成功！');
  } catch (err: any) {
    error.value = err.message || '退出登录失败';
  } finally {
    isLoading.value = false;
  }
};

const validateZtmConnection = async () => {
  isLoading.value = true;
  error.value = '';

  try {
    const localAgentConnected = await ztmService.validateLocalAgentConnection();

    if (localAgentConnected) {
      toast.success('ZTM本地Agent连接正常！');
    } else {
      toast.error('ZTM本地Agent连接失败');
    }
  } catch (err: any) {
    error.value = err.message || 'ZTM连接验证失败';
  } finally {
    isLoading.value = false;
  }
};

// Room management functions
const handleCreateRoom = () => {
  showRoomList.value = false;
  showCreateRoom.value = true;
};

const handleJoinRoom = () => {
  showRoomList.value = false;
  showJoinRoom.value = true;
};

const handleViewRoom = (roomId: string) => {
  currentRoomId.value = roomId;
  showRoomList.value = false;
  showRoomDetail.value = true;
};

const handleCreateRoomSuccess = (room: any) => {
  toast.success('房间创建成功！');
  showCreateRoom.value = false;
  showRoomList.value = true;
  // 更新store中的房间列表
  store.setRooms([...store.getState().rooms, room]);
};

const handleJoinRoomSuccess = async () => {
  toast.success('加入房间成功！');
  showJoinRoom.value = false;
  showRoomList.value = true;
  // 重新加载房间列表，确保显示新加入的房间
  try {
    const rooms = await roomService.getRooms();
    store.setRooms(rooms);
  } catch (error) {
    console.error('Failed to reload rooms after join:', error);
  }
};

const handleLeaveRoom = async () => {
  toast.success('已离开房间！');
  showRoomDetail.value = false;
  showRoomList.value = true;
  // 重新加载房间列表，确保不显示已离开的房间
  try {
    const rooms = await roomService.getRooms();
    store.setRooms(rooms);
  } catch (error) {
    console.error('Failed to reload rooms after leave:', error);
  }
};

const handleCloseRoomDetail = () => {
  showRoomDetail.value = false;
  showRoomList.value = true;
};

const handleCancelRoomAction = () => {
  showCreateRoom.value = false;
  showJoinRoom.value = false;
  showRoomList.value = true;
};
</script>

<template>
  <div class="app min-h-screen bg-pixel-bg smooth-scroll">
    <!-- Toast Container -->
    <ToastContainer />

    <!-- Scroll To Top Button -->
    <ScrollToTop />

    <!-- Auth Pages -->
    <Transition name="fade" mode="out-in">
      <div v-if="!showIdentity && !showPermit && !showActivate && !showRoomList && !showCreateRoom && !showJoinRoom && !showRoomDetail" class="min-h-screen flex items-center justify-center p-4" key="auth">
        <Transition name="fade" mode="out-in">
          <Login
            v-if="showLogin"
            key="login"
            @login-success="handleLoginSuccess"
            @switch-register="switchToRegister"
          />
          <Register
            v-else
            key="register"
            @register-success="handleRegisterSuccess"
            @switch-login="switchToLogin"
          />
        </Transition>
      </div>
    </Transition>

    <!-- Activate Page -->
    <Transition name="fade" mode="out-in">
      <div v-if="showActivate" class="min-h-screen flex items-center justify-center p-4" key="activate">
        <Activate
          :token="activateToken"
          @activation-complete="handleActivationComplete"
        />
      </div>
    </Transition>

    <!-- Import Permit Page -->
    <Transition name="fade" mode="out-in">
      <div v-if="showImportPermit" class="min-h-screen flex items-center justify-center p-4" key="import-permit">
        <ImportPermit
          :certificate-id="certificateId"
          @import-success="handleImportPermitSuccess"
          @resend-permit="handleResendPermit"
          :key="'import-permit-' + (certificateId || 'default')"
        />
      </div>
    </Transition>

    <!-- Identity Upload Page -->
    <Transition name="fade" mode="out-in">
      <div v-if="showIdentity" class="min-h-screen flex items-center justify-center p-4" key="identity">
        <Card class="w-full max-w-md">
          <h1 class="text-3xl font-bold text-pixel-text mb-2">PixLink</h1>
          <h2 class="text-xl text-pixel-text-secondary mb-6">上传Identity文件</h2>

          <div v-if="error" class="bg-pixel-danger/20 border-2 border-pixel-danger text-pixel-danger px-4 py-3 rounded-none mb-4 font-mono text-sm">
            {{ error }}
          </div>

          <div v-if="success" class="bg-pixel-success/20 border-2 border-pixel-success text-pixel-success px-4 py-3 rounded-none mb-4 font-mono text-sm">
            {{ success }}
          </div>

          <div class="mb-6">
            <p class="text-pixel-text-secondary mb-2">请上传您的ZTM Identity文件，系统将为您创建对应的permit。</p>
            <p class="text-pixel-text-secondary">ZTM用户名将使用您的邮箱前缀：<strong class="text-pixel-text">{{ store.getUser()?.email?.split('@')[0] }}</strong></p>
          </div>

          <Button
            @click="handleUploadIdentity"
            :disabled="isLoading"
            :loading="isLoading"
            class="w-full"
          >
            {{ isLoading ? '上传中...' : '生成并上传Identity' }}
          </Button>
        </Card>
      </div>
    </Transition>

    <!-- Permit Send Page -->
    <Transition name="fade" mode="out-in">
      <div v-if="showPermit" class="min-h-screen flex items-center justify-center p-4" key="permit">
        <Card class="w-full max-w-md">
          <h1 class="text-3xl font-bold text-pixel-text mb-2">PixLink</h1>
          <h2 class="text-xl text-pixel-text-secondary mb-6">发送Permit到邮箱</h2>

          <div v-if="error" class="bg-pixel-danger/20 border-2 border-pixel-danger text-pixel-danger px-4 py-3 rounded-none mb-4 font-mono text-sm">
            {{ error }}
          </div>

          <div v-if="success" class="bg-pixel-success/20 border-2 border-pixel-success text-pixel-success px-4 py-3 rounded-none mb-4 font-mono text-sm">
            {{ success }}
          </div>

          <div class="mb-6">
            <p class="text-pixel-text-secondary mb-2">Permit将发送到您的邮箱：<strong class="text-pixel-text">{{ store.getUser()?.email }}</strong></p>
            <p class="text-pixel-text-secondary">请查收邮件并导入permit文件到您的ZTM Agent。</p>
          </div>

          <Button
            @click="handleSendPermit"
            :disabled="isLoading"
            :loading="isLoading"
            class="w-full mb-3"
          >
            {{ isLoading ? '发送中...' : '发送Permit' }}
          </Button>

          <Button
            v-if="success"
            variant="secondary"
            @click="showImportPermit = true; showPermit = false"
            class="w-full"
          >
            已收到邮件，去导入Permit
          </Button>
        </Card>
      </div>
    </Transition>

    <!-- Room List -->
    <Transition name="fade" mode="out-in">
      <div v-if="showRoomList" key="room-list">
        <AppHeader @logout="handleLogout" />

        <div class="container mx-auto px-4 py-8">
          <div v-if="error" class="bg-pixel-danger/20 border-2 border-pixel-danger text-pixel-danger px-4 py-3 rounded-none mb-4 font-mono text-sm">
            {{ error }}
          </div>

          <div v-if="success" class="bg-pixel-success/20 border-2 border-pixel-success text-pixel-success px-4 py-3 rounded-none mb-4 font-mono text-sm">
            {{ success }}
          </div>

          <RoomList
            @join-room="handleJoinRoom"
            @create-room="handleCreateRoom"
            @view-room="handleViewRoom"
          />
        </div>
      </div>
    </Transition>

    <!-- Create Room -->
    <Transition name="fade" mode="out-in">
      <div v-if="showCreateRoom" key="create-room">
        <AppHeader @logout="handleLogout" />

        <div class="container mx-auto px-4 py-8">
          <div class="flex items-center justify-between mb-6">
            <Button variant="secondary" @click="showCreateRoom = false; showRoomList = true">
              ← 返回房间列表
            </Button>
          </div>

          <CreateRoom
            @create-success="handleCreateRoomSuccess"
            @cancel="handleCancelRoomAction"
          />
        </div>
      </div>
    </Transition>

    <!-- Join Room -->
    <Transition name="fade" mode="out-in">
      <div v-if="showJoinRoom" key="join-room">
        <AppHeader @logout="handleLogout" />

        <div class="container mx-auto px-4 py-8">
          <div class="flex items-center justify-between mb-6">
            <Button variant="secondary" @click="showJoinRoom = false; showRoomList = true">
              ← 返回房间列表
            </Button>
          </div>

          <JoinRoom
            @join-success="handleJoinRoomSuccess"
            @cancel="handleCancelRoomAction"
          />
        </div>
      </div>
    </Transition>

    <!-- Room Detail -->
    <Transition name="fade" mode="out-in">
      <div v-if="showRoomDetail" key="room-detail">
        <AppHeader @logout="handleLogout" />

        <div class="container mx-auto px-4 py-8">
          <RoomDetail
            :room-id="currentRoomId"
            @leave-room="handleLeaveRoom"
            @close="handleCloseRoomDetail"
          />
        </div>
      </div>
    </Transition>
  </div>
</template>

<style>
/* 页面过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>