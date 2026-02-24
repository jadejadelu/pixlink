# PixLink 数据库 ERD 设计文档

**版本:** 2.0  
**日期:** 2026-02-24  
**状态:** 设计中  
**决策:** 房间号随机生成 | 分享码可选过期 | 游客不存储

---

## 1. 实体关系图（ERD）

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              PixLink Database ERD                           │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│    User      │       │    Room      │       │   Device     │
├──────────────┤       ├──────────────┤       ├──────────────┤
│ PK id        │──┐    │ PK id        │──┐    │ PK id        │
│    email     │  │    │ UK roomNumber│  │    │ FK userId    │──┼──┐
│    nickname  │  │    │    name      │  │    │    deviceNonce│  │  │
│    password  │  │    │ FK ownerId   │──┘    │    os        │  │  │
│    status    │  │    │    password  │       │    arch      │  │  │
│    createdAt │  │    │    maxPlayers│       │    lastSeen  │  │  │
│    updatedAt │  │    │    gameType  │       └──────────────┘  │  │
└──────────────┘  │    │    connectionMode                       │  │
                  │    │    visibility  │                        │  │
                  │    │    status      │                        │  │
                  │    │    createdAt   │                        │  │
                  │    │    updatedAt   │                        │  │
                  │    └──────────────┘                        │  │
                  │           │                                 │  │
                  │           │ 1:N                             │  │
                  │           ▼                                 │  │
                  │    ┌──────────────┐                        │  │
                  │    │  Membership  │                        │  │
                  │    ├──────────────┤                        │  │
                  │    │ PK id        │                        │  │
                  │    │ FK roomId    │────────────────────────┘  │
                  │    │ FK userId    │───────────────────────────┘
                  │    │    role      │
                  │    │    state     │
                  │    │    joinedAt  │
                  │    │    lastSeen  │
                  │    └──────────────┘
                  │
                  │ 1:N
                  ▼
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│  Certificate │       │   Session    │       │    Room      │
├──────────────┤       ├──────────────┤       │   ShareCode  │
│ PK id        │       │ PK id        │       ├──────────────┤
│ FK userId    │──┐    │ FK userId    │──┐    │ PK id        │
│ FK deviceId  │──┼──┐ │    token     │  │    │ FK roomId    │──┐
│    ztmUsername│  │  │    expiresAt │  │    │    code      │  │
│    fingerprint│  │  │    createdAt │  │    │    expiresAt │  │
│    status    │  │  └──────────────┘  │    │    createdAt │  │
│    certificateChain│                  │    └──────────────┘  │
│    isJoinedMesh│                     │                      │
│    createdAt │                       │                      │
│    updatedAt │                       │                      │
└──────────────┘                       │                      │
                                       │                      │
                                       │    ┌──────────────┐  │
                                       │    │    Tunnel    │  │
                                       │    ├──────────────┤  │
                                       │    │ PK id        │  │
                                       │    │ FK roomId    │──┘
                                       │    │    type      │
                                       │    │    port      │
                                       │    │    mode      │
                                       │    │    state     │
                                       │    └──────────────┘
                                       │
                                       │    ┌──────────────┐
                                       │    │   Message    │
                                       │    ├──────────────┤
                                       │    │ PK id        │
                                       │    │ FK roomId    │
                                       │    │ FK userId    │
                                       │    │    content   │
                                       │    │    type      │
                                       │    │    createdAt │
                                       │    └──────────────┘
                                       │
                                       │    ┌──────────────┐
                                       └───▶│  GameShare   │
                                            ├──────────────┤
                                            │ PK id        │
                                            │ FK roomId    │
                                            │ FK userId    │
                                            │    title     │
                                            │    proto     │
                                            │    port      │
                                            └──────────────┘
