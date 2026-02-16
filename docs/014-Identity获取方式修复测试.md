# 014-Identity获取方式修复测试

## 测试时间
2026-02-15 22:00

## 测试目的
修复客户端Identity获取方式，从自己生成RSA密钥对改为从本地ZTM agent获取identity。

## 问题分析

### 原问题
客户端代码错误地自己生成RSA密钥对，而不是从本地ZTM agent获取identity文件。

### 正确流程
根据`用户注册、登陆、等流程设计.md`文档，正确的流程应该是：

1. **客户端从本地ZTM agent获取identity**
   - API: `GET http://localhost:7778/api/identity`
   - 返回: 纯文本格式的PEM公钥

2. **客户端上传identity到pix-server**
   - API: `POST /api/v1/auth/upload-identity`
   - Body: 加密的identity内容

3. **pix-server调用ZTM root agent创建permit**
   - API: `POST /api/meshes/{meshName}/permits/{username}`
   - Body: identity（PEM格式的公钥）
   - Content-Type: `text/plain`

## 代码修改

### 1. 客户端ZTM服务修改

**文件：** `/Users/jade/pixlink/pixlink-client/src/services/ztmService.ts`

**修改前：**
```typescript
// Generate identity file
generateIdentityFile(username: string): ZtmIdentity {
  const keys = nodeForge.pki.rsa.generateKeyPair(2048);
  const publicKeyPem = nodeForge.pki.publicKeyToPem(keys.publicKey);
  const privateKeyPem = nodeForge.pki.privateKeyToPem(keys.privateKey);
  
  return {
    userId: `user_${Date.now()}`,
    ztmUsername: username,
    publicKey: publicKeyPem,
    privateKey: privateKeyPem,
    createdAt: new Date().toISOString(),
  };
}
```

**修改后：**
```typescript
// Get identity from local ZTM agent
async getIdentityFromLocalAgent(): Promise<string> {
  try {
    console.log('Getting identity from local ZTM agent');
    
    const response = await fetch(`${this.localAgentUrl}api/identity`);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get identity from local agent: ${response.status} ${errorText}`);
    }
    
    const identity = await response.text();
    console.log('Identity retrieved successfully from local agent');
    
    return identity;
  } catch (error: any) {
    console.error('Get identity from local agent error:', error);
    throw new Error(`Failed to get identity from local agent: ${error.message}`);
  }
}
```

### 2. 客户端用户服务修改

**文件：** `/Users/jade/pixlink/pixlink-client/src/services/userService.ts`

**修改前：**
```typescript
// Generate identity file
const identity = ztmService.generateIdentityFile(ztmUsername);
```

**修改后：**
```typescript
// Get identity from local ZTM agent
const identity = await ztmService.getIdentityFromLocalAgent();
```

### 3. 客户端类型定义修改

**文件：** `/Users/jade/pixlink/pixlink-client/src/types/index.ts`

**修改前：**
```typescript
export interface ZtmIdentity {
  userId: string;
  ztmUsername: string;
  publicKey: string;
  privateKey?: string;
  createdAt: string;
}
```

**修改后：**
```typescript
// ZtmIdentity interface removed - no longer needed
```

### 4. 服务端认证控制器修改

**文件：** `/Users/jade/pixlink/pixlink-server/src/controllers/authController.ts`

**修改前：**
```typescript
// Step 5: Extract public key from encrypted identity
let publicKey: string;
try {
  const decryptedIdentity = JSON.parse(data.encryptedIdentity.replace('encrypted_', ''));
  publicKey = decryptedIdentity.publicKey;
  
  if (!publicKey) {
    throw new Error('Public key not found in identity file');
  }
  
  logger.info(`Extracted public key from identity for device: ${ztmUsername}`);
} catch (error: any) {
  logger.error('Failed to extract public key from identity:', error);
  throw new Error('Invalid identity file: unable to extract public key');
}
```

**修改后：**
```typescript
// Step 5: Extract public key from encrypted identity
let publicKey: string;
try {
  const decryptedIdentity = data.encryptedIdentity.replace('encrypted_', '');
  
  // Check if identity is a valid PEM format public key
  if (decryptedIdentity.includes('-----BEGIN PUBLIC KEY-----') && 
      decryptedIdentity.includes('-----END PUBLIC KEY-----')) {
    publicKey = decryptedIdentity;
  } else {
    throw new Error('Invalid identity format: not a valid PEM public key');
  }
  
  if (!publicKey) {
    throw new Error('Public key not found in identity file');
  }
  
  logger.info(`Extracted public key from identity for device: ${ztmUsername}`);
} catch (error: any) {
  logger.error('Failed to extract public key from identity:', error);
  throw new Error('Invalid identity file: unable to extract public key');
}
```

## 手动测试

### 测试步骤

#### 1. 从本地ZTM agent获取identity
```bash
curl -X GET http://localhost:7778/api/identity
```

**预期响应：**
```
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAsLbzLK/QhTazr7NSbwyy
7NVDXZ+QosOvbxUJ6FdM0yWuyGRkEF8JulhC2UXBwLtp9Uj9Qx9hmTAQ35BLzsLf
+8CwT2oyrfVIF/CeWYPVd6PibTwYANt/SFV5E9BLVWdDPAmLkcqDzQdVByFOFk6k
/fSjxvNtbUHVfn2Kce9XHQu+FKRt1ibZBge8+MZcpH2PEdtRdtR5pLUiWeyACNy7
ZvPsGlH6t7ALo1fb+7dLtM3YzJ7soMS9Xnm9CTFpswF4jPLhV6AYYxl0cQj40gd9
loGSJGPBrBmPIRejSreB8j4d1Z1VKTucmwEZ7ENNfhPG+5uQY+m9yAsXwS0iMjY4
sQIDAQAB
-----END PUBLIC KEY-----
```

**实际结果：** ✅ 成功获取identity

#### 2. 使用identity创建permit
```bash
# 保存identity到文件
curl -X GET http://localhost:7778/api/identity > identity_public_key.pem

# 使用identity创建permit
curl -X POST "http://localhost:7777/api/meshes/ztm-hub:8888/permits/device_test_001" \
  -H "Content-Type: text/plain" \
  --data-binary @identity_public_key.pem \
  -v
```

**预期响应：**
```json
{
  "agent": {
    "id": "c4fd5d12-a5ad-480c-be5b-9c481a6a086f",
    "name": "agent",
    "username": "device_test_001",
    "certificate": "-----BEGIN CERTIFICATE-----\n..."
  }
}
```

**实际结果：** ✅ 成功创建permit

## 测试结论

### 修复内容
1. ✅ 客户端从本地ZTM agent获取identity（不再自己生成）
2. ✅ 客户端identity验证逻辑更新（验证PEM格式）
3. ✅ 客户端identity加密逻辑更新（处理纯文本）
4. ✅ 服务端identity解析逻辑更新（处理PEM格式）
5. ✅ 移除不再需要的ZtmIdentity接口

### 测试结果
- ✅ 手动测试成功：从本地ZTM agent获取identity
- ✅ 手动测试成功：使用identity创建permit
- ⏳ 完整端到端测试待进行

### 下一步行动
1. 重启客户端和服务端
2. 进行完整的端到端测试
3. 验证permit生成和导入流程
4. 更新测试文档

## 备注
- Identity获取方式已修复，现在从本地ZTM agent获取
- 服务端代码已更新，支持PEM格式的identity
- 手动测试验证了修复的正确性
- 需要进行完整的端到端测试以验证整个流程
