import * as http from 'http';

const certificateId = '01cc50e1-6992-4154-aed2-20a4c89c5242';
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJkOGY5M2E2Ny00OGUzLTRkZTUtYTljZC1iNDY3ZTI2MzkxYjciLCJpYXQiOjE3NzExNDc5ODEsImV4cCI6MTc3MTc1Mjc4MX0.-dHAMzQWqIveIKVNqPJa4-c6bHbsTPzBa8j2ncQLQYo';

const uploadData = {
  certificateId: certificateId
};

const postData = JSON.stringify(uploadData);

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/auth/send-permit',
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
