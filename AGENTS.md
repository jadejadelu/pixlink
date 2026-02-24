# PixLink Project Knowledge Base

**Generated:** 2026-02-24  
**Project:** PixLink - ZTM-based game networking platform  
**Stack:** Vue 3 + Tauri (Rust) frontend, Node.js + Express + Prisma backend

## OVERVIEW

PixLink is a game networking platform built on ZTM (Zero Trust Mesh) enabling LAN game connectivity over the internet. It's a bilingual (Chinese/English), AI-assisted project with clear separation between web frontend and API backend.

## STRUCTURE

```
pixlink/
├── docs/                    # 24 Chinese documentation files
├── pixlink-client/          # Vue 3 + Tauri desktop app
│   ├── src/                 # Frontend source (16 files)
│   └── src-tauri/           # Rust desktop shell
├── pixlink-server/          # Express + Prisma backend
│   ├── src/                 # Backend source (20 files)
│   ├── prisma/              # Database schema + migrations
│   └── scripts/             # Test utilities
└── pixlink-demo-ztm/        # ZTM Docker environment
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| API routes | `pixlink-server/src/routes/` | Express route definitions |
| Business logic | `pixlink-server/src/services/` | Service layer singletons |
| Database models | `pixlink-server/prisma/schema.prisma` | 12 models defined |
| Vue components | `pixlink-client/src/components/` | SFCs with `<script setup>` |
| API client | `pixlink-client/src/services/apiService.ts` | HTTP client wrapper |
| State management | `pixlink-client/src/store/` | Pinia Store with Composition API |
| ZTM integration | `*/services/ztmService.ts` | Both client and server |

## CODE MAP

**Entry Points:**
- `pixlink-server/src/index.ts` — Express server bootstrap
- `pixlink-client/src/main.ts` — Vue app bootstrap
- `pixlink-client/src-tauri/src/main.rs` — Tauri desktop entry

**Key Services (Backend):**
- `userService` — JWT auth, password hashing
- `ztmService` — ZTM root agent integration
- `deviceService` — Device enrollment
- `certificateService` — X.509 certificate signing
- `emailService` — SMTP delivery

**Key Services (Frontend):**
- `apiService` — HTTP client with auth headers
- `userService` — Auth flows, identity upload
- `roomService` — Room/tunnel management
- `ztmService` — Local agent communication

## CONVENTIONS

### TypeScript
- Strict mode enabled (`strict: true`)
- No unused locals/parameters allowed
- CommonJS output (server), ES modules (client)

### Architecture Patterns
- **Backend**: Controller → Service → Prisma → MySQL
- **Frontend**: Component → Service → ApiService → REST API
- **Auth**: JWT tokens (7-day expiry), bcrypt passwords
- **State**: Pinia Store with Vue reactivity, localStorage persistence

### Environment Variables
**Server:** `PORT`, `DATABASE_URL`, `JWT_SECRET`, `SMTP_*`, `ZTM_*`  
**Client:** `VITE_DEV_PORT`, `VITE_API_BASE_URL`, `VITE_ZTM_*`

### Security
- Private keys generated client-side ONLY (never touch server)
- Enrollment tokens: single-use, TTL-limited (default 300s)
- Certificates delivered via TLS, never private keys
- Device-bound certificates with revocation support

## ANTI-PATTERNS

- **NEVER** remove `windows_subsystem` attribute from `main.rs` (prevents console window)
- **NEVER** commit `.env` files or `docker-compose-local.yml` (contains secrets)
- **NEVER** store private keys server-side
- **NO** formal test framework (uses ad-hoc test scripts)

## COMMANDS

```bash
# Development (root)
docker-compose -f docker-compose-local.yml up -d

# Backend
cd pixlink-server
npm run dev          # ts-node-dev with respawn
npm run build        # tsc compile
npm run prisma:migrate
npm run cleanup      # DB cleanup script
npm run lint         # ESLint check
npm run lint:fix     # ESLint auto-fix
npm run format       # Prettier format

# Frontend
cd pixlink-client
npm run dev          # Vite dev server
npm run build        # vue-tsc + vite build
npm run tauri        # Tauri CLI
npm run lint         # ESLint check
npm run format       # Prettier format
```

## DEVELOPMENT TOOLS

### Code Quality
- **ESLint**: TypeScript + Vue 3 rules, detects `any` usage
- **Prettier**: Consistent formatting (2-space indent, single quotes)
- **Scripts**: `npm run lint` / `npm run format` in both client and server

### Environment Variables
**Client .env:**
```
VITE_API_BASE_URL=http://localhost:3000  # API server URL
VITE_DEV_PORT=5173                       # Vite dev server port
VITE_ZTM_LOCAL_AGENT_URL=http://127.0.0.1:7778/
VITE_ZTM_MESH_NAME=ztm-hub:8888
```

## NOTES

- **Debug mode**: Set `DEBUG_MODE=true` to skip email verification (dev only)
- **Nested client**: `pixlink-server/pixlink-client/` appears unused (legacy copy)
- **Test approach**: Ad-hoc TypeScript scripts, not formal unit tests
- **ZTM ports**: Hub 8888, Root Agent 7777, Local Agent 7778
- **Certificate validity**: Default 90 days (`CERT_VALIDITY_DAYS`)
- **Bilingual docs**: `/docs/` contains 24 Chinese development session logs
