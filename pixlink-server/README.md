# PixLink Server

PixLink 游戏联机平台服务端，提供用户管理、设备管理、证书签发等核心功能。

## 功能特性

- 用户注册/登录/登出
- 设备管理（创建、查询、更新、撤销）
- 证书签发（基于CSR的mTLS证书）
- Enrollment Token机制（魔法链接和OTP）
- 会话管理（JWT token）
- 数据库持久化（MySQL + Prisma）

## 技术栈

- **运行时**: Node.js + TypeScript
- **Web框架**: Express.js
- **数据库**: MySQL + Prisma ORM
- **认证**: JWT
- **证书**: node-forge（X.509证书生成）
- **日志**: Winston

## 项目结构

```
pixlink-server/
├── src/
│   ├── config/           # 配置文件
│   │   ├── index.ts       # 主配置
│   │   └── database.ts    # 数据库配置
│   ├── controllers/       # 控制器
│   │   ├── authController.ts
│   │   ├── certificateController.ts
│   │   └── deviceController.ts
│   ├── middleware/        # 中间件
│   │   ├── auth.ts        # 认证中间件
│   │   └── errorHandler.ts
│   ├── routes/            # 路由
│   │   ├── authRoutes.ts
│   │   ├── certificateRoutes.ts
│   │   └── deviceRoutes.ts
│   ├── services/          # 业务逻辑
│   │   ├── userService.ts
│   │   ├── deviceService.ts
│   │   ├── certificateService.ts
│   │   └── enrollmentTokenService.ts
│   ├── types/             # 类型定义
│   │   └── index.ts
│   ├── utils/             # 工具函数
│   │   └── logger.ts
│   └── index.ts           # 应用入口
├── prisma/
│   └── schema.prisma      # 数据库模型
├── package.json
├── tsconfig.json
└── .env.example
```

## 快速开始

### 1. 安装依赖

```bash
cd pixlink-server
npm install
```

### 2. 配置环境变量

复制 `.env.example` 到 `.env` 并修改配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件，配置数据库连接、JWT密钥等。

### 3. 初始化数据库

```bash
# 生成 Prisma Client
npm run prisma:generate

# 运行数据库迁移
npm run prisma:migrate
```

### 4. 启动开发服务器

```bash
npm run dev
```

服务器将在 `http://localhost:3000` 启动。

## API 端点

### 认证相关 (`/api/auth`)

- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/logout` - 用户登出
- `POST /api/auth/magic-link` - 请求魔法链接
- `POST /api/auth/otp` - 请求一次性验证码
- `POST /api/auth/enroll/token` - 交换Enrollment Token
- `GET /api/auth/profile` - 获取用户信息
- `PUT /api/auth/profile` - 更新用户信息

### 证书相关 (`/api/certs`)

- `POST /api/certs/issue` - 签发证书
- `GET /api/certs/` - 获取证书列表
- `GET /api/certs/:certificateId/status` - 获取证书状态
- `DELETE /api/certs/:certificateId` - 撤销证书

### 设备相关 (`/api/devices`)

- `POST /api/devices/` - 创建设备
- `GET /api/devices/` - 获取设备列表
- `GET /api/devices/:deviceNonce` - 获取设备详情
- `PUT /api/devices/:deviceNonce` - 更新设备
- `DELETE /api/devices/:deviceId` - 撤销设备

## 安全设计

1. **私钥安全**: 私钥仅在客户端本地生成和存储，服务端从不接触私钥
2. **Enrollment Token**: 采用一次性Token（TTL短、单次使用、绑定deviceNonce）
3. **证书签发**: 仅通过受信TLS下发证书链（不含私钥）
4. **设备绑定**: 证书与设备绑定，支持设备撤销
5. **会话管理**: JWT token + 数据库会话记录

## 数据库模型

主要数据表：
- `User` - 用户信息
- `Device` - 设备信息
- `Certificate` - 证书信息
- `EnrollmentToken` - 注册令牌
- `Session` - 会话信息

## 开发命令

```bash
# 开发模式
npm run dev

# 构建生产版本
npm run build

# 启动生产服务器
npm start

# Prisma 相关
npm run prisma:generate
npm run prisma:migrate
npm run prisma:studio
```

## 注意事项

1. 生产环境请修改 `JWT_SECRET` 和数据库密码
2. 确保 MySQL 数据库已创建并配置正确
3. CA证书首次运行时会自动生成
4. 建议使用 HTTPS 部署生产环境

## 后续开发

- [ ] 房间管理功能
- [ ] 隧道管理功能
- [ ] 聊天功能
- [ ] 游戏共享功能
- [ ] WebSocket 实时通信
- [ ] 监控和日志分析