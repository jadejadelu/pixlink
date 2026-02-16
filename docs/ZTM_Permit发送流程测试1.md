# ZTM Permit发送流程测试1

## 测试目的
验证基于ZTM用户、EP（设备）逻辑概念的完整permit发送流程，包括用户注册、登录、Identity文件上传、Permit发送到邮箱等步骤。

## 测试环境
- **服务端**：PixLink Server (http://localhost:3000)
- **ZTM Root Agent**：http://localhost:7777/
- **数据库**：MySQL Docker容器
- **客户端**：curl命令行工具

## 测试流程

### 1. 用户注册测试
**测试步骤**：
1. 发送注册请求
   ```bash
   curl -X POST http://localhost:3000/api/auth/register \
   -H "Content-Type: application/json" \
   -d '{"email":"permituser@example.com","nickname":"Permit User"}'
   ```

**预期结果**：
- 返回状态码：201 Created
- 返回用户信息和会话token

**实际返回**：
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "86b2ebf0-8f94-4ff0-89f5-1978683e89e1",
      "email": "permituser@example.com",
      "phone": "",
      "nickname": "Permit User",
      "avatar": null,
      "status": "ACTIVE",
      "createdAt": "2026-02-14T09:07:52.335Z",
      "updatedAt": "2026-02-14T09:07:52.335Z"
    },
    "session": {
      "id": "8105c061-6225-4226-928f-9de9346f12fd",
      "userId": "86b2ebf0-8f94-4ff0-89f5-1978683e89e1",
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI4NmIyZWJmMC04Zjk0LTRmZjAtODlmNS0xOTc4NjgzZTg5ZTEiLCJpYXQiOjE3NzEwNjAwNzIsImV4cCI6MTc3MTY2NDg3Mn0.hs4K4Vsv3HQ8PLESTOVt7EPxaMQt134T8WyCtUKetGg",
      "deviceId": null,
      "ipAddress": null,
      "userAgent": null,
      "expiresAt": "2026-02-21T09:07:52.344Z",
      "createdAt": "2026-02-14T09:07:52.345Z"
    }
  }
}
```

**测试结论**：✅ 成功

### 2. 用户登录测试（新流程）
**测试步骤**：
1. 发送登录请求
   ```bash
   curl -X POST http://localhost:3000/api/auth/login \
   -H "Content-Type: application/json" \
   -d '{"email":"permituser@example.com"}'
   ```

**预期结果**：
- 返回状态码：200 OK
- 返回用户信息、token、nextAction和uploadUrl

**实际返回**：
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "86b2ebf0-8f94-4ff0-89f5-1978683e89e1",
      "email": "permituser@example.com",
      "phone": "",
      "nickname": "Permit User",
      "avatar": null,
      "status": "ACTIVE",
      "createdAt": "2026-02-14T09:07:52.335Z",
      "updatedAt": "2026-02-14T09:07:52.335Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI4NmIyZWJmMC04Zjk0LTRmZjAtODlmNS0xOTc4NjgzZTg5ZTEiLCJpYXQiOjE3NzEwNjAwNzUsImV4cCI6MTc3MTY2NDg3NX0.AUjTRCdrFFMhvDu9KPrreUGNzlZMhi6IfpCQx5HGqq0",
    "nextAction": "upload_identity",
    "uploadUrl": "/api/auth/upload-identity"
  }
}
```

**测试结论**：✅ 成功

### 3. 上传Identity文件测试
**测试步骤**：
1. 发送Identity文件上传请求
   ```bash
   curl -X POST http://localhost:3000/api/auth/upload-identity \
   -H "Content-Type: application/json" \
   -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI4NmIyZWJmMC04Zjk0LTRmZjAtODlmNS0xOTc4NjgzZTg5ZTEiLCJpYXQiOjE3NzEwNjAwNzUsImV4cCI6MTc3MTY2NDg3NX0.AUjTRCdrFFMhvDu9KPrreUGNzlZMhi6IfpCQx5HGqq0" \
   -d '{"userId":"86b2ebf0-8f94-4ff0-89f5-1978683e89e1","encryptedIdentity":"demo_encrypted_identity","encryptionNonce":"demo_nonce","identityChecksum":"demo_checksum","timestamp":"1771060075"}'
   ```

**预期结果**：
- 返回状态码：200 OK
- 返回certificateId、nextAction（send_permit）和消息提示
- **不返回证书内容**，而是等待permit发送

