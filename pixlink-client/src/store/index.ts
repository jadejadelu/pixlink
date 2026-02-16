// src/store/index.ts

import type { User, Certificate, Room, ZtmAgentStatus } from '../types';

interface StoreState {
  user: User | null;
  token: string | null;
  certificates: Certificate[];
  rooms: Room[];
  activeRoom: Room | null;
  ztmStatus: {
    rootAgent: ZtmAgentStatus | null;
    localAgent: ZtmAgentStatus | null;
  };
  isLoading: boolean;
  error: string | null;
}

class Store {
  private state: StoreState;
  private listeners: Set<() => void>;

  constructor() {
    this.state = {
      user: null,
      token: localStorage.getItem('auth_token'),
      certificates: [],
      rooms: [],
      activeRoom: null,
      ztmStatus: {
        rootAgent: null,
        localAgent: null,
      },
      isLoading: false,
      error: null,
    };
    this.listeners = new Set();
  }

  // Get state
  getState(): StoreState {
    return { ...this.state };
  }

  // Update state
  setState(newState: Partial<StoreState>): void {
    this.state = { ...this.state, ...newState };
    this.notifyListeners();
  }

  // Set user
  setUser(user: User | null): void {
    this.setState({ user });
  }

  // Set token
  setToken(token: string | null): void {
    this.setState({ token });
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  // Set certificates
  setCertificates(certificates: Certificate[]): void {
    this.setState({ certificates });
  }

  // Add certificate
  addCertificate(certificate: Certificate): void {
    this.setState({
      certificates: [...this.state.certificates, certificate],
    });
  }

  // Remove certificate
  removeCertificate(certificateId: string): void {
    this.setState({
      certificates: this.state.certificates.filter(cert => cert.id !== certificateId),
    });
  }

  // Set rooms
  setRooms(rooms: Room[]): void {
    this.setState({ rooms });
  }

  // Add room
  addRoom(room: Room): void {
    this.setState({
      rooms: [...this.state.rooms, room],
    });
  }

  // Remove room
  removeRoom(roomId: string): void {
    this.setState({
      rooms: this.state.rooms.filter(room => room.id !== roomId),
    });
    if (this.state.activeRoom?.id === roomId) {
      this.setState({ activeRoom: null });
    }
  }

  // Set active room
  setActiveRoom(room: Room | null): void {
    this.setState({ activeRoom: room });
  }

  // Set ZTM root agent status
  setRootAgentStatus(status: ZtmAgentStatus | null): void {
    this.setState({
      ztmStatus: {
        ...this.state.ztmStatus,
        rootAgent: status,
      },
    });
  }

  // Set ZTM local agent status
  setLocalAgentStatus(status: ZtmAgentStatus | null): void {
    this.setState({
      ztmStatus: {
        ...this.state.ztmStatus,
        localAgent: status,
      },
    });
  }

  // Set loading
  setLoading(isLoading: boolean): void {
    this.setState({ isLoading });
  }

  // Set error
  setError(error: string | null): void {
    this.setState({ error });
  }

  // Clear error
  clearError(): void {
    this.setState({ error: null });
  }

  // Reset state
  resetState(): void {
    this.setState({
      user: null,
      token: null,
      certificates: [],
      rooms: [],
      activeRoom: null,
      ztmStatus: {
        rootAgent: null,
        localAgent: null,
      },
      isLoading: false,
      error: null,
    });
    localStorage.removeItem('auth_token');
  }

  // Subscribe to state changes
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Notify listeners
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }

  // Check if authenticated
  isAuthenticated(): boolean {
    return !!this.state.token;
  }

  // Get user
  getUser(): User | null {
    return this.state.user;
  }

  // Get token
  getToken(): string | null {
    return this.state.token;
  }

  // Get active room
  getActiveRoom(): Room | null {
    return this.state.activeRoom;
  }

  // Get ZTM status
  getZtmStatus(): StoreState['ztmStatus'] {
    return this.state.ztmStatus;
  }
}

export const store = new Store();
export default store;