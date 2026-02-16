# PixLink Docker 部署指南

## 概述

本项目使用Docker Compose进行部署，包含以下服务：
- MySQL数据库服务
- PixLink服务端
- PixLink客户端

## 前置要求

- Docker 20.10+
- Docker Compose 2.0+

## 快速开始

### 1. 克隆项目

```bash
git clone <repository-url>
cd pixlink
```

### 2. 配置环境变量

在启动之前，请根据实际环境修改`docker-compose.yml`中的环境变量：

#### 服务端环境变量配置

```yaml
# ========== 服务器配置 ==========
PORT: 3000                              # 服务器端口
NODE_ENV: development                     # 运行环境

# ========== 数据库配置 ==========
DATABASE_URL: "mysql://root:password@mysql:3306/pixlink"  # 数据库连接地址

# ========== JWT配置 ==========
JWT_SECRET: your-super-secret-jwt-key-change-this-in-production  # JWT密钥（生产环境请修改）
JWT_EXPIRES_IN: 7d                       # JWT过期时间

# ========== CA证书配置 ==========
CA_CERT_PATH: ./certs/ca.crt             # CA证书路径
CA_KEY_PATH: ./certs/ca.key               # CA密钥路径
CERT_VALIDITY_DAYS: 90                    # 证书有效期天数

# ========== Token配置 ==========
ENROLLMENT_TOKEN_TTL: 300                # 注册令牌TTL秒数
ACTIVATION_TOKEN_TTL: 180                # 激活令牌TTL秒数（180 = 3分钟）

# ========== 邮件服务配置 ==========
SMTP_HOST: smtp.gmail.com                  # SMTP服务器地址
SMTP_PORT: 465                           # SMTP端口
SMTP_USER: your-email@gmail.com            # SMTP用户名
SMTP_PASS: your-email-password              # SMTP密码

# ========== 前端URL配置 ==========
FRONTEND_URL: http://localhost:5173        # 前端URL

# ========== ZTM配置 ==========
ZTM_HUB_ADDRESS: ztm-hub:8888            # ZTM hub地址（用于bootstrap）
ZTM_ROOT_AGENT_URL: http://host.docker.internal:7777  # ZTM root agent地址
ZTM_MESH_NAME: ztm-hub:8888             # ZTM mesh名称
```

#### 客户端环境变量配置

```yaml
# ========== Vite开发服务器配置 ==========
VITE_DEV_PORT: 5173                                    # 开发服务器端口
VITE_DEV_HOST: 0.0.0.0                                 # 开发服务器主机

# ========== ZTM Agent配置 ==========
VITE_ZTM_LOCAL_AGENT_URL: http://host.docker.internal:7778/   # 本地ZTM agent地址
VITE_ZTM_ROOT_AGENT_URL: http://host.docker.internal:7777/   # ZTM root agent地址
VITE_ZTM_MESH_NAME: ztm-hub:8888                        # ZTM mesh名称

# ========== 服务器API配置 ==========
VITE_API_BASE_URL: http://pixlink-server:3000            # 后端API地址
```

### 3. 启动服务

```bash
# 启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止所有服务
docker-compose down

# 停止并删除所有数据
docker-compose down -v
```

### 4. 访问服务

- **服务端API**: http://localhost:3000
- **客户端**: http://localhost:5173
- **MySQL**: localhost:3306

## 服务说明

### MySQL数据库服务

- **容器名**: pixlink-mysql
- **端口**: 3306
- **数据持久化**: mysql_data volume
- **健康检查**: 每10秒检查一次MySQL服务状态

### PixLink服务端

- **容器名**: pixlink-server
- **端口**: 3000
- **依赖**: mysql
- **挂载**: ./certs:/app/certs
- **启动命令**: npm run dev

### PixLink客户端

- **容器名**: pixlink-client
- **端口**: 5173
- **依赖**: pixlink-server
- **启动命令**: npm run dev

## 网络配置

所有服务都连接到`pixlink-network`网络，使用bridge驱动。

## 数据持久化

- **MySQL数据**: mysql_data volume
- **CA证书**: ./certs目录挂载到服务端容器

## 常见问题

### 1. 如何修改SMTP配置？

编辑`docker-compose.yml`中的SMTP相关环境变量：

```yaml
smtp:
  SMTP_HOST: smtp.gmail.com
  SMTP_PORT: 465
  SMTP_USER: your-email@gmail.com
  SMTP_PASS: your-email-password
```

### 2. 如何修改数据库密码？

编辑`docker-compose.yml`中的`MYSQL_ROOT_PASSWORD`和`DATABASE_URL`：

```yaml
mysql:
  MYSQL_ROOT_PASSWORD: your-password

pixlink-server:
  DATABASE_URL: "mysql://root:your-password@mysql:3306/pixlink"
```

### 3. 如何修改ZTM配置？

编辑`docker-compose.yml`中的ZTM相关环境变量：

```yaml
pixlink-server:
  ZTM_HUB_ADDRESS: ztm-hub:8888
  ZTM_ROOT_AGENT_URL: http://host.docker.internal:7777
  ZTM_MESH_NAME: ztm-hub:8888

pixlink-client:
  VITE_ZTM_LOCAL_AGENT_URL: http://host.docker.internal:7778/
  VITE_ZTM_ROOT_AGENT_URL: http://host.docker.internal:7777/
  VITE_ZTM_MESH_NAME: ztm-hub:8888
```

### 4. 如何查看服务日志？

```bash
# 查看所有服务日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f pixlink-server
docker-compose logs -f pixlink-client
docker-compose logs -f mysql
```

### 5. 如何重启服务？

```bash
# 重启所有服务
docker-compose restart

# 重启特定服务
docker-compose restart pixlink-server
docker-compose restart pixlink-client
docker-compose restart mysql
```

### 6. 如何清理数据？

```bash
# 停止并删除所有数据（包括数据库）
docker-compose down -v

# 删除所有容器和网络
docker-compose down

# 删除所有volume（谨慎使用）
docker volume rm pixlink_mysql_data
```

## 生产环境部署建议

### 1. 修改JWT密钥

```yaml
JWT_SECRET: <生成一个强随机字符串>
```

### 2. 修改SMTP配置

使用生产环境的SMTP服务器配置。

### 3. 修改数据库配置

使用生产环境的数据库服务器。

### 4. 修改ZTM配置

使用生产环境的ZTM服务器地址。

### 5. 修改NODE_ENV

```yaml
NODE_ENV: production
```

## 故障排除

### 服务无法启动

1. 检查端口是否被占用
2. 查看服务日志：`docker-compose logs pixlink-server`
3. 检查环境变量是否正确配置

### 数据库连接失败

1. 检查MySQL服务是否正常：`docker-compose logs mysql`
2. 检查数据库连接字符串是否正确
3. 检查网络连接：`docker network inspect pixlink-network`

### 客户端无法连接服务端

1. 检查服务端是否正常运行
2. 检查VITE_API_BASE_URL是否正确
3. 检查网络连接

## 许可证

本项目采用MIT许可证。