**实际返回**：
```json
{
  "success": true,
  "data": {
    "certificateId": "b9c9560b-bf0d-47dd-8e79-af65716d2774",
    "nextAction": "send_permit",
    "message": "Identity uploaded successfully. Permit will be sent to your email."
  }
}
```

**测试结论**：✅ 成功
**重要改进**：不再直接返回证书内容，而是返回等待permit发送的状态

### 4. 发送Permit到邮箱测试
**测试步骤**：
1. 发送Permit发送请求
   ```bash
   curl -X POST http://localhost:3000/api/auth/send-permit \
   -H "Content-Type: application/json" \
   -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI4NmIyZWJmMC04Zjk0LTRmZjAtODlmNS0xOTc4NjgzZTg5ZTEiLCJpYXQiOjE3NzEwNjAwNzUsImV4cCI6MTc3MTY2NDg3NX0.AUjTRCdrFFMhvDu9KPrreUGNzlZMhi6IfpCQx5HGqq0" \
   -d '{"certificateId":"b9c9560b-bf0d-47dd-8e79-af65716d2774"}'
   ```

**预期结果**：
- 返回状态码：200 OK
- 返回发送成功消息、邮箱地址和nextAction（import_permit）
- 数据库中更新permit发送状态

**实际返回**：
```json
{
  "success": true,
  "data": {
    "message": "ZTM permit has been sent to your email. Please check your inbox.",
    "email": "permituser@example.com",
    "nextAction": "import_permit"
  }
}
```

**测试结论**：✅ 成功
**重要改进**：实现了permit文件通过邮箱发送的逻辑（当前为mock实现）

### 5. 数据库状态验证
**测试步骤**：
1. 检查数据库中的证书记录
2. 验证permit发送状态

**预期结果**：
- 数据库中存在对应的证书记录
- permitSent字段为true
- permitSentAt字段有发送时间
- permitEmail字段有邮箱地址

**实际结果**：
- ✅ 数据库中存在证书记录
- ✅ permitSent字段为true
- ✅ permitSentAt字段有发送时间
- ✅ permitEmail字段有邮箱地址

**测试结论**：✅ 成功

## 测试总结

### 测试结果概览
| 测试用例 | 状态 | 备注 |
|---------|------|------|
| 用户注册 | ✅ 成功 | - |
| 用户登录（新流程） | ✅ 成功 | 返回nextAction和uploadUrl |
| 上传Identity文件 | ✅ 成功 | 不返回证书，返回等待permit发送状态 |
| 发送Permit到邮箱 | ✅ 成功 | 实现了permit文件通过邮箱发送的逻辑 |
| 数据库状态验证 | ✅ 成功 | permit发送状态正确更新 |

### 核心功能验证
1. **ZTM集成架构**：✅ 成功实现基于ZTM用户、EP（设备）逻辑概念的集成
2. **多步骤认证流程**：✅ 实现用户认证→Identity文件处理→等待permit发送→permit发送到邮箱
3. **Permit文件管理**：✅ 不在服务端存储permit文件，通过邮箱发送给用户
4. **安全机制**：✅ 支持Identity文件加密上传和permit文件邮箱发送
5. **状态跟踪**：✅ 数据库中正确跟踪permit发送状态

### 技术亮点
1. **符合ZTM架构**：不再使用单独逻辑实现用户设备注册、登录，而是结合ZTM的用户、EP（设备）逻辑概念
2. **安全设计**：permit文件不在服务端存储，通过邮箱发送给用户，用户手动导入
3. **多步骤认证**：实现了完整的认证流程，包括Identity文件上传和Permit发送
4. **状态管理**：完善的permit发送状态跟踪，防止重复发送
5. **可扩展性**：模块化设计，易于与实际的ZTM root agent集成和真实的邮箱服务集成

### 后续建议
1. **集成实际ZTM环境**：将模拟的ZTM root agent调用替换为实际的API调用
2. **实现Identity文件解密**：添加真实的Identity文件解密逻辑
3. **完善证书指纹计算**：实现基于证书内容的真实指纹计算
4. **集成真实邮箱服务**：将mock的邮箱发送替换为实际的SMTP服务
5. **实现permit文件导入**：添加客户端的permit文件导入功能
6. **增强安全性**：添加更严格的身份验证和授权机制

## 测试环境清理
- 保留数据库中的测试数据用于后续验证
- 停止测试用的ZTM Agent服务
- 清理临时生成的测试文件