```

---

## 2. 实体详细定义

### 2.1 User（用户）

**说明:** 系统注册用户表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | String | PK, UUID | 唯一标识符 |
| email | String | UK, Not Null | 邮箱，唯一 |
| nickname | String | Not Null | 昵称 |
| password | String | Nullable | 密码哈希（bcrypt）|
| status | Enum | Default: PENDING | PENDING/ACTIVE/INACTIVE/SUSPENDED |
| createdAt | DateTime | Auto | 创建时间 |
| updatedAt | DateTime | Auto | 更新时间 |

**关系:**
- 1:N Room (as owner)
- 1:N Device
- 1:N Certificate
- 1:N Membership
- 1:N Session
- 1:N Message
- 1:N GameShare

**索引:**
- email: 唯一索引，登录查询

---

### 2.2 Room（房间）

**说明:** 游戏房间，核心实体

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | String | PK, UUID | 内部唯一标识 |
| roomNumber | String | UK, Not Null | **新增：对外房间号（4-6位数字）** |
| name | String | Not Null | 房间名称 |
| ownerId | String | FK → User | 房主 |
| password | String | Nullable | 房间密码（可选）|
| maxPlayers | Int | Default: 8 | 最大人数（4/8/16）|
| gameType | String | Default: 'other' | 游戏类型（minecraft/stardew/...）|
| connectionMode | Enum | Default: QUICK | **新增：QUICK/GUIDED** |
| visibility | Enum | Default: PUBLIC | PUBLIC/PRIVATE |
| status | Enum | Default: ACTIVE | ACTIVE/INACTIVE/DISSOLVED |
| createdAt | DateTime | Auto | 创建时间 |
| updatedAt | DateTime | Auto | 更新时间 |

**关系:**
- N:1 User (owner)
- 1:N Membership
- 1:N Tunnel
- 1:N Message
- 1:N GameShare
- 1:N RoomShareCode

**索引:**
- roomNumber: 唯一索引，加入房间查询
- ownerId: 索引，查询用户创建的房间
- visibility: 索引，查询公开房间列表

---

### 2.3 Membership（房间成员）

**说明:** 用户与房间的多对多关系

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | String | PK, UUID | 唯一标识 |
| roomId | String | FK → Room | 房间 |
| userId | String | FK → User | 用户 |
| role | Enum | Default: MEMBER | OWNER/MEMBER |
| state | Enum | Default: OFFLINE | ONLINE/OFFLINE/GAMING |
| joinedAt | DateTime | Auto | 加入时间 |
| lastSeen | DateTime | Auto | 最后活跃 |

**约束:**
- UK(roomId, userId): 复合唯一，防止重复加入

**索引:**
- roomId: 索引，查询房间成员
- userId: 索引，查询用户加入的房间

---

### 2.4 RoomShareCode（房间分享码）⭐ 新增

**说明:** 分享码记录（可选过期，房间解散即失效）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | String | PK, UUID | 唯一标识 |
| roomId | String | FK → Room, Cascade Delete | 所属房间 |
| code | String | Not Null | 分享码（JWT 或加密字符串）|
| expiresAt | DateTime | Nullable | 过期时间（可选）|
| createdBy | String | FK → User | 创建者 |
| createdAt | DateTime | Auto | 创建时间 |

**关系:**
- N:1 Room（级联删除）
- N:1 User（创建者）

**业务规则:**
- 房间解散时自动删除所有分享码（级联删除）
- 查询时检查 expiresAt，过期即失效
- 每个房间可生成多个分享码（不同有效期）

**索引:**
- code: 唯一索引，查询分享码
- roomId: 索引，查询房间的分享码

---

### 2.5 Device（设备）

**说明:** 用户设备信息

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | String | PK, UUID | 唯一标识 |
| userId | String | FK → User, Cascade | 所属用户 |
| os | String | Not Null | 操作系统 |
| arch | String | Not Null | 架构（x64/arm64）|
| deviceNonce | String | UK, Not Null | 设备唯一标识 |
| lastSeen | DateTime | Auto | 最后活跃 |
| createdAt | DateTime | Auto | 创建时间 |
| updatedAt | DateTime | Auto | 更新时间 |

**索引:**
- deviceNonce: 唯一索引
- userId: 索引

---

### 2.6 Certificate（证书）

**说明:** ZTM 证书信息

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | String | PK, UUID | 唯一标识 |
| userId | String | FK → User | 所属用户 |
| deviceId | String | FK → Device | 所属设备 |
| ztmUsername | String | UK, Not Null | ZTM 用户名 |
| fingerprint | String | UK, Not Null | 证书指纹 |
| status | Enum | Default: ACTIVE | ACTIVE/REVOKED/EXPIRED |
| notBefore | DateTime | Not Null | 生效时间 |
| notAfter | DateTime | Not Null | 过期时间 |
| certificateChain | Text | Not Null | 证书内容 |
| isJoinedMesh | Boolean | Default: false | 是否已加入 Mesh |
| createdAt | DateTime | Auto | 创建时间 |
| updatedAt | DateTime | Auto | 更新时间 |

**索引:**
- ztmUsername: 唯一索引
- fingerprint: 唯一索引
- userId: 索引

---

### 2.7 Tunnel（隧道）

**说明:** 网络隧道配置

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | String | PK, UUID | 唯一标识 |
| roomId | String | FK → Room, Cascade | 所属房间 |
| type | Enum | Not Null | TCP/UDP |
| port | Int | Not Null | 端口号（1-65535）|
| mode | Enum | Default: RELAY | P2P/RELAY |
| state | Enum | Default: CREATED | CREATED/CONNECTING/CONNECTED/DISCONNECTED/FAILED |
| rttMs | Int | Nullable | 延迟（毫秒）|
| createdAt | DateTime | Auto | 创建时间 |
| updatedAt | DateTime | Auto | 更新时间 |

**索引:**
- roomId: 索引

---

### 2.8 Message（消息）

**说明:** 房间聊天消息

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | String | PK, UUID | 唯一标识 |
| roomId | String | FK → Room, Cascade | 所属房间 |
| userId | String | FK → User, Set Null | 发送者（删除用户保留消息）|
| content | String | Not Null | 消息内容 |
| type | Enum | Default: TEXT | TEXT/SYSTEM |
| createdAt | DateTime | Auto | 创建时间 |

**索引:**
- roomId: 索引，查询房间消息
- (roomId, createdAt): 复合索引，分页查询

---

### 2.9 Session（会话）⭐ 游客不存储，仅注册用户

**说明:** 用户登录会话

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | String | PK, UUID | 唯一标识 |
| userId | String | FK → User, Cascade | 所属用户 |
| token | String | UK, Not Null | JWT Token |
| deviceId | String | Nullable | 设备标识 |
| ipAddress | String | Nullable | IP 地址 |
| userAgent | String | Nullable | User Agent |
| expiresAt | DateTime | Not Null | 过期时间 |
| createdAt | DateTime | Auto | 创建时间 |

**索引:**
- token: 唯一索引
- userId: 索引
- expiresAt: 索引，清理过期会话

**注意:** 游客 Token 不存储在此表，仅存在于内存/JWT 中

---

## 3. Prisma Schema 更新

### 3.1 完整 Schema

```prisma
// schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

