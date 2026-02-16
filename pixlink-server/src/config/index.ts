import dotenv from 'dotenv';

dotenv.config();

const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  debugMode: process.env.DEBUG_MODE === 'true',
  
  database: {
    url: process.env.DATABASE_URL || 'mysql://root:password@localhost:3306/pixlink',
  },
  
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  
  ca: {
    certPath: process.env.CA_CERT_PATH || './certs/ca.crt',
    keyPath: process.env.CA_KEY_PATH || './certs/ca.key',
    validityDays: parseInt(process.env.CERT_VALIDITY_DAYS || '90', 10),
  },
  
  enrollmentToken: {
    ttl: parseInt(process.env.ENROLLMENT_TOKEN_TTL || '300', 10),
  },

  activationToken: {
    ttl: parseInt(process.env.ACTIVATION_TOKEN_TTL || '180', 10),
  },

  smtp: {
    host: process.env.SMTP_HOST || 'smtp.example.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || 'your-email@example.com',
    pass: process.env.SMTP_PASS || 'your-email-password',
  },
  
  frontend: {
    url: process.env.FRONTEND_URL || 'http://localhost:5173',
  },
  
  ztm: {
    hubAddress: process.env.ZTM_HUB_ADDRESS || 'ztm-hub:8888',
    rootAgentUrl: process.env.ZTM_ROOT_AGENT_URL || 'http://localhost:7777',
    meshName: process.env.ZTM_MESH_NAME || 'ztm-hub:8888',
  },
};

export default config;