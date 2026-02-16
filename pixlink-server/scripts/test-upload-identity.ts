import * as https from 'https';
import * as http from 'http';

const userId = '23edf67a-8a51-4856-974d-93030b987e8f';
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIyM2VkZjY3YS04YTUxLTQ4NTYtOTc0ZC05MzAzMGI5ODdlOGYiLCJpYXQiOjE3NzExNDc2NTgsImV4cCI6MTc3MTc1MjQ1OH0.WRuB-lSbAfcWqTYIHltJ62-ZoVRy58zyETsEN-2_9Bg';

const uploadData = {
  userId: userId,
  encryptedIdentity: 'encrypted_{\"userId\":\"user_1771147670771\",\"ztmUsername\":\"user_23edf67a-8a51-4856-974d-93030b987e8f\",\"publicKey\":\"-----BEGIN PUBLIC KEY-----\\r\\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEArl9/CcDYMgXPtdMhMuLb\\r\\nBV6zVZUvenNLYsILHW68kQUIOEXboP2H69JC0tkTjvfLjDgnR+ukS/jmOMQHvJEO\\r\\nAjhuUyCR9jeU2/VzbaiK6lJXTPAI2tewrPol+hpzrMLs70TDbjI6rn8lRfkV22Qj\\r\\nSZDTA1nOSYFR+t+WcDv6tWLsb+ARJIi9O8RRmJisIL8ZjBTN4I4IZc3rom992bvq\\r\\ngYVU7xUfY8NgVGTUr8sxk7Bp9evEf4MGxTLRCcXjA6k8KivA+LA+PXTZaaRZIc4S\\r\\nD4RcT2yWLvrhnRjHJPKhJFPS6A1MtMPaLutSyAUV7LymuCgfuYPvRmC1vBCTTujC\\r\\nyQIDAQAB\\r\\n-----END PUBLIC KEY-----\\r\\n\",\"privateKey\":\"-----BEGIN RSA PRIVATE KEY-----\\r\\nMIIEogIBAAKCAQEArl9/CcDYMgXPtdMhMuLbBV6zVZUvenNLYsILHW68kQUIOEXb\\r\\noP2H69JC0tkTjvfLjDgnR+ukS/jmOMQHvJEOAjhuUyCR9jeU2/VzbaiK6lJXTPAI\\r\\n2tewrPol+hpzrMLs70TDbjI6rn8lRfkV22QjSZDTA1nOSYFR+t+WcDv6tWLsb+AR\\r\\nJIi9O8RRmJisIL8ZjBTN4I4IZc3rom992bvqgYVU7xUfY8NgVGTUr8sxk7Bp9evE\\r\\nf4MGxTLRCcXjA6k8KivA+LA+PXTZaaRZIc4SD4RcT2yWLvrhnRjHJPKhJFPS6A1M\\r\\ntMPaLutSyAUV7LymuCgfuYPvRmC1vBCTTujCyQIDAQABAoIBAA2nsc7wOJ32NuAH\\r\\nbW6gNZmejbmn1KTTWYsdefmvPc9iJFTPzQAMSp7CLknNBmCS8XAvcjgKG9Qij4N7\\r\\nf8WZsGNRIFFHLYGpXvFjWnYzFX8oZ+jBAAMvPTPWj68dxNg5wuHb3IKz0UTv9QRy\\r\\nme5pJvBFtJiVvvdM9sAIJAOcVtOUZEugm5cKAwwCnJWcrpVYLYLBeMzKBB97Gwec\\r\\nNZXEnpcMoTK3WHTRVrwJkeBoahNgjQEaYMG4goCA27EFfNou9dlFH2vbVhVxbr91\\r\\nXt8bCHfaEMv9HikYDj1v8R2F8hwzyfP2/XolPdOygWnzAZm+cJskJlR56L5U4YDx\\r\\naMmyMScCgYEA9YF3/IAPPLe0Yb0F3Ac+8OU+Qja/YBUT6CkcB2Kbfmc9zhmOgAgQ\\r\\nElMrhvYew+TSdCB8NuThUJCHE06jUoh4qPyNDHZy5UokCLotG2PFsx7oD/ht9+02\\r\\nqWlh/CyHiYvg0bvRXpj+dxRcPy6Wkzoj1xD5b4Fm0Wx5b5bvgBzg+ysCgYEAtdOi\\r\\nI9+6jS0k6mrz6f6+KQ3YGxFcrsZve1hPJ6dcMhckfT92r2DuemfMV4LwZq1Dt1D2\\r\\n+uGO4xLO7lz1S4DTz3cQQlCA1w2xoCXagWY+/uYb2rUGgjaEB8aY+k0jknZ6B7YT\\r\\neIf2GyccyMVl2obEBjgmbRSteq9qMjWk8RZ/L9sCgYAR91OMiuKSku8EaAzRuUYF\\r\\n4wDXX6JJqcE3MCr472Jpsax4NK6U+AIVFTkOO1ytAUXVcbslWUKT3r/DzfFtzMbn\\r\\ntvOrgc+OsApLCTTb2EVTgmOBJ7EEf7uMUkX1alzQ2Aev0YrU3WVh2X+WsBYc2Bhf\\r\\nWMKoQlP/52xLmkQUoAhm2QKBgCQLkFkMQS87g9X03eXFWm1JEU5MYtNDA1awawCx\\r\\nbNWBQPqTWjPqQ1yAt0Gh84ZnUsVEh7G0hV7+m4clZntRTqwSLmb3DpOTY2McHfUJ\\r\\nD/P4Kg1xVZj6tbHU7P6xzBt84TQmJDYAvgkj99DVURvBG5sgBn4ZW0q2+5Z4i/o/\\r\\nO3eBAoGAImf3Zkmebo8EDMuuQneZaLLF04uG3PlFNCagTkhqg7W0vI7AxewDWPVM\\r\\nJbRGQxlV0Nb0jfaAx2of+pTcBHYuJXlJHOqPvSdYl1HeGetMQkA2XSZS+qDtvLID\\r\\n5ooOLKTcyiMJn+LuNd8w+sUxoT400CdBzohR9OKtt+f2ZtUdG10=\\r\\n-----END RSA PRIVATE KEY-----\\r\\n\",\"createdAt\":\"2026-02-15T09:27:50.771Z\"}',
  encryptionNonce: 'nonce_1771147670771',
  identityChecksum: 'checksum_1771147670771',
  timestamp: '2026-02-15T09:27:50.771Z'
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
