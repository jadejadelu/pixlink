// src/utils/index.ts

// Generate random string
export function generateRandomString(length: number = 10): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

// Generate UUID
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Format date
export function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleString();
}

// Format time
export function formatTime(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleTimeString();
}

// Calculate time ago
export function timeAgo(date: string | Date): string {
  const now = new Date();
  const past = new Date(date);
  const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return `${diffInSeconds}秒前`;
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes}分钟前`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours}小时前`;
  } else if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days}天前`;
  } else {
    return formatDate(past);
  }
}

// Validate email
export function validateEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

// Validate password
export function validatePassword(password: string): boolean {
  return password.length >= 6;
}

// Hash password (for client-side validation only)
export function hashPassword(password: string): string {
  // In a real implementation, this would use a proper hashing algorithm
  // For now, we'll just return a placeholder
  return `hashed_${password}`;
}

// Generate device ID
export function generateDeviceId(): string {
  const deviceInfo = {
    platform: navigator.platform,
    userAgent: navigator.userAgent,
    language: navigator.language,
    hardwareConcurrency: navigator.hardwareConcurrency,
  };
  const deviceString = JSON.stringify(deviceInfo);
  let hash = 0;
  for (let i = 0; i < deviceString.length; i++) {
    const char = deviceString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `device_${Math.abs(hash)}`;
}

// Get device information
export function getDeviceInfo(): {
  os: string;
  arch: string;
  browser: string;
  deviceId: string;
} {
  const userAgent = navigator.userAgent;
  let os = 'Unknown';
  let arch = 'Unknown';
  let browser = 'Unknown';

  // Detect OS
  if (userAgent.includes('Windows')) {
    os = 'Windows';
  } else if (userAgent.includes('Macintosh')) {
    os = 'macOS';
  } else if (userAgent.includes('Linux')) {
    os = 'Linux';
  } else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
    os = 'iOS';
  } else if (userAgent.includes('Android')) {
    os = 'Android';
  }

  // Detect architecture
  if (userAgent.includes('x86_64') || userAgent.includes('Win64')) {
    arch = '64-bit';
  } else if (userAgent.includes('WOW64') || userAgent.includes('x86')) {
    arch = '32-bit';
  }

  // Detect browser
  if (userAgent.includes('Chrome')) {
    browser = 'Chrome';
  } else if (userAgent.includes('Firefox')) {
    browser = 'Firefox';
  } else if (userAgent.includes('Safari')) {
    browser = 'Safari';
  } else if (userAgent.includes('Edge')) {
    browser = 'Edge';
  }

  return {
    os,
    arch,
    browser,
    deviceId: generateDeviceId(),
  };
}

// Sleep function
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Debounce function
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Throttle function
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Deep clone object
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

// Merge objects
export function mergeObjects<T extends object, U extends object>(
  target: T,
  source: U
): T & U {
  return { ...target, ...source };
}

// Check if object is empty
export function isEmptyObject(obj: object): boolean {
  return Object.keys(obj).length === 0;
}

// Get error message
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  } else if (typeof error === 'string') {
    return error;
  } else {
    return 'An unknown error occurred';
  }
}

// Log error
export function logError(error: unknown, context?: string): void {
  const errorMessage = getErrorMessage(error);
  console.error(`${context ? `${context}: ` : ''}${errorMessage}`, error);
}

// Log info
export function logInfo(message: string, data?: any): void {
  console.info(message, data);
}

// Log debug
export function logDebug(message: string, data?: any): void {
  if (import.meta.env.DEV) {
    console.debug(message, data);
  }
}

// Local storage utilities
export const storage = {
  set: <T>(key: string, value: T): void => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Error setting localStorage:', error);
    }
  },
  get: <T>(key: string): T | null => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error('Error getting localStorage:', error);
      return null;
    }
  },
  remove: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing localStorage:', error);
    }
  },
  clear: (): void => {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }
  },
};