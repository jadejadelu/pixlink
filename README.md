# PixLink

基于ZTM（Zero Trust Mesh）的开源游戏联机平台。

## 项目简介

PixLink 是一个基于 ZTM（Zero Trust Mesh）开源技术构建的游戏联机平台，旨在为玩家提供简单、安全、低延迟的跨局域网联机体验。它将传统复杂的网络配置简化为"创建房间 → 加入房间 → 一键联机"的简单流程。

## 技术栈

### 前端
- **框架**: Vue 3 + TypeScript
- **构建工具**: Vite
- **桌面应用**: Tauri
- **状态管理**: Pinia
- **UI组件**: 自定义组件

### 后端
- **运行时**: Node.js + TypeScript
- **框架**: Express.js
- **数据库**: MySQL + Prisma ORM
- **认证**: JWT + bcrypt
- **邮件服务**: Nodemailer

### 基础设施
- **容器化**: Docker + Docker Compose
- **网络**: ZTM (Zero Trust Mesh)
- **反向代理**: Nginx (生产环境)

## 核心功能

### ✅ 已完成功能

1. **用户系统**
   - 用户注册（邮箱验证）
   - 用户登录（密码登录）
   - 账户激活
   - 密码重置

2. **设备管理**
   - 设备注册
   - 设备绑定
   - 多设备支持

3. **证书管理**
   - ZTM证书签发
   - 证书导入
   - 证书验证

4. **邮件服务**
   - 账户激活邮件
   - Permit发送邮件
   - 密码重置邮件

5. **开发工具**
   - Debug模式（跳过邮件验证）
   - 完整的日志系统
   - Docker快速验证命令

### 🚧 待开发功能

1. **房间管理**
   - 创建房间
   - 加入房间
   - 房间列表
   - 房间设置

2. **隧道管理**
   - TCP隧道创建
   - UDP隧道创建
   - 隧道列表
   - 隧道管理

3. **游戏集成**
   - 游戏发现
   - 游戏启动
   - 游戏状态同步

4. **用户界面**
   - 主界面优化
   - 设置界面
   - 帮助文档

## 快速开始

### 前置要求

- Node.js 18+
- Docker & Docker Compose
- ZTM CLI工具
- MySQL 8.0+

### 本地开发

1. **克隆仓库**
   ```bash
   git clone https://github.com/jadejadelu/pixlink.git
   cd pixlink
   ```

2. **启动服务**
   ```bash
   docker-compose -f docker-compose-local.yml up -d
   ```

3. **访问应用**
   - 前端: http://localhost:5173
   - 后端API: http://localhost:3000
   - 健康检查: http://localhost:3000/health

### Docker快速验证

```bash
# 清理数据库
docker exec pixlink-mysql mysql -uroot -ppassword pixlink -e "DELETE FROM User; DELETE FROM Device; DELETE FROM Certificate; DELETE FROM AccountActivation; DELETE FROM Session;"

# 重启服务
docker-compose -f docker-compose-local.yml up -d --build pixlink-server

# 查看日志
docker-compose -f docker-compose-local.yml logs -f pixlink-server

# 检查ZTM状态
curl -s http://localhost:7777/api/meshes | jq '.'
```

## 项目结构

```
pixlink/
├── pixlink-client/          # Vue 3前端项目
│   ├── src/
│   │   ├── components/     # Vue组件
│   │   ├── services/       # API服务
│   │   ├── stores/         # Pinia状态管理
│   │   └── utils/          # 工具函数
│   ├── package.json
│   └── vite.config.ts
├── pixlink-server/         # Node.js后端项目
│   ├── src/
│   │   ├── controllers/    # 控制器
│   │   ├── services/       # 业务逻辑
│   │   ├── routes/         # 路由定义
│   │   ├── middleware/     # 中间件
│   │   ├── config/         # 配置文件
│   │   └── utils/          # 工具函数
│   ├── prisma/             # 数据库迁移
│   ├── scripts/            # 测试脚本
│   └── package.json
├── docs/                  # 项目文档
│   ├── PixLink_产品调研与架构设计.md
│   ├── PixLink_评估报告.md
│   ├── ZTM_接口与CLI指南.md
│   ├── 会话摘要.md
│   └── DOCKER_DEPLOYMENT.md
├── docker-compose.yml      # 生产环境配置
├── docker-compose-local.yml # 开发环境配置
└── README.md
```

