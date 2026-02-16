# PixLink 产品调研与架构设计

**版本**: v1.0  
**日期**: 2026-02-14  
**技术基座**: 基于 ZTM (Zero Trust Mesh) 开源网络基础设施

---

## 1. 项目综述

- 使命: 让异地好友像在同一局域网一样顺滑开黑，兼顾简单、安全、低延迟  
- 产品形态: 跨平台桌面客户端 + 轻量服务端 + ZTM Hub/Agent Mesh  
- 北极星指标:
  - 30 秒内联机成功率 ≥ 95%
  - 同城 P2P 中位延迟 ≤ 20ms，跨省 ≤ 60ms（条件允许时）
  - 单房间稳定在线成员数（MVP）≥ 16，目标 ≥ 64
  - 客诉率（网络连通与认证）≤ 0.5%

---

## 2. 产品调研

### 2.1 目标用户与场景
- 沙盒/独立游戏玩家（Minecraft、Terraria、Valheim 等）跨局域网联机
- 经典局域网游戏爱好者（CS、魔兽、星际等）怀旧对战
- 小型社区、公会、好友群固定房间开黑

### 2.2 核心痛点
- 配置门槛高：网络知识要求重（Tailscale/ZeroTier）
- 免费版限制多：人数/带宽/节点限制
- 平台覆盖不全：部分仅 Windows 或缺少移动端
- 网络层工具缺社交：缺房间、聊天、游戏友好能力
- 开源方案可用性差：命令行为主、缺 GUI/引导

### 2.3 机会与差异化
- 开源底座成熟，缺“玩家友好”包装
- P2P 与 UDP 隧道对游戏显著收益
- 房间与聊天流整合可提升社交体验

### 2.4 价值主张与 MVP
- 价值主张：免费、无人数限制的开源联机平台；三步联机（创建→分享→加入）；游戏感知（自动端口识别、直连优先、延迟可视化）
- MVP 范围：
  - 房间：创建/加入/解散/成员列表与延迟
  - 隧道：自动端口映射、UDP/TCP 支持、P2P 优先
  - 用户：注册/登录/证书签发与导入、昵称与头像
  - 社交：房间文字聊天、系统通知
  - 游戏共享：共享本地服务器、一键复制地址、常见模板

---

## 3. 架构设计（逻辑）

### 3.1 总体拓扑
- 客户端：pix-gui（Tauri 2 + Vue 3 + Vite）+ ztm-agent（本机隧道/直连）
- 服务端：pix-server（用户/房间/证书/状态）+ MySQL
- 网络层：ztm-hub（中转/控制面）+ P2P 直连（可用时优先）

### 3.2 组件与职责
- pix-gui
  - UI/UX：登录、房间、聊天、延迟与连接状态
  - 与 pix-server 的 API 交互
  - 将用户操作转译为 ZTM API（通过本机 ztm-agent）
- ztm-agent（客户端）
  - 接入 ztm-hub，建立/维护隧道，打洞与 P2P 协商
- pix-server
  - 用户全生命周期：注册、登录、登出、注销
  - ZTM 身份与证书：生成、签发、撤销、续期
  - 房间/成员状态：创建、加入、拓扑与延迟心跳
  - 审计与可观测：日志、指标、事件
- ztm-hub
  - 数据平面中转与控制平面协商；P2P 可用则旁路

### 3.3 数据模型（核心实体）
- User：id、nickname、avatar、email/phone、status、createdAt
- Device：id、userId、os、arch、agentVersion、lastSeen
- Certificate：id、userId、status（active/revoked/expired）、notBefore/notAfter、fingerprint
- Room：id、ownerId、name、visibility（public/private）、createdAt、status
- Membership：id、roomId、userId、role（owner/member）、joinedAt、state（online/offline）
- Tunnel：id、roomId、type（udp/tcp）、port、mode（p2p/relay）、state、rttMs
- GameShare：id、roomId、title、proto、hostHint、port、templateKey
- Message：id、roomId、userId、content、type（text/system）、createdAt

### 3.4 关键流程
- 注册/登录与证书签发（安全版）
  - 客户端本地生成密钥对（优先使用系统密钥库：Windows CNG/DPAPI、macOS Keychain、Linux libsecret/硬件密钥），私钥不出设备
  - 身份验证（两种入口，二选一）
    - 魔法链接：输入邮箱/手机 → 服务端发送登录链接 → 用户点击链接在网页确认当前设备绑定（展示设备验证码/昵称核对）→ 服务端为该设备签发一次性「Enrollment Token」（TTL 5 分钟，单次使用，绑定 deviceNonce）
    - 一次性验证码：输入邮箱/手机 → 服务端下发 6 位验证码 → 客户端提交验证码换取 Enrollment Token（绑定 deviceNonce）
  - 证书申请与下发
    - 客户端使用本地私钥生成 CSR（包含 userId、deviceId、可选 SAN：ztm 用户名/用途）
    - 客户端通过 TLS 提交 CSR + Enrollment Token → 服务端校验并签发用户-设备绑定的 mTLS 证书，仅返回证书链（不含私钥）
    - 客户端将证书链导入本地密钥库并配置 ztm-agent → 加入 Mesh
  - 续期与轮换
    - 客户端在到期前 T-7 天使用现有证书自动续期（短期证书，建议 30~90 天），失败则回退到重新绑定流程
  - 丢失与撤销
    - 用户在个人中心可查看设备列表，支持设备证书撤销；遗失设备需通过魔法链接重新绑定并签发新证书
- 房间创建/加入
  - Owner 创建房间 → 服务端生成 roomId
  - 分享加入链接/邀请码 → 成员加入 → 服务端返回房间配置信息
