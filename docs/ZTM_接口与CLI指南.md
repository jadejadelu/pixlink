# ZTM 接口与 CLI 指南（面向 PixLink 场景）

版本：v1.0  
日期：2026-02-14  
来源参考：flomesh-io/ztm 官方 README 与 ZT-App 文档

---

## 1. 角色与术语
- Hub：公开可访问的中转/控制节点（默认 8888），负责协调与中转。
- Agent：运行在终端设备上的客户端，加入 Mesh 后提供隧道、代理等能力。
- Mesh：由若干 Agent 组成的虚拟网络。
- App：ZTM 内置能力模块（tunnel、proxy、terminal、cloud、script 等）。

---

## 2. 快速命令清单
- 查看帮助：`ztm help`，某 App：`ztm APP_NAME help`（如 `ztm tunnel help`）
- 启动 Hub：`ztm start hub --listen 0.0.0.0:8888 --names <PUBLIC_IP:8888> --permit root.json`
- 启动 Agent：`ztm start agent`（Windows 无法作为服务时用 `ztm run agent`）
- 加入 Mesh：`ztm join <MESH_NAME> --as <EP_NAME> --permit root.json`
- 查看 Mesh：`ztm get mesh`；查看端点：`ztm get ep`
- 打开隧道（入站/出站）：`ztm tunnel open inbound|outbound tcp|udp/<name> ...`
- 关闭隧道：`ztm tunnel close inbound|outbound tcp|udp/<name>`
- 查看隧道：`ztm tunnel get inbound` / `ztm tunnel get outbound`
- 代理配置：`ztm proxy config --set-listen ... --add-target ...`
- 远程终端：`ztm terminal config --add-user <user>`，`ztm terminal open <endpoint>`
- 本地 GUI/API：启动 Agent 后访问 `http://localhost:7777`

---

## 3. Hub 部署（云端）
在具备公网 IP 的服务器上：

```bash
ztm start hub --listen 0.0.0.0:8888 --names <PUBLIC_IP:8888> --permit root.json
```

- `--listen`：Hub 监听地址与端口（对外服务）
- `--names`：Hub 对外可达名或 IP:端口（供 Agent 识别）
- `--permit root.json`：生成/使用加入 Mesh 所需的许可文件

说明：首次启动会生成 `root.json`，后续分发给需要加入 Mesh 的 Agent（建议通过安全通道分发）。

---

## 4. Agent 加入 Mesh（终端）
在终端设备上：

```bash
ztm start agent
ztm join <MESH_NAME> --as <EP_NAME> --permit root.json
```

- `<MESH_NAME>`：本地标识 Mesh 的名字（可自定）
- `<EP_NAME>`：当前端点在 Mesh 中显示的名称

验证：

```bash
ztm get mesh
ztm get ep
```

可视化：浏览器打开 `http://localhost:7777` 使用本地 GUI。

---

## 5. Mesh 基础管理
- 列出已安装 App：`ztm get app`
- 查看端点：`ztm get ep`
- 查看 Mesh：`ztm get mesh`

---

## 6. PixLink 场景：游戏隧道（zt-tunnel）
ZTM 支持 TCP 与 UDP 隧道，分为出站（outbound）与入站（inbound）两个对象：
- outbound：隧道出口（靠近服务的一端，指向目标服务）
- inbound：隧道入口（靠近访问者的一端，本地监听端口）

### 6.1 TCP 示例（网页或游戏服务）
在“游戏主机”所在的 Agent 上（服务在本地 198.19.249.3:8080/8081）：

```bash
ztm tunnel open outbound tcp/greeting \
  --targets 198.19.249.3:8080 \
  --targets 198.19.249.3:8081
```

在“访问者”所在的 Agent 上（本地监听 18080）：

```bash
ztm tunnel open inbound tcp/greeting --listen 18080
```

本地访问测试：

```bash
curl localhost:18080
```

### 6.2 UDP 示例（典型联机游戏端口）
在“游戏主机”所在的 Agent 上（假设游戏监听 0.0.0.0:2456）：

```bash
ztm tunnel open outbound udp/game-room --targets 0.0.0.0:2456
```

在“访问者”所在的 Agent 上（将远端 UDP 映射到本地 2456）：

```bash
ztm tunnel open inbound udp/game-room --listen 2456
```

游戏内或客户端配置指向 `127.0.0.1:2456` 即可完成连接。

### 6.3 查询与关闭
```bash
ztm tunnel get outbound
ztm tunnel get inbound
ztm tunnel describe outbound udp/game-room
ztm tunnel close inbound udp/game-room
ztm tunnel close outbound udp/game-room
```

---

## 7. SOCKS/HTTP 代理（可选，zt-proxy）
场景：通过一个 Agent 的监听端口，将请求转发到另一个 Agent 所在网络。

在“转发侧”Agent 上允许的目标（例：全部）：

```bash
ztm proxy config --add-target 0.0.0.0/0 '*'
```

在“监听侧”Agent 上开启代理端口：

```bash
ztm proxy config --set-listen 0.0.0.0:1080
```

测试：

```bash
curl --proxy http://localhost:1080 <目标地址:端口>
```

---

## 8. 远程终端（可选，zt-terminal）
授权用户白名单（在被控端）：

```bash
ztm terminal config --add-user <user>
```

在控制端打开远程终端：

```bash
ztm terminal open <endpoint-name>
```

---

## 9. 本地 GUI 与 Agent API
- 启动 Agent 后访问 GUI：`http://localhost:7777`
- 健康检查示例（部分环境）：`curl https://localhost:7777/api/meshes`

说明：Agent 提供本地 HTTP API（端口通常与 GUI 共用）。具体 API 以实际版本为准。

---

## 10. 故障排查要点
- 无法加入 Mesh：检查 Hub `<PUBLIC_IP:8888>` 连通性、防火墙放行、`root.json` 是否匹配。
- 隧道不通：确认 inbound 端口已监听、outbound 目标可达；`ztm tunnel get` 查看状态。
- 代理失败：确认 `--add-target` 范围覆盖目标、监听端口正确、客户端代理参数正确。
- 端点不可见：`ztm get ep` 查看在线状态；必要时重启 Agent。

---

## 参考链接
- ZTM README（Hub/Agent/Join/Apps）：https://github.com/flomesh-io/ztm/blob/main/README.md
- ZT-App（tunnel/proxy/terminal/script/cloud 用法）：https://github.com/flomesh-io/ztm/blob/main/docs/ZT-App.md

