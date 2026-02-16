import { Request } from 'express';

export interface User {
  id: string;
  email: string;
  phone: string | null;
  nickname: string;
  avatar: string | null;
  status: 'PENDING' | 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  createdAt: Date;
  updatedAt: Date;
}

export interface Device {
  id: string;
  userId: string;
  os: string;
  arch: string;
  agentVersion: string;
  deviceNonce: string;
  lastSeen: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Certificate {
  id: string;
  userId: string;
  deviceId: string;
  ztmUsername: string;
  status: 'ACTIVE' | 'REVOKED' | 'EXPIRED';
  fingerprint: string;
  notBefore: Date;
  notAfter: Date;
  certificateChain: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EnrollmentToken {
  id: string;
  userId: string;
  deviceNonce: string;
  token: string;
  type: 'MAGIC_LINK' | 'OTP';
  expiresAt: Date;
  used: boolean;
  usedAt?: Date;
  createdAt: Date;
}

export interface Session {
  id: string;
  userId: string;
  token: string;
  deviceId?: string;
  ipAddress?: string;
  userAgent?: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface RegisterRequest {
  email?: string;
  phone?: string;
  nickname: string;
  password?: string;
}

export interface LoginRequest {
  email?: string;
  phone?: string;
  password?: string;
  deviceId?: string;
}

export interface MagicLinkRequest {
  email?: string;
  phone?: string;
  deviceNonce: string;
}

export interface OTPRequest {
  email?: string;
  phone?: string;
  deviceNonce: string;
}

export interface OTPVerifyRequest {
  email?: string;
  phone?: string;
  code: string;
  deviceNonce: string;
}

export interface EnrollTokenRequest {
  enrollmentToken: string;
  deviceNonce: string;
}

export interface CertificateIssueRequest {
  csr: string;
  enrollmentToken: string;
}

export interface CertificateIssueResponse {
  certificateChain: string;
  fingerprint: string;
  notBefore: Date;
  notAfter: Date;
}

export interface DeviceInfo {
  os: string;
  arch: string;
  agentVersion: string;
}

export interface AuthResponse {
  user: User;
  session: Session | null;
  enrollmentToken?: string;
  requiresActivation?: boolean;
  debugActivationToken?: string;
}

export interface LoginResponse {
  user: User;
  token: string;
  nextAction: string;
  uploadUrl: string;
}

export interface UploadIdentityRequest {
  userId?: string;
  encryptedIdentity: string;
  encryptionNonce: string;
  identityChecksum: string;
  timestamp: string;
}

export interface UploadIdentityResponse {
  certificateId: string;
  encryptedCertificate?: string;
  encryptionNonce?: string;
  ztmConfig?: ZTMConfig;
  nextAction: string;
}

export interface ZTMConfig {
  hubEndpoint: string;
  hubId: string;
  username: string;
  certificateId: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface AuthRequest extends Request {
  userId?: string;
  deviceId?: string;
  deviceNonce?: string;
}