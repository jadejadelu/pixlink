# PixLink Server Knowledge Base

**Module:** Backend API  
**Stack:** Node.js + Express + TypeScript + Prisma + MySQL

## OVERVIEW

Express REST API handling user management, device enrollment, certificate signing, and ZTM integration. Organized in layered architecture with clear separation between HTTP handling, business logic, and data access.

## STRUCTURE

```
src/
├── index.ts              # Express app entry point
├── config/               # Environment configuration
│   ├── index.ts          # Config singleton
│   └── database.ts       # Prisma client export
├── controllers/          # Route handlers
│   ├── authController.ts # Auth flows (15+ methods)
│   ├── certificateController.ts
│   └── deviceController.ts
├── middleware/           # Express middleware
│   ├── auth.ts           # JWT validation
│   └── errorHandler.ts   # Error handling
├── routes/               # Route definitions
│   ├── authRoutes.ts
│   ├── certificateRoutes.ts
│   └── deviceRoutes.ts
├── services/             # Business logic (singletons)
│   ├── userService.ts
│   ├── deviceService.ts
│   ├── certificateService.ts
│   ├── ztmService.ts
│   ├── enrollmentTokenService.ts
│   ├── emailService.ts
│   └── schedulerService.ts
├── types/                # Shared TypeScript types
│   └── index.ts          # User, Device, Certificate, etc.
└── utils/                # Utilities
    └── logger.ts         # Winston logger
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Add API endpoint | `routes/` + `controllers/` | Route defines HTTP, controller handles logic |
| Business logic | `services/` | Export default new XxxService() pattern |
| Database access | Prisma client in `config/database.ts` | Use: `import prisma from '../config/database'` |
| Type definitions | `types/index.ts` | Re-exported barrel file |
| JWT validation | `middleware/auth.ts` | Attaches `req.user` on success |
| Error handling | `middleware/errorHandler.ts` | AppError class + global handler |
| Logging | `utils/logger.ts` | Winston instance, use `logger.info()` |

## CONVENTIONS

### Service Pattern
All services follow singleton pattern:
```typescript
class UserService { /* methods */ }
export default new UserService();
// Usage: import userService from './services/userService'
```

### Route Pattern
```typescript
// routes/authRoutes.ts
router.post('/register', authController.register);
router.get('/profile', authMiddleware, authController.getProfile);
```

### Controller Pattern
```typescript
// controllers/authController.ts
class AuthController {
  async register(req: Request, res: Response) {
    // validation → service call → response
  }
}
export default new AuthController();
```

### Auth Middleware
Attaches decoded JWT to `req.user`:
```typescript
// Usage in controllers
const userId = (req as AuthRequest).user!.userId;
```

### Error Handling
Throw `AppError` for known errors:
```typescript
throw new AppError('User not found', 404);
// Caught by errorHandler middleware
```

## ANTI-PATTERNS

- **NEVER** access database directly from controllers (always use services)
- **NEVER** generate private keys server-side (client-side only)
- **NO** formal test framework — use ad-hoc `test-*.ts` scripts

## ZTM INTEGRATION

**ZTMService** (`services/ztmService.ts`) encapsulates all ZTM communication:
- `createUserPermit()` — Generate enrollment permit
- `getMeshInfo()` — Query mesh status
- `validateAgentConnection()` — Check agent health

Uses environment variables: `ZTM_ROOT_AGENT_URL`, `ZTM_MESH_NAME`

## COMMANDS

```bash
npm run dev              # ts-node-dev --respawn
npm run build            # tsc
npm run start            # node dist/index.js
npm run prisma:generate  # Regenerate Prisma client
npm run prisma:migrate   # Run migrations
npm run prisma:studio    # Open Prisma Studio
npm run cleanup          # Clean test data from DB
npm run lint             # ESLint check
npm run lint:fix         # ESLint auto-fix
npm run format           # Prettier format
```

## CODE QUALITY

- **ESLint**: Configured with TypeScript rules
- **Prettier**: 2-space indent, single quotes, 100 char width
- **Pre-commit**: Run `npm run lint` before committing

## DATABASE

**Prisma Schema:** `../prisma/schema.prisma` (12 models)  
**Key Models:** User, Device, Certificate, Session, Room, Membership, Tunnel

**Typical service query:**
```typescript
const user = await prisma.user.findUnique({
  where: { email },
  include: { devices: true }
});
```