// ============ 用户相关 ============

model User {
  id        String   @id @default(uuid())
  email     String   @unique
  nickname  String
  password  String?
  status    UserStatus @default(PENDING)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  ownedRooms       Room[]       @relation("RoomOwner")
  devices          Device[]
  certificates     Certificate[]
  memberships      Membership[]
  sessions         Session[]
  messages         Message[]
  gameShares       GameShare[]
  createdShareCodes RoomShareCode[] @relation("ShareCodeCreator")

  @@map("users")
}

enum UserStatus {
  PENDING
  ACTIVE
  INACTIVE
  SUSPENDED
}

// ============ 房间相关 ============

model Room {
  id        String   @id @default(uuid())
  roomNumber String  @unique  // ⭐ 新增：对外房间号
  name      String
  ownerId   String
  password  String?
  maxPlayers Int     @default(8)
  gameType  String   @default("other")
  connectionMode ConnectionMode @default(QUICK)  // ⭐ 新增
  visibility RoomVisibility @default(PUBLIC)
  status    RoomStatus @default(ACTIVE)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  owner        User            @relation("RoomOwner", fields: [ownerId], references: [id], onDelete: Cascade)
  memberships  Membership[]
  tunnels      Tunnel[]
  messages     Message[]
  gameShares   GameShare[]
  shareCodes   RoomShareCode[] // ⭐ 新增

  @@index([ownerId])
  @@index([visibility])
  @@index([status])
  @@map("rooms")
}

