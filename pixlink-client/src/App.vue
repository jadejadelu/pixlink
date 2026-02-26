<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import Login from './components/Login.vue';
import Register from './components/Register.vue';
import Activate from './components/Activate.vue';
import ImportPermit from './components/ImportPermit.vue';
import RoomList from './components/RoomList.vue';
import CreateRoom from './components/CreateRoom.vue';
import JoinRoom from './components/JoinRoom.vue';
import RoomDetail from './components/RoomDetail.vue';
import { store } from './store';
import { userService } from './services/userService';
import { ztmService } from './services/ztmService';
import { roomService } from './services/roomService';

const showLogin = ref(true);
const showIdentity = ref(false);
const showPermit = ref(false);
const showDashboard = ref(false);
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

onMounted(() => {
  // Check if user is already authenticated
  if (store.isAuthenticated()) {
    // If user is authenticated, show dashboard by default
    // This ensures that after refresh, user stays in authenticated state
    if (!showDashboard.value && !showRoomList.value && !showCreateRoom.value && !showJoinRoom.value && !showRoomDetail.value) {
      showDashboard.value = true;
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
  success.value = '账户激活成功！';
  error.value = '';
  showActivate.value = false;
  showLogin.value = true;
};

const handleLoginSuccess = async (response: any) => {
  success.value = '登录成功！';
  error.value = '';
  
  // Check if next action is upload_identity (handle both response.nextAction and response.session.nextAction)
  const nextAction = response.nextAction || (response.session?.nextAction);
  
  // Additional check: if user has already uploaded identity and has certificate ID, go to dashboard
  const hasCertificateId = localStorage.getItem('pixlink_certificate_id');
  if (nextAction === 'upload_identity' && hasCertificateId) {
    // User has already uploaded identity, go directly to dashboard
    console.log('User has certificate ID, skipping identity upload');
    showDashboard.value = true;
  } else if (nextAction === 'upload_identity') {
    // User needs to upload identity
    showIdentity.value = true;
  } else {
    // Other next actions or no specific next action, go to dashboard
    showDashboard.value = true;
  }
};

const handleRegisterSuccess = async (response: any) => {
  success.value = '注册成功！';
  error.value = '';
  
  // Check if activation is required
  if (response.requiresActivation) {
    success.value = '注册成功！请检查邮箱并点击激活链接激活账户。';
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
      showDashboard.value = true;
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
    const uploadResponse = await userService.generateAndUploadIdentity(user.id, user.email);
    
    certificateId.value = uploadResponse.certificateId;
    success.value = 'Identity文件上传成功！';
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
    const response = await userService.sendPermit({ certificateId: certificateId.value });
    success.value = 'Permit已发送到您的邮箱！';
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
  console.log('Import permit success, switching to dashboard');
  // 确保认证状态存在
  if (store.isAuthenticated()) {
    showImportPermit.value = false;
    showDashboard.value = true;
    success.value = 'Permit导入成功！您的设备已连接到PixLink网络。';
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
    const response = await userService.sendPermit({ certificateId: certificateId.value });
    success.value = 'Permit已重新发送到您的邮箱！';
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
    showDashboard.value = false;
    showLogin.value = true;
    success.value = '退出登录成功！';
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
      success.value = 'ZTM本地Agent连接正常！';
    } else {
      error.value = 'ZTM本地Agent连接失败';
    }
  } catch (err: any) {
    error.value = err.message || 'ZTM连接验证失败';
  } finally {
    isLoading.value = false;
  }
};

// Room management functions
const handleShowRoomList = () => {
  showDashboard.value = false;
  showRoomList.value = true;
};

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
  success.value = '房间创建成功！';
  showCreateRoom.value = false;
  showRoomList.value = true;
  // 更新store中的房间列表
  store.setRooms([...store.getState().rooms, room]);
};

const handleJoinRoomSuccess = async (membership: any) => {
  success.value = '加入房间成功！';
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

const handleLeaveRoom = async (roomId: string) => {
  success.value = '已离开房间！';
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
  <div class="app">
    <!-- Auth Pages -->
    <div v-if="!showDashboard && !showIdentity && !showPermit && !showActivate && !showRoomList && !showCreateRoom && !showJoinRoom && !showRoomDetail">
      <Login
        v-if="showLogin"
        @login-success="handleLoginSuccess"
        @switch-register="switchToRegister"
      />
      <Register
        v-else
        @register-success="handleRegisterSuccess"
        @switch-login="switchToLogin"
      />
    </div>
    
    <!-- Activate Page -->
    <Activate
      v-else-if="showActivate"
      :token="activateToken"
      @activation-complete="handleActivationComplete"
    />
    
    <!-- Import Permit Page -->
    <ImportPermit
      v-else-if="showImportPermit"
      :certificate-id="certificateId"
      @import-success="handleImportPermitSuccess"
      @resend-permit="handleResendPermit"
      :key="`import-permit-${certificateId || 'default'}`"
    />
    
    <!-- Identity Upload Page -->
    <div v-else-if="showIdentity" class="identity-container">
      <div class="identity-form">
        <h1>PixLink</h1>
        <h2>上传Identity文件</h2>
        
        <div v-if="error" class="error-message">
          {{ error }}
        </div>
        
        <div v-if="success" class="success-message">
          {{ success }}
        </div>
        
        <div class="form-group">
          <p>请上传您的ZTM Identity文件，系统将为您创建对应的permit。</p>
          <p>ZTM用户名将使用您的邮箱前缀：<strong>{{ store.getUser()?.email?.split('@')[0] }}</strong></p>
        </div>
        
        <button 
          class="btn-primary" 
          @click="handleUploadIdentity"
          :disabled="isLoading"
        >
          {{ isLoading ? '上传中...' : '生成并上传Identity' }}
        </button>
      </div>
    </div>
    
    <!-- Permit Send Page -->
    <div v-else-if="showPermit" class="permit-container">
      <div class="permit-form">
        <h1>PixLink</h1>
        <h2>发送Permit到邮箱</h2>
        
        <div v-if="error" class="error-message">
          {{ error }}
        </div>
        
        <div v-if="success" class="success-message">
          {{ success }}
        </div>
        
        <div class="form-group">
          <p>Permit将发送到您的邮箱：<strong>{{ store.getUser()?.email }}</strong></p>
          <p>请查收邮件并导入permit文件到您的ZTM Agent。</p>
        </div>
        
        <button 
          class="btn-primary" 
          @click="handleSendPermit"
          :disabled="isLoading"
        >
          {{ isLoading ? '发送中...' : '发送Permit' }}
        </button>
        
        <button 
          class="btn-secondary" 
          @click="showImportPermit = true; showPermit = false"
          v-if="success"
        >
          已收到邮件，去导入Permit
        </button>
      </div>
    </div>
    
    <!-- Dashboard -->
    <div v-else-if="showDashboard" class="dashboard-container">
      <div class="dashboard-header">
        <h1>PixLink Dashboard</h1>
        <button class="btn-secondary" @click="handleLogout">退出登录</button>
      </div>
      
      <div class="dashboard-content">
        <div v-if="error" class="error-message">
          {{ error }}
        </div>
        
        <div v-if="success" class="success-message">
          {{ success }}
        </div>
        
        <div class="user-info">
          <h2>用户信息</h2>
          <p><strong>邮箱：</strong>{{ store.getUser()?.email }}</p>
          <p><strong>昵称：</strong>{{ store.getUser()?.nickname }}</p>
          <p><strong>状态：</strong>{{ store.getUser()?.status }}</p>
        </div>
        
        <div class="ztm-status">
          <h2>ZTM状态</h2>
          <button class="btn-secondary" @click="validateZtmConnection">验证ZTM连接</button>
          <div v-if="store.getZtmStatus().rootAgent">
            <p><strong>Root Agent：</strong>{{ store.getZtmStatus().rootAgent?.connected ? '在线' : '离线' }}</p>
            <p><strong>Local Agent：</strong>{{ store.getZtmStatus().localAgent?.connected ? '在线' : '离线' }}</p>
          </div>
        </div>
        
        <div class="certificates">
          <h2>证书管理</h2>
          <p>证书数量：{{ store.getState().certificates.length }}</p>
          <button class="btn-secondary" @click="showIdentity = true">生成新证书</button>
        </div>
        
        <div class="rooms">
          <h2>房间管理</h2>
          <p>房间数量：{{ store.getState().rooms.length }}</p>
          <button class="btn-primary" @click="handleShowRoomList">查看房间</button>
        </div>
      </div>
    </div>
    
    <!-- Room List -->
    <div v-else-if="showRoomList" class="dashboard-container">
      <div class="dashboard-header">
        <h1>PixLink Dashboard</h1>
        <div>
          <button class="btn-secondary" @click="showRoomList = false; showDashboard = true">返回仪表板</button>
          <button class="btn-secondary" @click="handleLogout">退出登录</button>
        </div>
      </div>
      
      <div class="dashboard-content">
        <div v-if="error" class="error-message">
          {{ error }}
        </div>
        
        <div v-if="success" class="success-message">
          {{ success }}
        </div>
        
        <RoomList 
          @join-room="handleJoinRoom"
          @create-room="handleCreateRoom"
          @view-room="handleViewRoom"
        />
      </div>
    </div>
    
    <!-- Create Room -->
    <div v-else-if="showCreateRoom" class="dashboard-container">
      <div class="dashboard-header">
        <h1>PixLink Dashboard</h1>
        <button class="btn-secondary" @click="showCreateRoom = false; showRoomList = true">返回房间列表</button>
      </div>
      
      <div class="dashboard-content">
        <CreateRoom 
          @create-success="handleCreateRoomSuccess"
          @cancel="handleCancelRoomAction"
        />
      </div>
    </div>
    
    <!-- Join Room -->
    <div v-else-if="showJoinRoom" class="dashboard-container">
      <div class="dashboard-header">
        <h1>PixLink Dashboard</h1>
        <button class="btn-secondary" @click="showJoinRoom = false; showRoomList = true">返回房间列表</button>
      </div>
      
      <div class="dashboard-content">
        <JoinRoom 
          @join-success="handleJoinRoomSuccess"
          @cancel="handleCancelRoomAction"
        />
      </div>
    </div>
    
    <!-- Room Detail -->
    <div v-else-if="showRoomDetail" class="dashboard-container">
      <div class="dashboard-header">
        <h1>PixLink Dashboard</h1>
      </div>
      
      <div class="dashboard-content">
        <RoomDetail 
          :room-id="currentRoomId"
          @leave-room="handleLeaveRoom"
          @close="handleCloseRoomDetail"
        />
      </div>
    </div>
  </div>
</template>

<style>
/* Global Styles */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background-color: #f5f5f5;
  color: #333;
}

.app {
  min-height: 100vh;
}

/* Form Styles */
.identity-container,
.permit-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.identity-form,
.permit-form {
  background: white;
  border-radius: 10px;
  padding: 40px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 500px;
}

/* Dashboard Styles */
.dashboard-container {
  min-height: 100vh;
  background-color: #f5f5f5;
}

.dashboard-header {
  background: white;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.dashboard-header h1 {
  font-size: 1.5rem;
  color: #333;
}

.dashboard-content {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.user-info,
.ztm-status,
.certificates,
.rooms {
  background: white;
  border-radius: 10px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.user-info h2,
.ztm-status h2,
.certificates h2,
.rooms h2 {
  font-size: 1.2rem;
  margin-bottom: 15px;
  color: #333;
}

.user-info p,
.ztm-status p,
.certificates p,
.rooms p {
  margin-bottom: 10px;
  color: #666;
}

/* Button Styles */
.btn-secondary {
  padding: 8px 16px;
  background: #f5f5f5;
  color: #333;
  border: 1px solid #ddd;
  border-radius: 5px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-secondary:hover {
  background: #e0e0e0;
}

/* Message Styles */
.success-message {
  background: #e8f5e8;
  color: #2e7d32;
  padding: 10px;
  border-radius: 5px;
  margin-bottom: 20px;
  font-size: 0.9rem;
}

.error-message {
  background: #ffebee;
  color: #c62828;
  padding: 10px;
  border-radius: 5px;
  margin-bottom: 20px;
  font-size: 0.9rem;
}
</style>