# PixLink Client Knowledge Base

**Module:** Frontend Desktop App  
**Stack:** Vue 3 + TypeScript + Vite + Tauri (Rust)

## OVERVIEW

Cross-platform desktop application using Vue 3 for UI and Tauri for native desktop shell. Communicates with PixLink server REST API and local ZTM agent for mesh networking.

## STRUCTURE

```
src/
├── main.ts               # Vue app bootstrap
├── App.vue               # Root component
├── components/           # Vue SFCs
│   ├── Login.vue
│   ├── Register.vue
│   ├── Activate.vue
│   └── ImportPermit.vue
├── services/             # API clients
│   ├── apiService.ts     # HTTP client wrapper
│   ├── userService.ts    # Auth flows
│   ├── roomService.ts    # Room/tunnel management
│   └── ztmService.ts     # Local ZTM agent
├── store/                # State management
│   └── index.ts          # Pinia Store (Composition API)
├── types/                # TypeScript types
│   └── index.ts          # API types, UI types
└── utils/                # Utilities
    └── index.ts          # UUID, date, storage helpers

src-tauri/
├── src/
│   ├── main.rs           # Tauri entry point
│   └── lib.rs            # Tauri commands
└── Cargo.toml            # Rust dependencies
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Add UI component | `components/` | Use `<script setup>` SFCs |
| Add API method | `services/apiService.ts` | Extends ApiService class |
| Auth flows | `services/userService.ts` | completeRegistrationFlow(), etc. |
| Global state | `store/index.ts` | Pinia Store with Composition API |
| Type definitions | `types/index.ts` | Mirror server types |
| Native commands | `src-tauri/src/lib.rs` | Tauri invoke handlers |
| HTTP via Tauri | `src-tauri/src/lib.rs` | http_request command for native |

## CONVENTIONS

### Vue 3 Pattern
```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { userService } from '../services/userService';

const email = ref('');

async function handleLogin() {
  const result = await userService.login(email.value, password.value);
}
</script>
```

### Service Pattern
```typescript
// services/userService.ts
class UserService {
  async completeRegistrationFlow(email: string, password: string) {
    // Multi-step flow: register → activate → upload → get permit
  }
}
export const userService = new UserService();
```

### Store Pattern (Pinia)
```typescript
// store/index.ts - Pinia with Composition API
import { useStore } from './store';

const store = useStore();

// Access state (reactive)
console.log(store.user);
store.user = newUser;  // Triggers UI updates

// Or use actions
store.setUser(newUser);
```

### API Service Pattern
```typescript
// services/apiService.ts automatically adds auth header
const response = await fetch(url, {
  headers: {
    ...this.getAuthHeaders(),
    'Content-Type': 'application/json'
  }
});
```

### Tauri Commands
```typescript
// Invoke native Rust commands
import { invoke } from '@tauri-apps/api/core';
const result = await invoke('http_request', { url, method, body });
```

## ANTI-PATTERNS

- **NEVER** store passwords in state (only tokens)
- **NEVER** use native fetch for API calls (use apiService)
- **NEVER** modify store directly from components (use service methods)
- **ALWAYS** use `VITE_API_BASE_URL` env variable for API URL

## ZTM INTEGRATION

**ZtmService** (`services/ztmService.ts`) manages local agent:
- `importPermit()` — Import ZTM permit into local agent
- `joinMesh()` — Connect to ZTM mesh
- `leaveMesh()` — Disconnect from mesh

Local agent URL: `http://127.0.0.1:7778` (from `VITE_ZTM_LOCAL_AGENT_URL`)

## COMMANDS

```bash
npm run dev          # Vite dev server (port from env)
npm run build        # vue-tsc && vite build
npm run preview      # Preview production build
npm run tauri dev    # Tauri dev mode
npm run tauri build  # Build desktop app
npm run lint         # ESLint check
npm run format       # Prettier format
```

## ENVIRONMENT

Required in `.env`:
```
VITE_DEV_PORT=5173
VITE_API_BASE_URL=http://localhost:3000
VITE_ZTM_LOCAL_AGENT_URL=http://127.0.0.1:7778/
VITE_ZTM_MESH_NAME=ztm-hub:8888
```

## CODE QUALITY

- **ESLint**: Configured with TypeScript + Vue 3 rules
- **Prettier**: 2-space indent, single quotes, 100 char width
- **Pre-commit**: Run `npm run lint` before committing

## NOTES

- **State persistence:** Token stored in localStorage, other state in Pinia
- **Auth flow:** Registration → Email activation → Device identity upload → Permit generation → Mesh join
- **HTTP strategy:** Uses native Tauri HTTP for production, fetch for dev
- **Window size:** 800x600 (defined in `src-tauri/tauri.conf.json`)
