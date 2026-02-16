import * as nodeForge from 'node-forge';

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

console.log('Identity file generated:');
console.log('ZTM Username:', ztmUsername);
console.log('Public Key (first 100 chars):', publicKeyPem.substring(0, 100));
console.log('');
console.log('Upload data:');
console.log(JSON.stringify({
  userId,
  encryptedIdentity,
  encryptionNonce,
  identityChecksum,
  timestamp,
}, null, 2));