// ⭐ 新增枚举
enum ConnectionMode {
  QUICK
  GUIDED
}

enum RoomVisibility {
  PUBLIC
  PRIVATE
}

enum RoomStatus {
  ACTIVE
  INACTIVE
  DISSOLVED
}

// ⭐ 新增：分享码表
model RoomShareCode {
  id        String   @id @default(uuid())
  roomId    String
  code      String   @unique
  expiresAt DateTime?  // 可选过期时间
  createdBy String
  createdAt DateTime @default(now())

  // Relations
  room      Room     @relation(fields: [roomId], references: [id], onDelete: Cascade)
  creator   User     @relation("ShareCodeCreator", fields: [createdBy], references: [id])

  @@index([roomId])
  @@map("room_share_codes")
}

model Membership {
  id        String   @id @default(uuid())
  roomId    String
  userId    String
  role      MembershipRole @default(MEMBER)
  state     MembershipState @default(OFFLINE)
  joinedAt  DateTime @default(now())
  lastSeen  DateTime @default(now())

  // Relations
  room      Room     @relation(fields: [roomId], references: [id], onDelete: Cascade)
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([roomId, userId])
  @@index([roomId])
  @@index([userId])
  @@map("memberships")
}

enum MembershipRole {
  OWNER
  MEMBER
}

enum MembershipState {
  ONLINE
  OFFLINE
  GAMING
}

// ============ 设备与证书 ============

model Device {
  id        String   @id @default(uuid())
  userId    String
  os        String
  arch      String
  deviceNonce String @unique
  lastSeen  DateTime @default(now())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  user         User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  certificates Certificate[]

  @@index([userId])
  @@map("devices")
}

