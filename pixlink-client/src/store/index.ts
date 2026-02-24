// src/store/index.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { User, Certificate, Room, ZtmAgentStatus } from '../types';

export const useStore = defineStore('main', () => {
  // State (使用 ref 实现响应式)
  const user = ref<User | null>(null);
  const token = ref<string | null>(localStorage.getItem('auth_token'));
  const certificates = ref<Certificate[]>([]);
  const rooms = ref<Room[]>([]);
  const activeRoom = ref<Room | null>(null);
  const ztmStatus = ref<{
    rootAgent: ZtmAgentStatus | null;
    localAgent: ZtmAgentStatus | null;
  }>({
    rootAgent: null,
    localAgent: null,
  });
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  // Getters (使用 computed)
  const isAuthenticated = computed(() => !!token.value);

  // Actions
  function setUser(newUser: User | null) {
    user.value = newUser;
  }

  function setToken(newToken: string | null) {
    token.value = newToken;
    if (newToken) {
      localStorage.setItem('auth_token', newToken);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  function setCertificates(newCertificates: Certificate[]) {
    certificates.value = newCertificates;
  }

  function addCertificate(certificate: Certificate) {
    certificates.value.push(certificate);
  }

  function removeCertificate(certificateId: string) {
    certificates.value = certificates.value.filter(cert => cert.id !== certificateId);
  }

  function setRooms(newRooms: Room[]) {
    rooms.value = newRooms;
  }

  function addRoom(room: Room) {
    rooms.value.push(room);
  }

  function removeRoom(roomId: string) {
    rooms.value = rooms.value.filter(room => room.id !== roomId);
    if (activeRoom.value?.id === roomId) {
      activeRoom.value = null;
    }
  }

  function setActiveRoom(room: Room | null) {
    activeRoom.value = room;
  }

  function setRootAgentStatus(status: ZtmAgentStatus | null) {
    ztmStatus.value.rootAgent = status;
  }

  function setLocalAgentStatus(status: ZtmAgentStatus | null) {
    ztmStatus.value.localAgent = status;
  }

  function setLoading(loading: boolean) {
    isLoading.value = loading;
  }

  function setError(err: string | null) {
    error.value = err;
  }

  function clearError() {
    error.value = null;
  }

  function resetState() {
    user.value = null;
    token.value = null;
    certificates.value = [];
    rooms.value = [];
    activeRoom.value = null;
    ztmStatus.value = {
      rootAgent: null,
      localAgent: null,
    };
    isLoading.value = false;
    error.value = null;
    localStorage.removeItem('auth_token');
  }

  // 为了向后兼容，保留旧版 API
  function getState() {
    return {
      user: user.value,
      token: token.value,
      certificates: certificates.value,
      rooms: rooms.value,
      activeRoom: activeRoom.value,
      ztmStatus: ztmStatus.value,
      isLoading: isLoading.value,
      error: error.value,
    };
  }

  function getUser() {
    return user.value;
  }

  function getToken() {
    return token.value;
  }

  function getActiveRoom() {
    return activeRoom.value;
  }

  function getZtmStatus() {
    return ztmStatus.value;
  }

  return {
    // State
    user,
    token,
    certificates,
    rooms,
    activeRoom,
    ztmStatus,
    isLoading,
    error,
    // Getters
    isAuthenticated,
    // Actions
    setUser,
    setToken,
    setCertificates,
    addCertificate,
    removeCertificate,
    setRooms,
    addRoom,
    removeRoom,
    setActiveRoom,
    setRootAgentStatus,
    setLocalAgentStatus,
    setLoading,
    setError,
    clearError,
    resetState,
    // 向后兼容
    getState,
    getUser,
    getToken,
    getActiveRoom,
    getZtmStatus,
  };
});

// 为了向后兼容，保留旧的 store 导出方式
// 但建议逐步迁移到 useStore()
export const store = useStore();
export default store;