- 隧道与 P2P 协商
  - 客户端上报本地待共享端口/游戏模板
  - ztm-agent 与 hub 建立会话 → STUN/ICE 风格打洞 → P2P 成功则直连，否则走中转
  - 心跳与 RTT/丢包统计上报
- 恢复/重连
  - 客户端冷启动：读取缓存 → 拉取服务端房间与隧道期望状态 → 校验/修复

### 3.5 安全设计
- 端到端 mTLS，证书与用户一一绑定，最小权限原则
- 证书吊销与轮换、失效检测、设备指纹绑定
- 服务端不落用户私钥；严禁日志记录密钥/证书明文；禁止通过邮件/短信分发证书或私钥
- 证书链仅通过受信 TLS 通道下发，结合一次性 Enrollment Token 与 deviceNonce 绑定；可选启用基于 PAKE 的会话密钥对证书链二次加密
- 房间访问控制：邀请码有效期/次数、私有房间白名单

### 3.6 可观测性
- 指标：隧道建立成功率、P2P 占比、RTT/丢包分布、断线重连次数
- 日志：认证、房间事件、隧道状态变更（分级采样）
- 追踪：关键链路（登录→证书→加入房间→建隧道）

### 3.7 性能与容量目标
- 控制面 API P99 < 200ms（国内）
- 单 Hub 并发会话 ≥ 10k（可水平扩展）
- 隧道建立 TTFB（可用网络）< 3s

### 3.8 风险与对策
- P2P 受限：严格 NAT/对称 NAT → 自动降级中转，提示网络建议
- 平台权限差异：Windows/macOS/Linux 驱动/ACL → 最小化权限与可回退机制
- 证书管理复杂：遗失/泄露/撤销 → 设备绑定、一次性导入、便捷撤销与再签
- 法规与合规：传输与隐私 → 明确数据最小化与可自建部署

---

## 4. 接口设计（概要）

### 4.1 鉴权
- POST /auth/register：注册（邮箱/手机 + 验证码）
- POST /auth/login：登录（返回会话 token）
- POST /auth/magic-link：请求发送魔法链接（email/sms）
- POST /auth/otp：请求发送一次性验证码
- POST /auth/enroll/token：使用魔法链接确认/验证码换取 Enrollment Token（绑定 deviceNonce，单次使用）
- POST /auth/logout：退出登录

### 4.2 证书
- POST /certs/issue：提交 CSR + Enrollment Token → 返回用户证书链（不含私钥）
- POST /certs/revoke：撤销设备证书
- GET /certs/status：证书状态查询
- GET /devices：查询已绑定设备
- POST /devices/{id}/revoke：撤销指定设备证书

### 4.3 房间
- POST /rooms：创建房间
- GET /rooms/{id}：房间详情（成员、延迟、隧道状态摘要）
- POST /rooms/{id}/join：加入房间（邀请码/链接）
- POST /rooms/{id}/leave：离开房间
- DELETE /rooms/{id}：解散房间（房主）

### 4.4 隧道与状态
- POST /rooms/{id}/tunnels：上报待建立的端口/协议
- POST /rooms/{id}/tunnels/{tid}/probe：上报 RTT/丢包/模式（p2p/relay）
- GET /rooms/{id}/health：房间健康与诊断建议

### 4.5 聊天
- GET /rooms/{id}/messages：历史消息
- POST /rooms/{id}/messages：发送消息（text/system）

### 4.6 游戏共享
- GET /games/templates：常见游戏模板
- POST /rooms/{id}/shares：发布共享
- GET /rooms/{id}/shares：共享列表

---

## 5. 客户端设计（要点）

### 5.1 技术建议
- Tauri 2 + Vue 3 + Vite（跨平台，低内存占用）

### 5.2 本地状态与缓存
- 登录态与设备标识加密存储（系统安全容器或安全存储）
- 非敏感房间缓存（成员/上次会话）用于冷启动恢复

### 5.3 网络引导
- 初次启动：ztm-agent 与证书导入向导（支持魔法链接、一次性验证码或扫描网页 QR 完成设备绑定）
- 网络诊断：一键检测（NAT 类型、端口可用性、P2P 可能性）

### 5.4 可视化
- 成员 RTT 与连接模式（直连/中转）
- 隧道状态、端口映射、失败原因与建议

### 5.5 异常恢复
- 断线重试、指数退避、模式切换记录与提示

---

## 6. 部署与运维

### 6.1 模式
- 云托管：官方 Hub + pix-server（多活/扩容）
- 私有化：自建 ztm-hub + pix-server + MySQL

### 6.2 配置与密钥
- CA 私钥离线保管，发布中间证书给签发系统
- pix-server 使用短期签发 token 调用签发组件

### 6.3 扩展性
- Hub 横向扩展、会话分片
- 服务端读写分离/缓存（热点房间/用户状态）

### 6.4 备份与升级
- 数据库定期备份与演练
- 灰度发布与回滚

---

## 7. 里程碑
- M1：MVP（注册/登录/证书签发、房间、聊天、端口映射、P2P/中转自动切换）
- M2：游戏模板库、延迟与诊断面板、房间分享链接/邀请码、异常恢复
- M3：多平台优化、语音（可选）、移动端 Roadmap、运营面板与可观测性完善

---

## 8. 验收标准（MVP）
- 基本连通：两端 NAT 场景下 90%+ 成功建链（P2P 或中转）
- 性能：同城 P2P RTT 中位 ≤ 20ms；跨省 ≤ 60ms（网络条件允许）
- 可靠性：断线自动重连成功率 ≥ 98%
- 易用性：新用户首次联机不超过 3 步、≤ 2 分钟
- 安全性：证书管理可撤销可轮换，不落地私钥，不记录敏感日志
