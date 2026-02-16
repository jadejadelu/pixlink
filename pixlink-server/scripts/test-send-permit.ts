import * as http from 'http';

const certificateId = 'f1a8bb9c-6f93-4e7d-99a1-580bdea9361e';
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIyM2VkZjY3YS04YTUxLTQ4NTYtOTc0ZC05MzAzMGI5ODdlOGYiLCJpYXQiOjE3NzExNDc2NTgsImV4cCI6MTc3MTc1MjQ1OH0.WRuB-lSbAfcWqTYIHltJ62-ZoVRy58zyETsEN-2_9Bg';

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
