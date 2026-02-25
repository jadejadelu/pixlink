<template>
  <div class="share-menu">
    <button @click="showMenu = !showMenu" class="btn-share">
      分享
    </button>

    <div v-if="showMenu" class="menu-dropdown">
      <div class="menu-item" @click="copyShareCode">
        <span class="icon"></span>
        <div class="item-content">
          <span class="item-title">复制分享码</span>
          <span class="item-desc">推荐：一键复制，朋友粘贴即可加入</span>
        </div>
      </div>

      <div class="menu-item" @click="copyRoomInfo">
        <span class="icon info"></span>
        <div class="item-content">
          <span class="item-title">复制房间信息</span>
          <span class="item-desc">房间号 + 密码，适合口头分享</span>
        </div>
      </div>

      <div class="menu-item" @click="copyInviteLink">
        <span class="icon link"></span>
        <div class="item-content">
          <span class="item-title">复制邀请链接</span>
          <span class="item-desc">点击链接自动加入</span>
        </div>
      </div>

      <div class="menu-item" @click="showQRCode">
        <span class="icon qr"></span>
        <div class="item-content">
          <span class="item-title">生成二维码</span>
          <span class="item-desc">手机扫码快速加入</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{
  room: any;
}>();

const showMenu = ref(false);

async function copyShareCode() {
  const code = `ROOM:${props.room?.roomNumber}:${props.room?.password || ''}`;
  await navigator.clipboard.writeText(code);
  showMenu.value = false;
  alert('分享码已复制到剪贴板');
}

function copyRoomInfo() {
  const info = `房间号：${props.room?.roomNumber}${props.room?.password ? '\n密码：' + props.room?.password : ''}`;
  navigator.clipboard.writeText(info);
  showMenu.value = false;
  alert('房间信息已复制');
}

function copyInviteLink() {
  const link = `${window.location.origin}/join?room=${props.room?.roomNumber}`;
  navigator.clipboard.writeText(link);
  showMenu.value = false;
  alert('邀请链接已复制');
}

function showQRCode() {
  showMenu.value = false;
  alert('二维码功能开发中');
}
</script>

<style scoped>
.share-menu {
  position: relative;
}

.btn-share {
  padding: 8px 16px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
}

.menu-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 8px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  min-width: 280px;
  z-index: 100;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
  transition: background 0.2s;
}

.menu-item:hover {
  background: #f9fafb;
}

.menu-item:first-child {
  border-radius: 8px 8px 0 0;
}

.menu-item:last-child {
  border-radius: 0 0 8px 8px;
}

.icon {
  width: 40px;
  height: 40px;
  background: #667eea;
  border-radius: 8px;
  flex-shrink: 0;
}

.icon.info {
  background: #3b82f6;
}

.icon.link {
  background: #10b981;
}

.icon.qr {
  background: #f59e0b;
}

.item-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.item-title {
  font-weight: 500;
  color: #111827;
}

.item-desc {
  font-size: 12px;
  color: #6b7280;
}
</style>