## 环境变量配置

### 后端环境变量 (.env)

```env
# 服务器配置
PORT=3000
NODE_ENV=development
DEBUG_MODE=true

# 数据库配置
DATABASE_URL=mysql://root:password@localhost:3306/pixlink

# JWT配置
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# SMTP配置
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-email-password

# ZTM配置
ZTM_HUB_ADDRESS=ztm-hub:8888
ZTM_ROOT_AGENT_URL=http://localhost:7777
ZTM_MESH_NAME=ztm-hub:8888

# 前端URL
FRONTEND_URL=http://localhost:5173
```

### 前端环境变量 (.env)

```env
# Vite开发服务器
VITE_DEV_PORT=5173
VITE_DEV_HOST=0.0.0.0

# ZTM Agent配置
VITE_ZTM_LOCAL_AGENT_URL=http://127.0.0.1:7778/
VITE_ZTM_MESH_NAME=ztm-hub:8888

# 服务器API配置
VITE_API_BASE_URL=http://localhost:3000
```

## API文档

### 认证接口

- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/activate` - 账户激活
- `POST /api/auth/logout` - 用户登出

### 设备接口

- `POST /api/devices/upload-identity` - 上传设备身份
- `GET /api/devices` - 获取设备列表
- `DELETE /api/devices/:id` - 删除设备

### 证书接口

- `POST /api/certificates/generate-permit` - 生成ZTM Permit
- `GET /api/certificates` - 获取证书列表
- `DELETE /api/certificates/:id` - 删除证书

## 开发指南

### 添加新功能

1. 在后端创建对应的Controller和Service
2. 在前端创建对应的组件和API服务
3. 更新路由配置
4. 编写测试用例
5. 更新文档

### 调试技巧

- 使用Debug模式跳过邮件验证
- 查看Docker日志：`docker-compose -f docker-compose-local.yml logs -f pixlink-server`
- 使用浏览器开发者工具查看网络请求
- 检查ZTM Agent状态：`curl -s http://localhost:7777/api/meshes`

## 测试

### 端到端测试

```bash
# 清理数据库
docker exec pixlink-mysql mysql -uroot -ppassword pixlink -e "DELETE FROM User; DELETE FROM Device; DELETE FROM Certificate; DELETE FROM AccountActivation; DELETE FROM Session;"

# 测试完整流程
# 1. 注册用户
# 2. 激活账户
# 3. 登录
# 4. 上传Identity
# 5. 生成Permit
# 6. 导入Permit
# 7. 加入Mesh
```

## 部署

### 生产环境部署

1. **配置环境变量**
   - 修改`.env`文件，设置生产环境配置
   - 确保使用强密码和安全密钥

2. **构建Docker镜像**
   ```bash
   docker-compose build
   ```

3. **启动服务**
   ```bash
   docker-compose up -d
   ```

4. **配置Nginx反向代理**
   - 配置SSL证书
   - 设置反向代理规则

## 贡献指南

欢迎贡献代码、报告问题或提出建议！

1. Fork本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启Pull Request

## 许可证

本项目采用MIT许可证 - 详见LICENSE文件

## 联系方式

- 项目主页: https://github.com/jadejadelu/pixlink
- 问题反馈: https://github.com/jadejadelu/pixlink/issues

## 致谢

- ZTM (Zero Trust Mesh) - 核心网络技术
- Vue.js - 前端框架
- Express.js - 后端框架
- Prisma - 数据库ORM
- Docker - 容器化技术

## 更新日志

### v1.0.0 (2026-02-16)

- ✅ 完成用户注册和认证系统
- ✅ 实现ZTM证书签发和管理
- ✅ 添加邮件服务功能
- ✅ 完成设备管理功能
- ✅ 实现Debug模式
- ✅ Docker容器化部署
- ✅ 完整的端到端测试
- ✅ 完善的文档和开发工具

---

**PixLink** - 让游戏联机更简单！
