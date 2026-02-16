import * as nodeForge from 'node-forge';
import * as http from 'http';

const userId = 'd8f93a67-48e3-4de5-a9cd-b467e26391b7';
const ztmUsername = `user_${userId}`;

const keys = nodeForge.pki.rsa.generateKeyPair(2048);
const publicKeyPem = nodeForge.pki.publicKeyToPem(keys.publicKey);
const privateKeyPem = nodeForge.pki.privateKeyToPem(keys.privateKey);

const identity = {
  userId: `user_${Date.now()}`,
  ztmUsername: ztmUsername,
  publicKey: publicKeyPem,
  privateKey: privateKeyPem,
  createdAt: new Date().toISOString(),
};

const encryptedIdentity = `encrypted_${JSON.stringify(identity)}`;
const encryptionNonce = `nonce_${Date.now()}`;
const identityChecksum = `checksum_${Date.now()}`;
const timestamp = new Date().toISOString();

const uploadData = {
  userId,
  encryptedIdentity,
  encryptionNonce,
  identityChecksum,
  timestamp
};

const postData = JSON.stringify(uploadData);

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/auth/upload-identity',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJkOGY5M2E2Ny00OGUzLTRkZTUtYTljZC1iNDY3ZTI2MzkxYjciLCJpYXQiOjE3NzExNDc5ODEsImV4cCI6MTc3MTc1Mjc4MX0.-dHAMzQWqIveIKVNqPJa4-c6bHbsTPzBa8j2ncQLQYo',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', data);
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.write(postData);
req.end();
