import crypto from 'crypto';

export interface ShareCodeData {
  roomNumber: string;
  password?: string;
  expiresAt?: number;
}

const SECRET = process.env.SHARE_CODE_SECRET || 'default-secret-key';

export function generateShareCode(data: ShareCodeData): string {
  const payload = JSON.stringify(data);

  const cipher = crypto.createCipher('aes-256-cbc', SECRET);
  let encrypted = cipher.update(payload, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  return encrypted
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

export function parseShareCode(code: string): ShareCodeData | null {
  try {
    let base64 = code
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    while (base64.length % 4) {
      base64 += '=';
    }

    const decipher = crypto.createDecipher('aes-256-cbc', SECRET);
    let decrypted = decipher.update(base64, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    const data = JSON.parse(decrypted) as ShareCodeData;

    if (data.expiresAt && data.expiresAt < Date.now()) {
      throw new Error('分享码已过期');
    }

    return data;
  } catch (error) {
    return null;
  }
}
