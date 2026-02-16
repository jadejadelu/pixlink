// src/types/index.ts

// User types
export interface User {
  id: string;
  email: string;
  phone?: string;
  nickname: string;
  password?: string;
  avatar?: string;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
}

// Auth types
export interface RegisterRequest {
  email: string;
  phone?: string;
  nickname: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  deviceId?: string;
}

export interface LoginResponse {
  user: User;
  token: string;
  nextAction: string;
  uploadUrl: string;
}

export interface AuthResponse {
  user: User;
  session: {
    id: string;
    userId: string;
    token: string;
    deviceId?: string;
    ipAddress?: string;
    userAgent?: string;
    expiresAt: string;
    createdAt: string;
  };
}

// Identity types
export interface UploadIdentityRequest {
  userId: string;
  encryptedIdentity: string;
  encryptionNonce: string;
  identityChecksum: string;
  timestamp: string;
}

export interface UploadIdentityResponse {
  certificateId: string;
  nextAction: string;
  message: string;
  isJoinedMesh?: boolean;
}

export interface SendPermitRequest {
  certificateId: string;
}

export interface SendPermitResponse {
  message: string;
  email: string;
  nextAction: string;
  certificateId: string;
  deviceId: string;
}

export interface LeaveMeshRequest {
  certificateId: string;
}

export interface LeaveMeshResponse {
  message: string;
}

export interface UpdateDeviceSettingsRequest {
  certificateId: string;
  rememberDevice: boolean;
}

export interface UpdateDeviceSettingsResponse {
  message: string;
}

// Certificate types
export interface Certificate {
  id: string;
  userId: string;
  ztmUsername: string;
  status: CertificateStatus;
  certificateChain: string;
  fingerprint: string;
  notBefore: string;
  notAfter: string;
  createdAt: string;
  updatedAt: string;
  permitSent: boolean;
  permitSentAt?: string;
  permitEmail?: string;
}

export enum CertificateStatus {
  ACTIVE = 'ACTIVE',
  REVOKED = 'REVOKED',
  EXPIRED = 'EXPIRED',
  PENDING = 'PENDING',
}

// Device types
export interface Device {
  id: string;
  userId: string;
  os: string;
  arch: string;
  agentVersion: string;
  lastSeen: string;
  createdAt: string;
  updatedAt: string;
}

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  requiresActivation?: boolean;
  email?: string;
}

// ZTM types
export interface ZtmPermit {
  certificate: string;
  privateKey: string;
  certificateId: string;
}

// Room types
export interface Room {
  id: string;
  ownerId: string;
  name: string;
  visibility: RoomVisibility;
  createdAt: string;
  updatedAt: string;
  status: RoomStatus;
}

export enum RoomVisibility {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
}

export enum RoomStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  DELETED = 'DELETED',
}

export interface Membership {
  id: string;
  roomId: string;
  userId: string;
  role: MembershipRole;
  joinedAt: string;
  state: MembershipState;
}

export enum MembershipRole {
  OWNER = 'OWNER',
  MEMBER = 'MEMBER',
}

export enum MembershipState {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
  AWAY = 'AWAY',
}

// Tunnel types
export interface Tunnel {
  id: string;
  roomId: string;
  type: TunnelType;
  port: number;
  mode: TunnelMode;
  state: TunnelState;
  rttMs?: number;
  createdAt: string;
  updatedAt: string;
}

export enum TunnelType {
  UDP = 'UDP',
  TCP = 'TCP',
}

export enum TunnelMode {
  P2P = 'P2P',
  RELAY = 'RELAY',
}

export enum TunnelState {
  ACTIVE = 'ACTIVE',
  PENDING = 'PENDING',
  FAILED = 'FAILED',
  INACTIVE = 'INACTIVE',
}

// Game share types
export interface GameShare {
  id: string;
  roomId: string;
  title: string;
  proto: TunnelType;
  hostHint: string;
  port: number;
  templateKey: string;
  createdAt: string;
  updatedAt: string;
}

// Message types
export interface Message {
  id: string;
  roomId: string;
  userId: string;
  content: string;
  type: MessageType;
  createdAt: string;
}

export enum MessageType {
  TEXT = 'TEXT',
  SYSTEM = 'SYSTEM',
}

// ZTM agent types
export interface ZtmAgentStatus {
  connected: boolean;
  meshName: string;
  agentId: string;
  version: string;
  uptime: number;
  connections: number;
}

export interface ZtmAgentConfig {
  agentUrl: string;
  meshName: string;
  username: string;
  certificatePath: string;
  privateKeyPath: string;
}

// Error types
export class AppError extends Error {
  constructor(public message: string, public statusCode: number) {
    super(message);
    this.name = 'AppError';
  }
}