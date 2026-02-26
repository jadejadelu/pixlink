# ZTM (零信任网格) 隧道管理 API 文档

版本：1.0.0-rc2

## 项目概述

ZTM (Zero Trust Mesh，零信任网格) 是一个开源的网络基础设施软件，旨在构建一个以隐私优先的、去中心化的、端到端加密的软件定义网络。它基于 HTTP/2 隧道技术，可在任何类型的 IP 网络上运行，例如局域网、容器化网络和互联网等，实现无边界的连接和全球网格化。

### 主要特性：
- **快速**：使用 HTTP/2 多路复用和 Pipy（C++ 快速可编程代理）
- **安全**：所有流量通过 TLS 加密，并使用基于证书的身份验证
- **可定制**：通过 PipyJS 脚本高度可编程
- **便携**：支持多种 CPU 架构（x86、ARM、MIPS、RISC-V、LoongArch）和操作系统（Linux、Windows、macOS、FreeBSD、Android）

### 核心组件：
- **Hub**：中央协调器（通常部署在云服务器上）
- **Agent**：加入网格的终端客户端，提供隧道等功能
- **Apps**：内置模块（tunnel、proxy、terminal、cloud、script 等）

## 隧道管理架构

ZTM 通过其 "apps" 架构实现隧道管理。隧道作为 `ztm/tunnel` 应用程序进行管理，遵循通用模式：`ztm/tunnel/{协议}/{名称}`。

## 隧道管理 API 接口

根据文档和代码分析，以下是隧道管理的 API 接口：

### 1. 创建隧道 (POST)

#### 出站隧道创建：
```
POST /api/apps
```
**请求体：**
```json
{
  "name": "ztm/tunnel/{协议}/{隧道名称}",
  "config": {
    "protocol": "{协议}",
    "targets": ["{目标主机}:{目标端口}"],
    "mesh": "{网格名称}"
  }
}
```

**示例：**
```json
{
  "name": "ztm/tunnel/tcp/我的游戏服务器",
  "config": {
    "protocol": "tcp",
    "targets": ["192.168.1.100:8080"],
    "mesh": "mesh"
  }
}
```

#### 入站隧道创建：
```
POST /api/apps
```
**请求体：**
```json
{
  "name": "ztm/tunnel/{协议}/{隧道名称}",
  "config": {
    "protocol": "{协议}",
    "listen": {监听端口},
    "mesh": "{网格名称}"
  }
}
```

**示例：**
```json
{
  "name": "ztm/tunnel/tcp/我的游戏服务器",
  "config": {
    "protocol": "tcp",
    "listen": 8080,
    "mesh": "mesh"
  }
}
```

### 2. 删除隧道 (DELETE)

```
DELETE /api/apps/ztm/tunnel/{协议}/{隧道名称}
```

**示例：**
```
DELETE /api/apps/ztm/tunnel/tcp/我的游戏服务器
```

### 3. 获取隧道列表 (GET)

```
GET /api/apps
```

这将返回所有正在运行的应用程序列表，包括隧道。您可以筛选符合 `ztm/tunnel/*` 模式的隧道应用程序。

### 4. 获取特定隧道信息 (GET)

```
GET /api/apps/ztm/tunnel/{协议}/{隧道名称}
```

**示例：**
```
GET /api/apps/ztm/tunnel/tcp/我的游戏服务器
```

## 隧道类型和方向

ZTM 区分两种类型的隧道：

1. **出站 (Outbound)**：隧道的"出口"侧，位于服务附近，指向目标服务
2. **入站 (Inbound)**：隧道的"入口"侧，在访问侧本地监听

可以将其想象成一根水管，其中：
- **出站** = 水流出去（靠近服务/主机端）
- **入站** = 水流进来（靠近访问者端）

## 配置参数

### 出站隧道参数：
- `protocol`: tcp 或 udp
- `targets`: 目标地址数组，格式为 `{主机}:{端口}`
- `mesh`: 网格网络名称

### 入站隧道参数：
- `protocol`: tcp 或 udp
- `listen`: 本地监听端口
- `mesh`: 网格网络名称

## 安全与认证

所有隧道通信都通过以下方式保障安全：
- 所有流量使用 TLS 加密
- 基于证书的身份验证和访问控制
- 通过证书进行身份验证

## 总结

ZTM 隧道管理系统围绕其 Apps 架构构建，其中隧道作为特殊应用程序进行管理，遵循命名约定 `ztm/tunnel/{协议}/{名称}`。REST API 通过 `/api/apps` 端点提供对创建、删除和管理隧道的编程访问，而 CLI 提供便捷的手动管理命令行操作。

该系统支持 TCP 和 UDP 协议，并使用 HTTP/2 隧道处理跨越防火墙和 NAT 边界的复杂网络连接细节。