model Certificate {
  id        String   @id @default(uuid())
  userId    String
  deviceId  String?
  ztmUsername String @unique
  fingerprint String @unique
  status    CertificateStatus @default(ACTIVE)
  notBefore DateTime
  notAfter  DateTime
  certificateChain String @db.Text
  isJoinedMesh Boolean @default(false)
  rememberDevice Boolean @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  user       User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  device     Device? @relation(fields: [deviceId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([deviceId])
  @@index([ztmUsername])
  @@map("certificates")
}

enum CertificateStatus {
  ACTIVE
  REVOKED
  EXPIRED
}

// ============ 网络与消息 ============

model Tunnel {
  id        String   @id @default(uuid())
  roomId    String
  type      TunnelType
  port      Int
  mode      TunnelMode @default(RELAY)
  state     TunnelState @default(CREATED)
  rttMs     Int?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  room      Room     @relation(fields: [roomId], references: [id], onDelete: Cascade)

  @@index([roomId])
  @@map("tunnels")
}

enum TunnelType {
  TCP
  UDP
}

enum TunnelMode {
  P2P
  RELAY
}

enum TunnelState {
  CREATED
  CONNECTING
  CONNECTED
  DISCONNECTED
  FAILED
}

model Message {
  id        String   @id @default(uuid())
  roomId    String
  userId    String?
  content   String
  type      MessageType @default(TEXT)
  createdAt DateTime @default(now())

  // Relations
  room      Room     @relation(fields: [roomId], references: [id], onDelete: Cascade)
  user      User?    @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([roomId])
  @@index([userId])
  @@index([createdAt])
  @@map("messages")
}

enum MessageType {
  TEXT
  SYSTEM
}

model GameShare {
  id        String   @id @default(uuid())
  roomId    String
  userId    String
  title     String
  proto     String
  hostHint  String?
  port      Int
  templateKey String?
  createdAt DateTime @default(now())

  // Relations
  room      Room     @relation(fields: [roomId], references: [id], onDelete: Cascade)
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([roomId])
  @@index([userId])
  @@map("game_shares")
}

// ============ 认证相关 ============

model Session {
  id        String   @id @default(uuid())
  userId    String
  token     String   @unique @db.VarChar(500)
  deviceId  String?
  ipAddress String?
  userAgent String?
  expiresAt DateTime
  createdAt DateTime @default(now())

  // Relations
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([token])
  @@index([expiresAt])
  @@map("sessions")
}
```

### 3.2 Migration 脚本

```sql
-- 20260224000000_add_room_system/migration.sql

-- 1. 添加房间号字段
ALTER TABLE `Room` ADD COLUMN `roomNumber` VARCHAR(20) UNIQUE AFTER `id`;

-- 2. 添加连接模式字段
ALTER TABLE `Room` ADD COLUMN `connectionMode` ENUM('QUICK', 'GUIDED') DEFAULT 'QUICK' AFTER `gameType`;

-- 3. 创建 RoomShareCode 表
CREATE TABLE `RoomShareCode` (
    `id` VARCHAR(36) NOT NULL PRIMARY KEY,
    `roomId` VARCHAR(36) NOT NULL,
    `code` VARCHAR(500) NOT NULL UNIQUE,
    `expiresAt` DATETIME NULL,
    `createdBy` VARCHAR(36) NOT NULL,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    INDEX `RoomShareCode_roomId_idx` (`roomId`),
    
    FOREIGN KEY (`roomId`) REFERENCES `Room`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`createdBy`) REFERENCES `User`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. 为现有房间生成房间号
UPDATE `Room` r 
SET r.`roomNumber` = (
    SELECT CAST(FLOOR(1000 + RAND() * 899999) AS CHAR)
    FROM (SELECT 1) t
    WHERE NOT EXISTS (
        SELECT 1 FROM `Room` r2 WHERE r2.`roomNumber` = CAST(FLOOR(1000 + RAND() * 899999) AS CHAR)
    )
)
WHERE r.`roomNumber` IS NULL;

-- 5. 添加索引
CREATE INDEX `Room_ownerId_idx` ON `Room`(`ownerId`);
CREATE INDEX `Room_visibility_idx` ON `Room`(`visibility`);
CREATE INDEX `Room_status_idx` ON `Room`(`status`);
```

---

## 4. 数据流说明

### 4.1 房间创建流程

```
User Request
    │
    ▼
┌─────────────────┐
│ 1. 生成房间号    │──┐
│    (随机4-6位)   │  │
└─────────────────┘  │
    │                │
    ▼                │
┌─────────────────┐  │
│ 2. 检查唯一性    │  │
│    (数据库查询)   │  │
└─────────────────┘  │
    │                │
    ▼                │
冲突? ──Yes──┐       │
    │         │       │
    No        ▼       │
    │    重新生成 ────┘
    ▼
┌─────────────────┐
│ 3. 创建房间记录  │
│    (INSERT)     │
└─────────────────┘
    │
    ▼
┌─────────────────┐
│ 4. 创建Membership│
│    (房主身份)    │
└─────────────────┘
    │
    ▼
返回房间信息（含房间号）
```

### 4.2 分享码生成流程

```
房主请求生成分享码
    │
    ▼
┌─────────────────┐
│ 1. 验证权限      │
│    (是否为房主)   │
└─────────────────┘
    │
    ▼
┌─────────────────┐
│ 2. 构建 Payload  │
│    {            │
│      rn: 9527,  │
│      pw: ***,   │
│      exp: ***   │
│    }            │
└─────────────────┘
    │
    ▼
┌─────────────────┐
│ 3. JWT 签名      │
│    (HS256)      │
└─────────────────┘
    │
    ▼
┌─────────────────┐
│ 4. 存储到数据库  │
│    RoomShareCode│
└─────────────────┘
    │
    ▼
返回分享码给房主
```

### 4.3 游客加入流程（不存储数据）

```
游客输入房间号+昵称
    │
    ▼
┌─────────────────┐
│ 1. 验证房间号    │
│    (数据库查询)   │
└─────────────────┘
    │
    ▼
存在? ──No──→ 返回 404
    │
    Yes
    ▼
┌─────────────────┐
│ 2. 验证密码      │
│    (如需要)      │
└─────────────────┘
    │
    ▼
正确? ──No──→ 返回 403
    │
    Yes
    ▼
┌─────────────────┐
│ 3. 生成临时 Token│
│    JWT (isGuest) │
│    24h 过期      │
└─────────────────┘
    │
    ▼
┌─────────────────┐
│ 4. 创建 Membership│
│    userId = guestId│
└─────────────────┘
    │
    ▼
返回 Token + 房间信息

注意：不存储到 User 表！
游客信息只在 JWT 中
```

---

## 5. 约束与规则

### 5.1 房间号规则

- **格式**: 4-6 位数字（1000 - 999999）
- **生成**: 随机生成，不保证易记
- **唯一性**: 数据库 UK 约束
- **不可修改**: 创建后不可更改
- **回收**: 房间解散后房间号可重新分配

### 5.2 分享码规则

- **格式**: JWT（HS256 签名）
- **过期**: 创建时可选（1h/24h/7d/永久）
- **失效**: 房间解散自动失效（级联删除）
- **撤销**: 房主可随时删除分享码记录
- **数量**: 每个房间可生成多个分享码

### 5.3 游客规则

- **Token**: JWT，24h 过期，不存储
- **权限**: 仅可加入房间，不可创建
- **数据**: 不存储到数据库
- **重连**: Token 有效期内可重连
- **升级**: 随时可注册转为正式用户

---

## 6. 性能考虑

### 6.1 索引策略

**高频查询:**
- Room.roomNumber: 加入房间（每次都有）
- Room.visibility: 公开房间列表（首页）
- Membership.roomId: 查询房间成员（房间内）

**中频查询:**
- Room.ownerId: 用户创建的房间列表
- Message.roomId + createdAt: 聊天记录分页

### 6.2 分页策略

**房间列表:**
```sql
-- 公开房间，按创建时间倒序
SELECT * FROM Room 
WHERE visibility = 'PUBLIC' AND status = 'ACTIVE'
ORDER BY createdAt DESC
LIMIT 20 OFFSET :offset
```

**聊天记录:**
```sql
-- 按时间倒序，支持游标分页
SELECT * FROM Message 
WHERE roomId = :roomId 
ORDER BY createdAt DESC
LIMIT 50
```

### 6.3 数据清理

**过期分享码:**
```sql
-- 每天清理过期分享码
DELETE FROM RoomShareCode 
WHERE expiresAt IS NOT NULL AND expiresAt < NOW()
```

**已解散房间数据:**
- 级联删除自动处理
- 消息保留？（可选归档策略）

---

## 7. 文档结束

**下一步:** 基于本 ERD，继续创建：
- API 接口文档（OpenAPI 规范）
- WebSocket 协议文档
- 错误码手册

**建议:** 先执行 Migration，再开发后端 API，最后前端组件。