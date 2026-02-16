import * as http from 'http';

const userId = 'd8f93a67-48e3-4de5-a9cd-b467e26391b7';
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJkOGY5M2E2Ny00OGUzLTRkZTUtYTljZC1iNDY3ZTI2MzkxYjciLCJpYXQiOjE3NzExNDc5ODEsImV4cCI6MTc3MTc1Mjc4MX0.-dHAMzQWqIveIKVNqPJa4-c6bHbsTPzBa8j2ncQLQYo';

const uploadData = {
  userId: userId,
  encryptedIdentity: 'encrypted_test_duplicate',
  encryptionNonce: 'nonce_test',
  identityChecksum: 'checksum_test',
  timestamp: new Date().toISOString()
};

const postData = JSON.stringify(uploadData);

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/auth/upload-identity',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
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
