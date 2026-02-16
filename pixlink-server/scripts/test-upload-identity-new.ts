import * as http from 'http';

const userId = 'd8f93a67-48e3-4de5-a9cd-b467e26391b7';
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJkOGY5M2E2Ny00OGUzLTRkZTUtYTljZC1iNDY3ZTI2MzkxYjciLCJpYXQiOjE3NzExNDc5ODEsImV4cCI6MTc3MTc1Mjc4MX0.-dHAMzQWqIveIKVNqPJa4-c6bHbsTPzBa8j2ncQLQYo';

const uploadData = {
  userId: userId,
  encryptedIdentity: 'encrypted_{\"userId\":\"user_1771147992557\",\"ztmUsername\":\"user_d8f93a67-48e3-4de5-a9cd-b467e26391b7\",\"publicKey\":\"-----BEGIN PUBLIC KEY-----\\r\\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAvD+fUTQH+Lw0c+8dW3Kr\\r\\nUwEJXOV5QQ8yEpmUdN/7cCHwK4qoPXef62fQ/6ycA5t0+Ku65/SBuAKvpfBKK0dw\\r\\nQzqs9AcWvydIN5FKbZXE4sLej8gMkT0nRfcFatrZpw3+7R6NZooV1MPvn2gnMWrc\\r\\nupkmwDzLk+mxP1OCkZLY0JYHmpuCOJftNtogAfrT4xJYqM1/LBOGy/GyvWXK2w7N\\r\\nSU6UjI6OprVJjujtdERyWIPW3fSOnAX+YRaLVIVpvNVfKn6e9fzd7/bQ54HnPpeq\\r\\nkW0pg0gt33kMtC6uvvaengl6C3xU5eF9F5PeOyBHRzbUnaPY6B0dATXe7Y3/RVBu\\r\\nxQIDAQAB\\r\\n-----END PUBLIC KEY-----\\r\\n\",\"privateKey\":\"-----BEGIN RSA PRIVATE KEY-----\\r\\nMIIEowIBAAKCAQEAvD+fUTQH+Lw0c+8dW3KrUwEJXOV5QQ8yEpmUdN/7cCHwK4qo\\r\\nPXef62fQ/6ycA5t0+Ku65/SBuAKvpfBKK0dwQzqs9AcWvydIN5FKbZXE4sLej8gM\\r\\nkT0nRfcFatrZpw3+7R6NZooV1MPvn2gnMWrcupkmwDzLk+mxP1OCkZLY0JYHmpuC\\r\\nOJftNtogAfrT4xJYqM1/LBOGy/GyvWXK2w7NSU6UjI6OprVJjujtdERyWIPW3fSO\\r\\nnAX+YRaLVIVpvNVfKn6e9fzd7/bQ54HnPpeqkW0pg0gt33kMtC6uvvaengl6C3xU\\r\\n5eF9F5PeOyBHRzbUnaPY6B0dATXe7Y3/RVBuxQIDAQABAoIBACOzGxcOu35Hzti3\\r\\nnYUkq2nr1ec4m3SjmZbeakF54piizwWq33n8sCa4AvIhvVqPxjCMfL8VZu5LEB1z\\r\\ngtVPUHJnc7o5h+5LWE41bvx2PSbV1thEk2GNy99gV7Yqd8FPDavRMfaitD4rxEsi\\r\\nOOCNx/tZJPiq7t6HoHYGc8oAo752iU48h6FqyPBMH42G27FPILosXbvnX91yGbNR\\r\\nRln5UaH3h8StbM1avMWOII8X8yA2mXF6t1CBfnWXi3VZ4YeP1KOROxyet4OlxF0K\\r\\nEQmoNbCH290Lx95fE12cjwO6nqBpoQ0embWH7akplRJbs/h5zaK4WtjxihAEF6Lk\\r\\n1k+fDxcCgYEA+q1cu3HZ+AOOwJYW0TgYSLNHEa/czJvbazVH71Se3jJ7TvfpBjht\\r\\ndylRXsmS2ALJciTZB1P5Kb5XX1W5UzqwhOO2k9kaRIzO4XfwQ0l+YytF232M1FP8\\r\\nPudJ+9/hx1U+0/+8wt8yID1h1TE8mT7d9LVTVInu6/n7T4B2/O7WZ98CgYEAwD7o\\r\\nnlgKcMPWnflT0jfmhkmP8h6K/2u6jeflod3hvBVETChJrWiNtSmaWzLVuhfmK791\\r\\na+xHzYm7CnwbfBPQiqhgZtvMsMyu4bYbipDlQyQArP2XvOfWx9VcUWWH6eTQl4JO\\r\\nZjOYgWa6t7WY8bP7sBQwJW0oSkUMx0mm4XRIzdsCgYBHsAhS+q4xBSNv4/xGfNpF\\r\\nADAU2Mw2H2RSdnxJ71M3jAxDexZC1yRG7aP9jXvXFoTxhaQjOlqJG4v1EZjcOm58\\r\\nsnpmMbIXZIVNaXVmaMAiMB/cMz1xA0uh2ZcI1u/Eh5ZeHkanHBlDqwotY9VGpfnn\\r\\nn2tjQ8b16Rl7lOtyTgM21QKBgGOadGVN0iL4pGJ2woIBKnPa+zSDtJp/k0lgo64I\\r\\nyqLrFdarbPjmWb1KD8o+fVOMfFmgOdMvuUf5mynkgUz46yxb7o58RQI5GkahVoWl\\r\\natMtfRgjz5E1QSeKGOmnRBLf1V8aSUpUYyhwND9oXBSmnrlszEEn3B8WxXcfZtIa\\r\\nsHnPAoGBAOjXAAtGS8N3PjLB+ZzMFdchosyHZq+Ds4GVqM2Gm24e/+Oax1EID3qt\\r\\n5sbwEu4g96145iIfvYk5VeZ4PsIQBI5+c/nfNBasBXzIwn2ZljrZvcs0Os87G2yC\\r\\ndA1BW1+WDOdJGubygB9liNdVjKljhsEBDHEBYvCn8Y4De/Ez9vFY\\r\\n-----END RSA PRIVATE KEY-----\\r\\n\",\"createdAt\":\"2026-02-15T09:33:12.557Z\"}',
  encryptionNonce: 'nonce_1771147992558',
  identityChecksum: 'checksum_1771147992558',
  timestamp: '2026-02-15T09:33:12.558Z'
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
